import { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { useFaktor } from "@components";
import { AccountInfo, MintInfo, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { Program, web3 } from "@project-serum/anchor";
import { getATAAddress } from "@utils";

// async function fetchBalance(conn: Connection, pubkey: PublicKey) {
//   try {
//     const fetchedBalance = await conn.getBalance(pubkey);
//     console.log("Fetched wallet balance: ", fetchedBalance);
//     return fetchedBalance;
//   } catch (reason) {
//     console.log("Failed to fetch wallet balance. Reason: ", reason);
//     return new Error(`Failed to fetch wallet balance. Reason: ${JSON.stringify(reason)}`);
//   }
// }

export type TokenBalanceProps = {
  mint: PublicKey;
};

export function TokenBalance({ mint }: TokenBalanceProps) {
  const wallet = useAnchorWallet();
  const faktor = useFaktor();

  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [mintInfo, setMintInfo] = useState<MintInfo | null>(null);

  const token: Token | null = useMemo(() => {
    if (!wallet) return null;
    return new Token(faktor.provider.connection, mint, TOKEN_PROGRAM_ID, web3.Keypair.generate());
  }, [wallet, faktor]);

  useEffect(() => {
    async function refreshTokenMintInfo(token: Token | null, faktor: Program) {
      if (!token) return;
      const ataAddress = await getATAAddress({ mint, owner: faktor.provider.wallet.publicKey });
      try {
        const ai = await token.getAccountInfo(ataAddress);
        const mi = await token.getMintInfo();
        setAccountInfo(ai);
        setMintInfo(mi);
      } catch (e) {
        console.log("Failed to fetch token/mint info");
      }
    }
    refreshTokenMintInfo(token, faktor);
  }, [token, faktor]);

  const normalizedAmount = useMemo(() => {
    if (!accountInfo) return 0;
    if (!mintInfo) return 0;
    return accountInfo.amount.toNumber() / Math.pow(10, mintInfo.decimals);
  }, [accountInfo, mintInfo]);

  return (
    <p className="text-sm text-right text-gray-500 font-base">Balance: {normalizedAmount} wSOL</p>
  );
}
