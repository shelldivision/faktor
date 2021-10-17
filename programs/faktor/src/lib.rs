use {
    anchor_lang::{
        prelude::*,
        solana_program::{program::invoke, system_instruction, system_program},
        AnchorSerialize,
    },
    std::{clone::Clone, cmp::min},
};

declare_id!("9LjA6DjxKDB2uEQPH1kipq5L7Z2hRKGz2yd9EQD9fGhU");


///////////////
/// Program ///
///////////////

#[program]
pub mod faktor {
    use anchor_lang::AccountsClose;

    use super::*;
    pub fn create_outflow(
        ctx: Context<CreateOutflow>, 
        name: String,
        memo: String,
        balance: u64,
        delta_balance: u64,
        delta_time: u64,
        bump: u8,
    ) -> ProgramResult {
        // Get accounts
        let outflow = &mut ctx.accounts.outflow;
        let creditor = &ctx.accounts.creditor;
        let debtor = &mut ctx.accounts.debtor;
        let system_program = &mut ctx.accounts.system_program;
        let clock = &ctx.accounts.clock;

        // Initialize outflow
        outflow.name = name;
        outflow.memo = memo;
        outflow.debtor = debtor.key();
        outflow.creditor = creditor.key();
        outflow.delta_balance = delta_balance;
        outflow.delta_time = delta_time;
        outflow.next_transfer_at = clock.unix_timestamp as u64;
        outflow.bump = bump;

        // Transfer balance from debtor to outflow
        invoke(
            &system_instruction::transfer(&debtor.key(), &outflow.key(), balance),
            &[
                debtor.to_account_info().clone(),
                outflow.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(());
    }

    pub fn distribute_outflow(ctx: Context<DistributeOutflow>) -> ProgramResult {
        // Get accounts
        let outflow = &mut ctx.accounts.outflow;
        let creditor = &ctx.accounts.creditor;
        let distributor = &ctx.accounts.distributor;
        let clock = &ctx.accounts.clock;

        // Validate current timestamp
        let now = clock.unix_timestamp as u64;
        require!(
            outflow.next_transfer_at <= now,
            ErrorCode::TooEarly
        );

        // Validate outflow lamport balance
        let bounty = 50;
        require!(
            outflow.to_account_info().lamports() >= outflow.delta_balance + bounty,
            ErrorCode::NotEnoughSOL
        );
        
        // Transfer balance from outflow to creditor
        **outflow.to_account_info().try_borrow_mut_lamports()? -= outflow.delta_balance;
        **creditor.to_account_info().try_borrow_mut_lamports()? += outflow.delta_balance;

        // Transfer bounty (50 lamports) from outflow to distributor
        **outflow.to_account_info().try_borrow_mut_lamports()? -= bounty;
        **distributor.to_account_info().try_borrow_mut_lamports()? += bounty;

        return Ok(());
    }

    pub fn issue(ctx: Context<Issue>, bump: u8, balance: u64, memo: String) -> ProgramResult {
        // Parse accounts from context
        let invoice = &mut ctx.accounts.invoice;
        let creditor = &ctx.accounts.creditor;
        let debtor = &ctx.accounts.debtor;
        let clock = &ctx.accounts.clock;
        
        // Intialize invoice account
        invoice.creditor = creditor.key();
        invoice.debtor = debtor.key();
        invoice.balance = balance;
        invoice.memo = memo; // TODO: Max limit on memo length?
        invoice.issued_at = clock.unix_timestamp;
        invoice.bump = bump;
        return Ok(());
    }

    pub fn pay(ctx: Context<Pay>, amount: u64) -> ProgramResult {
        // Parse accounts from context
        let invoice = &mut ctx.accounts.invoice;
        let debtor = &mut ctx.accounts.debtor;
        let creditor = &mut ctx.accounts.creditor;
        let system_program = &ctx.accounts.system_program;

        // Transfer SOL from the debtor to the creditor account
        let amount = min(amount, invoice.balance);
        require!(
            debtor.to_account_info().lamports() > amount, 
            ErrorCode::NotEnoughSOL
        );
        invoke(
            &system_instruction::transfer(&debtor.key(), &creditor.key(), amount),
            &[
                debtor.to_account_info().clone(),
                creditor.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        // Update invoice balance
        invoice.balance = invoice.balance - amount;

        // If invoice is fully paid, close the invoice account
        if invoice.balance <= 0 {
            invoice.close(creditor.to_account_info())?;
        }
        return Ok(());
    }
}


////////////////////
/// Instructions ///
////////////////////

#[derive(Accounts)]
#[instruction(
    name: String, 
    memo: String, 
    balance: u64,
    delta_balance: u64, 
    delta_time: u64,
    bump: u8,
)]
pub struct CreateOutflow<'info> {
    #[account(
        init,
        seeds = [b"outflow", creditor.key().as_ref(), debtor.key().as_ref()],
        bump = bump,
        payer = debtor,
        space = 8 + (4 + name.len()) + (4 + memo.len()) + 32 + 32 + 8 + 8 + 8 + 1,
    )]
    pub outflow: Account<'info, Outflow>,
    pub creditor: AccountInfo<'info>,
    #[account(mut)]
    pub debtor: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct DistributeOutflow<'info> {
    #[account(
        mut,
        seeds = [b"outflow", creditor.key().as_ref(), debtor.key().as_ref()],
        bump = outflow.bump,
    )]
    pub outflow: Account<'info, Outflow>,
    #[account(mut)]
    pub creditor: AccountInfo<'info>,
    pub debtor: AccountInfo<'info>,
    #[account(mut)]
    pub distributor: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
#[instruction(bump: u8, amount: u64, memo: String)]
pub struct Issue<'info> {
    #[account(
        init,  
        seeds = [creditor.key().as_ref(), debtor.key().as_ref()],
        bump = bump,
        payer = creditor,
        space = 8 + 32 + 32 + 8 + 4 + memo.len() + 8 + 1,
    )]
    pub invoice: Account<'info, Invoice>,
    #[account(mut)]
    pub creditor: Signer<'info>,
    pub debtor: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct Pay<'info> {
    #[account(
        mut, 
        seeds = [creditor.key().as_ref(), debtor.key().as_ref()],
        bump = invoice.bump,
        has_one = creditor,
        has_one = debtor,
    )]
    pub invoice: Account<'info, Invoice>,
    #[account(mut)]
    pub creditor: AccountInfo<'info>,
    #[account(mut)]
    pub debtor: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}


////////////////
/// Accounts ///
////////////////

#[account]
pub struct Invoice {
    pub creditor: Pubkey,
    pub debtor: Pubkey,
    pub balance: u64,
    pub memo: String,
    pub issued_at: i64,
    pub bump: u8,
}

#[account]
pub struct Outflow {
    pub name: String,
    pub memo: String,
    pub creditor: Pubkey,
    pub debtor: Pubkey,
    pub delta_balance: u64,
    pub delta_time: u64,
    pub next_transfer_at: u64,
    pub bump: u8,
}

//////////////
/// Errors ///
//////////////

#[error]
pub enum ErrorCode {
    #[msg("Not enough SOL")]
    NotEnoughSOL,
    #[msg("It's too early to process this outflow")]
    TooEarly,
}
