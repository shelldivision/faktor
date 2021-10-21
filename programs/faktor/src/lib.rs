use {
    anchor_lang::{
        prelude::*,
        solana_program::system_program::ID as SYSTEM_PROGRAM_ID,
        AnchorSerialize,
    },
    anchor_spl::token::{ID as TOKEN_PROGRAM_ID, Approve, Mint, Token, TokenAccount, Transfer, approve, transfer},
    std::clone::Clone,
};

declare_id!("9LjA6DjxKDB2uEQPH1kipq5L7Z2hRKGz2yd9EQD9fGhU");

static PROGRAM_AUTHORITY_SEED: &[u8] = b"faktor";

///////////////
/// Program ///
///////////////

#[program]
pub mod faktor {
    use super::*;
    pub fn initialize_program_authority(
        ctx: Context<InitializeProgramAuthority>, 
        bump: u8
    ) -> ProgramResult {
        let program_authority = &mut ctx.accounts.program_authority;
        program_authority.bump = bump;
        return Ok(());
    }

    pub fn create_cashflow(
        ctx: Context<CreateCashflow>, 
        name: String,
        memo: String,
        balance: u64,
        bounty: u64,
        delta_balance: u64,
        delta_bounty: u64,
        delta_time: u64,
        is_factorable: bool,
        bump: u8
    ) -> ProgramResult {
        // Get accounts.
        let cashflow = &mut ctx.accounts.cashflow;
        let sender = &mut ctx.accounts.sender;
        let sender_tokens = &mut ctx.accounts.sender_tokens;
        let receiver = &ctx.accounts.receiver;
        let receiver_tokens = &ctx.accounts.receiver_tokens;
        let program_authority = &mut ctx.accounts.program_authority;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        // Validate request.
        require!(
            balance >= delta_balance, 
            ErrorCode::InsufficientApproval
        );

        // Initialize cashflow account.
        cashflow.name = name;
        cashflow.memo = memo;
        cashflow.sender = sender.key();
        cashflow.sender_tokens = sender_tokens.key();
        cashflow.receiver = receiver.key();
        cashflow.receiver_tokens = receiver_tokens.key();
        cashflow.balance = balance;
        cashflow.bounty = bounty;
        cashflow.delta_balance = delta_balance;
        cashflow.delta_bounty = delta_bounty;
        cashflow.delta_time = delta_time;
        cashflow.is_factorable = is_factorable;
        cashflow.next_transfer_at = clock.unix_timestamp as u64; // TODO this should be a user variable
        cashflow.created_at = clock.unix_timestamp as u64;
        cashflow.bump = bump;

        // Approve program authority to transfer from the sender's token account.
        approve(
            CpiContext::new(
                token_program.to_account_info(),
                Approve {
                    authority: sender.to_account_info(),
                    delegate: program_authority.to_account_info(),
                    to: sender_tokens.to_account_info(),
                }
            ),
            balance,
        )?;

        // TODO Collect bounty (FKTR tokens) from sender.
        // TODO Burn FKTR tokens.

        return Ok(());
    }

    pub fn distribute_cashflow(ctx: Context<DistributeCashflow>) -> ProgramResult {
        // Get accounts.
        let cashflow = &mut ctx.accounts.cashflow;
        let sender_tokens = &ctx.accounts.sender_tokens;
        let receiver_tokens = &ctx.accounts.receiver_tokens;
        let _distributor = &ctx.accounts.distributor;
        let program_authority = &ctx.accounts.program_authority;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        // Validate current timestamp.
        let now = clock.unix_timestamp as u64;
        require!(
            cashflow.next_transfer_at <= now,
            ErrorCode::TooEarly
        );

        // Set timestamp for next transfer attempt.
        cashflow.next_transfer_at += cashflow.delta_time;

        // Validate balances.
        require!(
            cashflow.balance >= cashflow.delta_balance,
            ErrorCode::InsufficientBalance
        );

        // Transfer Δbalance from cashflow to receiver.
        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: sender_tokens.to_account_info(),
                    to: receiver_tokens.to_account_info(),
                    authority: program_authority.to_account_info(),
                },
                &[&[PROGRAM_AUTHORITY_SEED, &[program_authority.bump]]]
            ),
            cashflow.delta_balance,
        )?;

        // Draw down the balance
        cashflow.balance -= cashflow.delta_balance;

        // TODO Transfer Δbounty from cashflow to distributor.
        // **cashflow.to_account_info().try_borrow_mut_lamports()? -= cashflow.delta_bounty;
        // **distributor.to_account_info().try_borrow_mut_lamports()? += cashflow.delta_bounty;
        
        return Ok(());
    } 
}



////////////////////
/// Instructions ///
////////////////////


#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeProgramAuthority<'info> {
    #[account(init, seeds = [PROGRAM_AUTHORITY_SEED], bump = bump, payer = signer, space = 8 + 1)]
    pub program_authority: Account<'info, ProgramAuthority>,
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    name: String, 
    memo: String, 
    balance: u64,
    bounty: u64,
    delta_balance: u64, 
    delta_bounty: u64,
    delta_time: u64,
    is_factorable: bool,
    bump: u8,
)]
pub struct CreateCashflow<'info> {
    #[account(
        init,
        seeds = [b"cashflow", sender.key().as_ref(), receiver.key().as_ref()],
        bump = bump,
        payer = sender,
        space = 8 + (4 + name.len()) + (4 + memo.len()) + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 8 + 1,
    )]
    pub cashflow: Account<'info, Cashflow>,
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub sender_tokens: Account<'info, TokenAccount>,
    pub receiver: AccountInfo<'info>,
    pub receiver_tokens: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
    #[account(mut, seeds = [PROGRAM_AUTHORITY_SEED], bump = program_authority.bump)]
    pub program_authority: Account<'info, ProgramAuthority>,
    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
    pub clock: Sysvar<'info, Clock>,
}

#[derive(Accounts)]
pub struct DistributeCashflow<'info> {
    #[account(
        mut,
        seeds = [b"cashflow", sender.key().as_ref(), receiver.key().as_ref()],
        bump = cashflow.bump,
        has_one = sender,
        has_one = receiver,
    )]
    pub cashflow: Account<'info, Cashflow>,
    pub sender: AccountInfo<'info>,
    #[account(mut)]
    pub sender_tokens: Account<'info, TokenAccount>,
    #[account(mut)]
    pub receiver: AccountInfo<'info>,
    #[account(mut)]
    pub receiver_tokens: Account<'info, TokenAccount>,
    #[account(mut)]
    pub distributor: Signer<'info>,
    #[account(mut, seeds = [PROGRAM_AUTHORITY_SEED], bump = program_authority.bump)]
    pub program_authority: Account<'info, ProgramAuthority>,
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
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
    pub sender_tokens: Pubkey,
    pub receiver: Pubkey,
    pub receiver_tokens: Pubkey,
    pub balance: u64,
    pub bounty: u64,
    pub delta_balance: u64,
    pub delta_bounty: u64,
    pub delta_time: u64,
    pub is_factorable: bool,
    pub next_transfer_at: u64,
    pub created_at: u64,
    pub bump: u8,
}

#[account]
pub struct ProgramAuthority {
    pub bump: u8,
}


//////////////
/// Errors ///
//////////////

#[error]
pub enum ErrorCode {
    #[msg("Inssufficient approval")]
    InsufficientApproval,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Insufficient bounty")]
    InsufficientBounty,
    #[msg("Insufficient lamports")]
    InsufficientLamports,
    #[msg("Too early to distribute")]
    TooEarly,
}
