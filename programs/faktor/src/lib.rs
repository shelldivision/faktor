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
        bounty: u64,
        delta_balance: u64,
        delta_bounty: u64,
        delta_time: u64,
        bump: u8,
    ) -> ProgramResult {
        // Get accounts
        let cashflow = &mut ctx.accounts.cashflow;
        let receiver = &ctx.accounts.receiver;
        let sender = &mut ctx.accounts.sender;
        let system_program = &mut ctx.accounts.system_program;
        let clock = &ctx.accounts.clock;

        // Initialize cashflow
        cashflow.name = name;
        cashflow.memo = memo;
        cashflow.sender = sender.key();
        cashflow.receiver = receiver.key();
        cashflow.balance = balance;
        cashflow.bounty = bounty;
        cashflow.delta_balance = delta_balance;
        cashflow.delta_bounty = delta_bounty;
        cashflow.delta_time = delta_time;
        cashflow.next_transfer_at = clock.unix_timestamp as u64; // TODO this should be a user variable
        cashflow.created_at = clock.unix_timestamp as u64;
        cashflow.bump = bump;

        // Transfer balance from sender to cashflow
        invoke(
            &system_instruction::transfer(&sender.key(), &cashflow.key(), balance),
            &[
                sender.to_account_info().clone(),
                cashflow.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        // Transfer bounty from sender to cashflow
        invoke(
            &system_instruction::transfer(&sender.key(), &cashflow.key(), bounty),
            &[
                sender.to_account_info().clone(),
                cashflow.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(());
    }

    pub fn distribute_cashflow(ctx: Context<DistributeCashflow>) -> ProgramResult {
        // Get accounts
        let cashflow = &mut ctx.accounts.cashflow;
        let receiver = &ctx.accounts.receiver;
        let distributor = &ctx.accounts.distributor;
        let clock = &ctx.accounts.clock;

        // Validate current timestamp
        let now = clock.unix_timestamp as u64;
        require!(
            cashflow.next_transfer_at <= now,
            ErrorCode::TooEarly
        );

        // Set the timestamp for the next attempted transfer
        cashflow.next_transfer_at += cashflow.delta_time;

        // Validate balances
        require!(
            cashflow.balance >= cashflow.delta_balance,
            ErrorCode::InsufficientBalance
        );
        require!(
            cashflow.bounty >= cashflow.delta_bounty,
            ErrorCode::InsufficientBounty
        );
        require!(
            cashflow.to_account_info().lamports() >= cashflow.delta_balance + cashflow.delta_bounty,
            ErrorCode::InsufficientLamports
        );
        
        // Transfer Δ balance from cashflow to receiver
        **cashflow.to_account_info().try_borrow_mut_lamports()? -= cashflow.delta_balance;
        **receiver.to_account_info().try_borrow_mut_lamports()? += cashflow.delta_balance;

        // Transfer Δ bounty from cashflow to distributor
        **cashflow.to_account_info().try_borrow_mut_lamports()? -= cashflow.delta_bounty;
        **distributor.to_account_info().try_borrow_mut_lamports()? += cashflow.delta_bounty;
        
        // TODO if bounty is below Δ bounty, close the cash account and transfer remaining lamports/tokens back to sender


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
    bounty: u64,
    delta_balance: u64, 
    delta_bounty: u64,
    delta_time: u64,
    bump: u8,
)]
pub struct CreateCashflow<'info> {
    #[account(
        init,
        seeds = [b"cashflow", sender.key().as_ref(), receiver.key().as_ref()],
        bump = bump,
        payer = sender,
        space = 8 + (4 + name.len()) + (4 + memo.len()) + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
    )]
    pub cashflow: Account<'info, Cashflow>,
    #[account(mut)]
    pub sender: Signer<'info>,
    pub receiver: AccountInfo<'info>,
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct DistributeCashflow<'info> {
    #[account(
        mut,
        seeds = [b"cashflow", sender.key().as_ref(), receiver.key().as_ref()],
        bump = cashflow.bump,
    )]
    pub cashflow: Account<'info, Cashflow>,
    pub sender: AccountInfo<'info>,
    #[account(mut)]
    pub receiver: AccountInfo<'info>,
    #[account(mut)]
    pub distributor: Signer<'info>,
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
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub balance: u64,
    pub bounty: u64,
    pub delta_balance: u64,
    pub delta_bounty: u64,
    pub delta_time: u64,
    pub next_transfer_at: u64,
    pub created_at: u64,
    pub bump: u8,
}


//////////////
/// Errors ///
//////////////

#[error]
pub enum ErrorCode {
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Insufficient bounty")]
    InsufficientBounty,
    #[msg("Insufficient lamports")]
    InsufficientLamports,
    #[msg("Too early to distribute")]
    TooEarly,
}
