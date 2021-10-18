use {
    anchor_lang::{
        prelude::*,
        solana_program::{program::invoke, system_instruction, system_program},
        AnchorSerialize,
    },
    std::clone::Clone,
};

declare_id!("9LjA6DjxKDB2uEQPH1kipq5L7Z2hRKGz2yd9EQD9fGhU");


///////////////
/// Program ///
///////////////

#[program]
pub mod faktor {
    use super::*;
    pub fn create_cashflow(
        ctx: Context<CreateCashflow>, 
        name: String,
        memo: String,
        balance: u64,
        delta_balance: u64,
        delta_time: u64,
        bump: u8,
    ) -> ProgramResult {
        // Get accounts
        let cashflow = &mut ctx.accounts.cashflow;
        let creditor = &ctx.accounts.creditor;
        let debitor = &mut ctx.accounts.debitor;
        let system_program = &mut ctx.accounts.system_program;
        let clock = &ctx.accounts.clock;

        // Initialize cashflow
        cashflow.name = name;
        cashflow.memo = memo;
        cashflow.debitor = debitor.key();
        cashflow.creditor = creditor.key();
        cashflow.delta_balance = delta_balance;
        cashflow.delta_time = delta_time;
        cashflow.next_transfer_at = clock.unix_timestamp as u64;
        cashflow.bump = bump;

        // Transfer balance from debitor to cashflow
        invoke(
            &system_instruction::transfer(&debitor.key(), &cashflow.key(), balance),
            &[
                debitor.to_account_info().clone(),
                cashflow.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(());
    }

    pub fn distribute_cashflow(ctx: Context<DistributeCashflow>) -> ProgramResult {
        // Get accounts
        let cashflow = &mut ctx.accounts.cashflow;
        let creditor = &ctx.accounts.creditor;
        let distributor = &ctx.accounts.distributor;
        let clock = &ctx.accounts.clock;

        // Validate current timestamp
        let now = clock.unix_timestamp as u64;
        require!(
            cashflow.next_transfer_at <= now,
            ErrorCode::TooEarly
        );

        // Validate cashflow lamport balance
        let bounty = 50; // TODO bounty should be a function of gas
        require!(
            cashflow.to_account_info().lamports() >= cashflow.delta_balance + bounty,
            ErrorCode::NotEnoughSOL
        );
        
        // Transfer balance from cashflow to creditor
        **cashflow.to_account_info().try_borrow_mut_lamports()? -= cashflow.delta_balance;
        **creditor.to_account_info().try_borrow_mut_lamports()? += cashflow.delta_balance;

        // Transfer bounty from cashflow to distributor
        **cashflow.to_account_info().try_borrow_mut_lamports()? -= bounty;
        **distributor.to_account_info().try_borrow_mut_lamports()? += bounty;

        return Ok(());
    }

    pub fn tokenize_cashflow(ctx: Context<TokenizeCashflow>) -> ProgramResult {
        // Get accounts
        let _cashflow = &mut ctx.accounts.cashflow;
        let _creditor = &mut ctx.accounts.creditor;

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
pub struct CreateCashflow<'info> {
    #[account(
        init,
        seeds = [b"cashflow", creditor.key().as_ref(), debitor.key().as_ref()],
        bump = bump,
        payer = debitor,
        space = 8 + (4 + name.len()) + (4 + memo.len()) + 32 + 32 + 8 + 8 + 8 + 1,
    )]
    pub cashflow: Account<'info, Cashflow>,
    pub creditor: AccountInfo<'info>,
    #[account(mut)]
    pub debitor: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct DistributeCashflow<'info> {
    #[account(
        mut,
        seeds = [b"cashflow", creditor.key().as_ref(), debitor.key().as_ref()],
        bump = cashflow.bump,
    )]
    pub cashflow: Account<'info, Cashflow>,
    #[account(mut)]
    pub creditor: AccountInfo<'info>,
    pub debitor: AccountInfo<'info>,
    #[account(mut)]
    pub distributor: Signer<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct TokenizeCashflow<'info> {
    #[account(
        mut,
        seeds = [b"cashflow", creditor.key().as_ref(), debitor.key().as_ref()],
        bump = cashflow.bump,
    )]
    pub cashflow: Account<'info, Cashflow>,
    #[account(mut)]
    pub creditor: Signer<'info>,
    pub debitor: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}




////////////////
/// Accounts ///
////////////////

#[account]
pub struct Cashflow {
    pub name: String,
    pub memo: String,
    pub creditor: Pubkey,
    pub debitor: Pubkey,
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
    #[msg("It's too early to distribute this cashflow")]
    TooEarly,
}
