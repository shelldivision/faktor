import { BN, Program } from "@project-serum/anchor";
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import { assertExists } from "src/utils";

export type CreateCashflowRequest = {
  program?: Program;
  receiver?: PublicKey;
  sender?: PublicKey;
  balance?: number;
  memo?: string;
};

export const createCashflow = async (
  req: CreateCashflowRequest
): Promise<any> => {
  // Validate request
  assertExists(req.program);
  assertExists(req.receiver);
  assertExists(req.sender);
  assertExists(req.balance);
  assertExists(req.memo);

  // Execute RPC request
  const [address, bump] = await PublicKey.findProgramAddress(
    [req.receiver.toBuffer(), req.sender.toBuffer()],
    req.program.programId
  );
  try {
    await req.program.rpc.createCashflow(bump, new BN(req.balance), req.memo, {
      accounts: {
        cashflow: address,
        receiver: req.receiver,
        sender: req.sender,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
    });
    return await req.program.account.cashflow.fetch(address);
  } catch (error: any) {
    throw new Error(`Failed to issue cashflow: ${error.message}`);
  }
};
