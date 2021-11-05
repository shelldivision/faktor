import { FAKTOR_PROGRAM_ID } from "@api";
import { BN, Program } from "@project-serum/anchor";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  TransactionInstruction
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getOrCreateATA, MINTS } from "@utils";

const PAYMENT_SEED: Buffer = Buffer.from("payment");

export type CreatePaymentRequest = {
  idempotencyKey: string;
  debtor: PublicKey;
  creditor: PublicKey;
  memo: string;
  amount: number;
  recurrenceInterval: number;
  nextTransferAt: Date;
  completedAt: Date;
};

export const createPayment = async (faktor: Program, req: CreatePaymentRequest): Promise<any> => {
  // Generate payment PDA
  const [paymentAddress, paymentBump] = await PublicKey.findProgramAddress(
    [PAYMENT_SEED, req.debtor.toBuffer(), req.creditor.toBuffer()],
    FAKTOR_PROGRAM_ID
  );

  // Associated token accounts
  const debtorATA = await getOrCreateATA({
    provider: faktor.provider,
    mint: MINTS.WSOL.address,
    owner: req.debtor,
    payer: req.debtor
  });
  const creditorATA = await getOrCreateATA({
    provider: faktor.provider,
    mint: MINTS.WSOL.address,
    owner: req.creditor,
    payer: req.debtor
  });
  let instructions: TransactionInstruction[] | undefined = [];
  if (debtorATA.instruction) instructions.push(debtorATA.instruction);
  if (creditorATA.instruction) instructions.push(creditorATA.instruction);
  if (instructions.length === 0) instructions = undefined;

  // Execute RPC
  await faktor.rpc.createPayment(
    req.idempotencyKey,
    req.memo,
    new BN(req.amount),
    new BN(req.recurrenceInterval),
    new BN(dateToSeconds(req.nextTransferAt)),
    new BN(dateToSeconds(req.completedAt)),
    paymentBump,
    {
      accounts: {
        payment: paymentAddress,
        debtor: req.debtor,
        debtorTokens: debtorATA.address,
        creditor: req.creditor,
        creditorTokens: creditorATA.address,
        mint: MINTS.WSOL.address,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY
      },
      instructions
    }
  );
  const payment = await faktor.account.payment.fetch(paymentAddress);

  // Replicate payment to distributor
  await replicatePayment(paymentAddress);
  return payment;
};

function dateToSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

async function replicatePayment(address: PublicKey) {
  const url = "https://distributor.faktor.finance/payments/" + address.toString();
  await fetch(url, { method: "POST" })
    .then((res) => res.json())
    .then((payment) => console.log("Replicated payment: ", payment))
    .catch((err) => console.log("Failed to replicate payment to distributor: ", err));
}
