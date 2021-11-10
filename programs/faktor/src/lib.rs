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
    std::cmp::min,
};

declare_id!("5jFpi79U5469zL14EgCiuXnLMuKZsnD7ixSL4z6zoLcG");

// PDA seeds
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
    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>, 
        bump: u8
    ) -> ProgramResult {
        // Get accounts.
        let treasury = &mut ctx.accounts.treasury;

        // Initialize treasury.
        treasury.bump = bump;

        return Ok(());
    }

    pub fn create_payment(
        ctx: Context<CreatePayment>, 
        idempotency_key: String,
        memo: String, 
        amount: u64,
        recurrence_interval: u64,
        next_transfer_at: u64,
        completed_at: u64,
        bump: u8,
    ) -> ProgramResult {
        // Get accounts.
        let payment = &mut ctx.accounts.payment;
        let debtor = &mut ctx.accounts.debtor;
        let debtor_tokens = &mut ctx.accounts.debtor_tokens;
        let creditor = &ctx.accounts.creditor;
        let creditor_tokens = &ctx.accounts.creditor_tokens;
        let mint = &ctx.accounts.mint;
        let system_program = &ctx.accounts.system_program;
        let token_program = &ctx.accounts.token_program;
        let clock = &ctx.accounts.clock;

        // Validate request data.
        if recurrence_interval == 0 {
            // This is a one-time request. 
            // Validate the completed_at period matches the next_transfer_at.
            require!(
                completed_at == next_transfer_at,
                ErrorCode::InvalidChronology
            );
        } else {
            // This is a recurring payment.
            // Validate the timestamps and recurrence interval are chronologically valid.
            require!(
                next_transfer_at <= completed_at - recurrence_interval,
                ErrorCode::InvalidChronology
            );
        }
        
        // Validate debtor has sufficient lamports to cover the transfer fee.
        let num_transfers = match recurrence_interval {
            0 => 1,
            _ => (completed_at - next_transfer_at) / recurrence_interval,
        };
        let transfer_fee = num_transfers * (TRANSFER_FEE_DISTRIBUTOR + TRANSFER_FEE_PROGRAM);
        require!(
            debtor.to_account_info().lamports() >= transfer_fee,
            ErrorCode::InsufficientBalance
        );

        // Initialize payment account.
        payment.idempotency_key = idempotency_key;
        payment.memo = memo;
        payment.debtor = debtor.key();
        payment.debtor_tokens = debtor_tokens.key();
        payment.creditor = creditor.key();
        payment.creditor_tokens = creditor_tokens.key();
        payment.mint = mint.key();
        payment.status = PaymentStatus::Scheduled;
        payment.amount = amount;
        payment.recurrence_interval = recurrence_interval;
        payment.next_transfer_at = next_transfer_at;
        payment.completed_at = completed_at;
        payment.created_at = clock.unix_timestamp as u64;
        payment.bump = bump;

        // Approve program authority to initiate transfers from the debtor's token account.
        let total_transfer_amount = num_transfers * amount;
        approve(
            CpiContext::new(
                token_program.to_account_info(),
                Approve {
                    authority: debtor.to_account_info(),
                    delegate: payment.to_account_info(),
                    to: debtor_tokens.to_account_info(),
                }
            ),
            total_transfer_amount
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
        let token_program = &ctx.accounts.token_program;

        // Validate the payment has sufficient authorizion to initiate a transfer from the debtor's token account.
        if debtor_tokens.delegate.is_some() && 
            debtor_tokens.delegate.unwrap() == payment.key() &&
            debtor_tokens.delegated_amount >= payment.amount {

            // Transfer tokens from debtor to creditor.
            transfer(
                CpiContext::new_with_signer(
                    token_program.to_account_info(),
                    Transfer {
                        authority: payment.to_account_info(),
                        from: debtor_tokens.to_account_info(),
                        to: creditor_tokens.to_account_info(),
                    },
                    &[&[payment.idempotency_key.as_bytes(), payment.debtor.as_ref(), payment.creditor.as_ref(), &[payment.bump]]]
                ),
                payment.amount,
            )?;

            // Update the timestamp for the next transfer attempt.
            payment.next_transfer_at = min(
                payment.next_transfer_at + payment.recurrence_interval,
                payment.completed_at
            );
            
            // If the next transfer timestamp has reached the completed at timestamp, mark the payment as completed.
            if payment.next_transfer_at == payment.completed_at {
                payment.status = PaymentStatus::Completed;
            }
        } else {
            // Mark the payment as failed.
            payment.status = PaymentStatus::Failed;
        }

        // Pay transfer fee to the distributor.
        **payment.to_account_info().try_borrow_mut_lamports()? -= TRANSFER_FEE_DISTRIBUTOR;
        **distributor.to_account_info().try_borrow_mut_lamports()? += TRANSFER_FEE_DISTRIBUTOR;
        
        // Pay transfer fee to the treasury.
        **payment.to_account_info().try_borrow_mut_lamports()? -= TRANSFER_FEE_PROGRAM;
        **treasury.to_account_info().try_borrow_mut_lamports()? += TRANSFER_FEE_PROGRAM;

        return Ok(());
    }
}



