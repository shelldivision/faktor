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

declare_id!("B67a7z2ttQ39KJcFWHERXG6bUoWY2GPXgQfAeE6K89vN");

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
    pub fn initialize_program(
        ctx: Context<InitializeProgram>, 
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

    pub fn approve_payment(
        ctx: Context<ApprovePayment>,
        additional_balance: u64
    ) -> ProgramResult {
        // Get accounts.
        let payment = &mut ctx.accounts.payment;
        let debtor = &ctx.accounts.debtor;
        let debtor_tokens = &mut ctx.accounts.debtor_tokens;
        let token_program = &ctx.accounts.token_program;
        let program_authority = &ctx.accounts.program_authority;
        let system_program = &ctx.accounts.system_program;

        // Validate request data.
        require!(
            additional_balance >= payment.delta_balance, 
            ErrorCode::InvalidRequest
        );

        // Validate debtor has sufficient lamports to cover transfer fee.
        let num_transfers = additional_balance / payment.delta_balance;
        let transfer_fee = num_transfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_PROGRAM);
        require!(
            debtor.to_account_info().lamports() >= transfer_fee,
            ErrorCode::InsufficientLamports
        );

        // Approve program authority to initiate transfers from the debtor's token account.
        let new_balance = payment.balance + additional_balance;
        approve(
            CpiContext::new(
                token_program.to_account_info(),
                Approve {
                    authority: debtor.to_account_info(),
                    delegate: program_authority.to_account_info(),
                    to: debtor_tokens.to_account_info(),
                }
            ),
            new_balance,
        )?;

        // Update payment balance.
        payment.balance = new_balance;

        // Collect transfer fee from debtor.
        invoke(
            &system_instruction::transfer(&debtor.key(), &payment.key(), transfer_fee),
            &[
                debtor.to_account_info().clone(),
                payment.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(())
    }

    pub fn create_payment(
        ctx: Context<CreatePayment>, 
        memo: String,
        balance: u64,
        delta_balance: u64,
        delta_time: u64,
        factorable_balance: u64,
        bump: u8
    ) -> ProgramResult {
        // Get accounts.
        let payment = &mut ctx.accounts.payment;
        let debtor = &mut ctx.accounts.debtor;
        let debtor_tokens = &mut ctx.accounts.debtor_tokens;
        let creditor = &ctx.accounts.creditor;
        let creditor_tokens = &ctx.accounts.creditor_tokens;
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
        
        // Validate debtor has sufficient lamports to cover the transfer fee.
        let num_transfers = balance / delta_balance;
        let transfer_fee = num_transfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_PROGRAM);
        require!(
            debtor.to_account_info().lamports() >= transfer_fee,
            ErrorCode::InsufficientLamports
        );

        // Initialize payment account.
        payment.memo = memo;
        payment.debtor = debtor.key();
        payment.debtor_tokens = debtor_tokens.key();
        payment.creditor = creditor.key();
        payment.creditor_tokens = creditor_tokens.key();
        payment.mint = mint.key();
        payment.balance = balance;
        payment.delta_balance = delta_balance;
        payment.delta_time = delta_time;
        payment.factorable_balance = factorable_balance;
        payment.next_transfer_at = clock.unix_timestamp as u64; // TODO this should be a user variable
        payment.created_at = clock.unix_timestamp as u64;
        payment.bump = bump;

        // Approve program authority to initiate transfers from the debtor's token account.
        approve(
            CpiContext::new(
                token_program.to_account_info(),
                Approve {
                    authority: debtor.to_account_info(),
                    delegate: program_authority.to_account_info(),
                    to: debtor_tokens.to_account_info(),
                }
            ),
            balance,
        )?;

        // Collect total transfer fee from debtor.
        invoke(
            &system_instruction::transfer(&debtor.key(), &payment.key(), transfer_fee),
            &[
                debtor.to_account_info().clone(),
                payment.to_account_info().clone(),
                system_program.to_account_info().clone(),
            ],
        )?;

        return Ok(());
    }

    pub fn distribute_payment(
        ctx: Context<DistributePayment>
    ) -> ProgramResult {
        // Get accounts.
        let payment = &mut ctx.accounts.payment;
        let debtor_tokens = &ctx.accounts.debtor_tokens;
        let creditor_tokens = &ctx.accounts.creditor_tokens;
        let distributor = &ctx.accounts.distributor;
        let treasury = &ctx.accounts.treasury;
        let program_authority = &ctx.accounts.program_authority;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        // Validate current timestamp.
        let now = clock.unix_timestamp as u64;
        require!(
            payment.next_transfer_at <= now,
            ErrorCode::TooEarly
        );

        // Set timestamp for next transfer attempt.
        payment.next_transfer_at += payment.delta_time;

        // Validate balances.
        require!(
            payment.balance >= payment.delta_balance,
            ErrorCode::InsufficientBalance
        );

        // Transfer tokens from debtor to creditor.
        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    authority: program_authority.to_account_info(),
                    from: debtor_tokens.to_account_info(),
                    to: creditor_tokens.to_account_info(),
                },
                &[&[PROGRAM_AUTHORITY_SEED, &[program_authority.bump]]]
            ),
            payment.delta_balance,
        )?;

        // Draw down the balance.
        payment.balance -= payment.delta_balance;

        // Pay distributor transfer fee from payment to distributor.
        **payment.to_account_info().try_borrow_mut_lamports()? -= TRANSFER_FEE_DISTRIBUTOR;
        **distributor.to_account_info().try_borrow_mut_lamports()? += TRANSFER_FEE_DISTRIBUTOR;
        
        // Pay program transfer fee from payment to treasury.
        **payment.to_account_info().try_borrow_mut_lamports()? -= TRANSFER_FEE_PROGRAM;
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
pub struct InitializeProgram<'info> {
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
pub struct ApprovePayment<'info> {
    #[account(
        mut,
        seeds = [b"payment", debtor.key().as_ref(), creditor.key().as_ref()],
        bump = payment.bump,
        has_one = debtor,
        has_one = creditor,
    )]
    pub payment: Account<'info, Payment>,
    #[account(mut)]
    pub debtor: Signer<'info>,
    #[account(mut)]
    pub debtor_tokens: Account<'info, TokenAccount>,
    pub creditor: AccountInfo<'info>,
    #[account(mut, seeds = [PROGRAM_AUTHORITY_SEED], bump = program_authority.bump)]
    pub program_authority: Account<'info, ProgramAuthority>,
    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
    #[account(address = TOKEN_PROGRAM_ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(
    memo: String, 
    balance: u64,
    delta_balance: u64, 
    delta_time: u64,
    factorable_balance: u64,
    bump: u8,
)]
pub struct CreatePayment<'info> {
    #[account(
        init,
        seeds = [b"payment", debtor.key().as_ref(), creditor.key().as_ref()],
        bump = bump,
        payer = debtor,
        space = 8 + (4 + memo.len()) + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
    )]
    pub payment: Account<'info, Payment>,
    #[account(mut)]
    pub debtor: Signer<'info>,
    #[account(mut)]
    pub debtor_tokens: Account<'info, TokenAccount>,
    pub creditor: AccountInfo<'info>,
    pub creditor_tokens: Account<'info, TokenAccount>,
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
pub struct DistributePayment<'info> {
    #[account(
        mut,
        seeds = [b"payment", debtor.key().as_ref(), creditor.key().as_ref()],
        bump = payment.bump,
        has_one = debtor,
        has_one = creditor,
    )]
    pub payment: Account<'info, Payment>,
    pub debtor: AccountInfo<'info>,
    #[account(mut)]
    pub debtor_tokens: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creditor: AccountInfo<'info>,
    #[account(mut)]
    pub creditor_tokens: Account<'info, TokenAccount>,
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
pub struct Payment {
    pub memo: String,
    pub debtor: Pubkey,
    pub debtor_tokens: Pubkey,
    pub creditor: Pubkey,
    pub creditor_tokens: Pubkey,
    pub mint: Pubkey,
    pub balance: u64,
    pub delta_balance: u64,
    pub delta_time: u64,
    pub factorable_balance: u64,
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
