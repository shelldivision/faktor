use {
    anchor_lang::{
        AnchorSerialize,
        prelude::*,
        solana_program::{
            program::invoke,
            system_instruction,
            system_program::{
                ID as SYSTEM_PROGRAM_ID
            },
        },
    },
    anchor_spl::token::{
        ID as TOKEN_PROGRAM_ID, 
        Approve, 
        Mint, 
        Token, 
        TokenAccount, 
        Transfer, 
        approve, 
        transfer
    },
    std::clone::Clone,
};

declare_id!("9LjA6DjxKDB2uEQPH1kipq5L7Z2hRKGz2yd9EQD9fGhU");

// PDA seeds
static PROGRAM_AUTHORITY_SEED: &[u8] = b"program_authority";
static TREASURY_SEED: &[u8] = b"treasury";

// Fees
static TRANSFER_FEE_DISTRIBUTOR: u64 = 1000; 
static TRANSFER_FEE_PROGRAM: u64 = 1000;


///////////////
/// Program ///
///////////////

#[program]
pub mod faktor {
    use super::*;
    pub fn initialize(
        ctx: Context<Initialize>, 
        program_authority_bump: u8,
        treasury_bump: u8
    ) -> ProgramResult {
        // Get accounts.
        let program_authority = &mut ctx.accounts.program_authority;
        let treasury = &mut ctx.accounts.treasury;

        // Initialize program authorty.
        program_authority.bump = program_authority_bump;

        // Initialize treasury.
        treasury.bump = treasury_bump;

        return Ok(());
    }

    pub fn approve_cashflow(
        ctx: Context<ApproveCashflow>,
        additional_balance: u64
    ) -> ProgramResult {
        // Get accounts.
        let cashflow = &mut ctx.accounts.cashflow;
        let sender = &ctx.accounts.sender;
        let sender_tokens = &mut ctx.accounts.sender_tokens;
        let token_program = &ctx.accounts.token_program;
        let program_authority = &ctx.accounts.program_authority;
        let system_program = &ctx.accounts.system_program;

        // Validate request data.
        require!(
            additional_balance >= cashflow.delta_balance, 
            ErrorCode::InvalidRequest
        );

        // Validate sender has sufficient lamports to cover transfer fee.
        let num_transfers = additional_balance / cashflow.delta_balance;
        let transfer_fee = num_transfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_PROGRAM);
        require!(
            sender.to_account_info().lamports() >= transfer_fee,
            ErrorCode::InsufficientLamports
        );

        // Approve program authority to initiate transfers from the sender's token account.
        let new_balance = cashflow.balance + additional_balance;
        approve(
            CpiContext::new(
                token_program.to_account_info(),
                Approve {
                    authority: sender.to_account_info(),
                    delegate: program_authority.to_account_info(),
                    to: sender_tokens.to_account_info(),
                }
            ),
            new_balance,
        )?;

        // Update cashflow balance.
        cashflow.balance = new_balance;