////////////////////
/// Instructions ///
////////////////////

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeTreasury<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(
        init, 
        seeds = [TREASURY_SEED], 
        bump = bump, 
        payer = signer, 
        space = 8 + 1
    )]
    pub treasury: Account<'info, Treasury>,
    #[account(address = SYSTEM_PROGRAM_ID)]
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(
    idempotency_key: String,
    memo: String, 
    amount: u64,
    recurrence_interval: u64,
    next_transfer_at: u64,
    completed_at: u64,
    bump: u8,
)]
pub struct CreatePayment<'info> {
    #[account(
        init,
        seeds = [idempotency_key.as_bytes(), debtor.key().as_ref(), creditor.key().as_ref()],
        bump = bump,
        payer = debtor,
        space = 8 + (4 + memo.len()) + (4 + memo.len()) + 32 + 32 + 32 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
    )]
    pub payment: Account<'info, Payment>,
    #[account(mut)]
    pub debtor: Signer<'info>,
    #[account(
        mut,
        constraint = debtor_tokens.owner == debtor.key(),
        constraint = debtor_tokens.mint == mint.key()
    )]
    pub debtor_tokens: Account<'info, TokenAccount>,
    pub creditor: AccountInfo<'info>,
    #[account(
        constraint = creditor_tokens.owner == creditor.key(),
        constraint = creditor_tokens.mint == mint.key()
    )]
    pub creditor_tokens: Account<'info, TokenAccount>,
    pub mint: Account<'info, Mint>,
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
        seeds = [payment.idempotency_key.as_bytes(), debtor.key().as_ref(), creditor.key().as_ref()],
        bump = payment.bump,
        has_one = debtor,
        has_one = debtor_tokens,
        has_one = creditor,
        has_one = creditor_tokens,
        constraint = payment.status == PaymentStatus::Scheduled,
        constraint = payment.next_transfer_at <= (clock.unix_timestamp as u64)
    )]
    pub payment: Account<'info, Payment>,
    pub debtor: AccountInfo<'info>,
    #[account(
        mut,
        constraint = debtor_tokens.owner == payment.debtor,
        constraint = debtor_tokens.mint == payment.mint,
    )]
    pub debtor_tokens: Account<'info, TokenAccount>,
    #[account(mut)]
    pub creditor: AccountInfo<'info>,
    #[account(
        mut,
        constraint = creditor_tokens.owner == payment.creditor,
        constraint = creditor_tokens.mint == payment.mint
    )]
    pub creditor_tokens: Account<'info, TokenAccount>,
    #[account(mut)]
    pub distributor: Signer<'info>,
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
    pub idempotency_key: String,
    pub memo: String,
    pub debtor: Pubkey,
    pub debtor_tokens: Pubkey,
    pub creditor: Pubkey,
    pub creditor_tokens: Pubkey,
    pub mint: Pubkey,
    pub status: PaymentStatus,
    pub amount: u64,
    pub recurrence_interval: u64,
    pub next_transfer_at: u64,
    pub completed_at: u64,
    pub created_at: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum PaymentStatus {
    Scheduled,
    Completed,
    Failed,
}

#[account]
pub struct TransferLog {
    pub payment: Pubkey,
    pub distributor: Pubkey,
    pub status: TransferStatus,
    pub amount: u64,
    pub timestamp: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum TransferStatus {
    Failed,
    Succeeded,
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
    #[msg("Insufficient SOL to pay transfer fees.")]
    InsufficientBalance,
    #[msg("The timestamps and recurrence interval must be chronological.")]
    InvalidChronology,
}