        // Collect transfer fee from sender.
        invoke(
            &system_instruction::transfer(&sender.key(), &cashflow.key(), transfer_fee),
            &[
                sender.to_account_info().clone(),
                cashflow.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(())
    }

    pub fn create_cashflow(
        ctx: Context<CreateCashflow>, 
        name: String,
        memo: String,
        balance: u64,
        delta_balance: u64,
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
        let mint = &ctx.accounts.mint;
        let program_authority = &ctx.accounts.program_authority;
        let system_program = &ctx.accounts.system_program;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        // Validate request data.
        require!(
            balance >= delta_balance, 
            ErrorCode::InvalidRequest
        );
        
        // Validate sender has sufficient lamports to cover the transfer fee.
        let num_transfers = balance / delta_balance;
        let transfer_fee = num_transfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_PROGRAM);
        require!(
            sender.to_account_info().lamports() >= transfer_fee,
            ErrorCode::InsufficientLamports
        );

        // Initialize cashflow account.
        cashflow.name = name;
        cashflow.memo = memo;
        cashflow.sender = sender.key();
        cashflow.sender_tokens = sender_tokens.key();
        cashflow.receiver = receiver.key();
        cashflow.receiver_tokens = receiver_tokens.key();
        cashflow.mint = mint.key();
        cashflow.balance = balance;
        cashflow.delta_balance = delta_balance;
        cashflow.delta_time = delta_time;
        cashflow.is_factorable = is_factorable;
        cashflow.next_transfer_at = clock.unix_timestamp as u64; // TODO this should be a user variable
        cashflow.created_at = clock.unix_timestamp as u64;
        cashflow.bump = bump;

        // Approve program authority to initiate transfers from the sender's token account.
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

        // Collect total transfer fee from sender.
        invoke(
            &system_instruction::transfer(&sender.key(), &cashflow.key(), transfer_fee),
            &[
                sender.to_account_info().clone(),
                cashflow.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(());
    }

    pub fn distribute_cashflow(
        ctx: Context<DistributeCashflow>
    ) -> ProgramResult {
        // Get accounts.
        let cashflow = &mut ctx.accounts.cashflow;
        let sender_tokens = &ctx.accounts.sender_tokens;
        let receiver_tokens = &ctx.accounts.receiver_tokens;
        let distributor = &ctx.accounts.distributor;
        let treasury = &ctx.accounts.treasury;
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

        // Transfer tokens from sender to receiver.
        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    authority: program_authority.to_account_info(),
                    from: sender_tokens.to_account_info(),
                    to: receiver_tokens.to_account_info(),
                },
                &[&[PROGRAM_AUTHORITY_SEED, &[program_authority.bump]]]
            ),
            cashflow.delta_balance,
        )?;

        // Draw down the balance.
        cashflow.balance -= cashflow.delta_balance;

        // Pay distributor transfer fee from cashflow to distributor.
        **cashflow.to_account_info().try_borrow_mut_lamports()? -= TRANSFER_FEE_DISTRIBUTOR;
        **distributor.to_account_info().try_borrow_mut_lamports()? += TRANSFER_FEE_DISTRIBUTOR;
        
        // Pay program transfer fee from cashflow to treasury.
        **cashflow.to_account_info().try_borrow_mut_lamports()? -= TRANSFER_FEE_PROGRAM;
        **treasury.to_account_info().try_borrow_mut_lamports()? += TRANSFER_FEE_PROGRAM;

        return Ok(());
    } 
}



////////////////////
/// Instructions ///
////////////////////

#[derive(Accounts)]
#[instruction(
    program_authority_bump: u8,
    treasury_bump: u8
)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init, 
        seeds = [PROGRAM_AUTHORITY_SEED], 
        bump = program_authority_bump, 
        payer = signer, 
        space = 8 + 1
    )]
    pub program_authority: Account<'info, ProgramAuthority>,
    #[account(
        init, 
        seeds = [TREASURY_SEED], 
        bump = treasury_bump, 
        payer = signer, 
        space = 8 + 1
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ApproveCashflow<'info> {
    #[account(
        mut,
        seeds = [b"cashflow", sender.key().as_ref(), receiver.key().as_ref()],
        bump = cashflow.bump,
        has_one = sender,
        has_one = receiver,
    )]
    pub cashflow: Account<'info, Cashflow>,
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(mut)]
    pub sender_tokens: Account<'info, TokenAccount>,
    pub receiver: AccountInfo<'info>,
    #[account(mut, seeds = [PROGRAM_AUTHORITY_SEED], bump = program_authority.bump)]
    pub program_authority: Account<'info, ProgramAuthority>,
    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(
    name: String, 
    memo: String, 
    balance: u64,
    delta_balance: u64, 
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
        space = 8 + (4 + name.len()) + (4 + memo.len()) + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 1 + 8 + 8 + 1,
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
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, Treasury>,
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
    pub mint: Pubkey,
    pub balance: u64,
    pub delta_balance: u64,
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

#[account]
pub struct Treasury {
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
    #[msg("Invalid request")]
    InvalidRequest,
    #[msg("Too early to distribute")]
    TooEarly,
}
