import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useAnchorWallet,
  useConnection
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  getLedgerWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConfirmOptions, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider } from "@project-serum/anchor";
import { FaktorIdl, FAKTOR_IDL, FAKTOR_PROGRAM_ID } from "@api";

export function Web3Provider({ children }: React.PropsWithChildren<{}>) {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const endpoint = useMemo(() => clusterApiUrl(WalletAdapterNetwork.Devnet), []);
  // process.env.NODE_ENV === "development" ? "http://localhost:8899" :

  // @solana/wallet-adapter-wallets includes all the adapters but supports tree shaking --
  // Only the wallets you configure here will be compiled into your application
  const wallets = useMemo(
    () => [getPhantomWallet(), getSolflareWallet(), getSlopeWallet(), getLedgerWallet()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider logo="/logo512.png">
          <FaktorProvider>{children}</FaktorProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const opts: ConfirmOptions = {
  preflightCommitment: "processed"
};

const FaktorContext = createContext<Program<FaktorIdl> | null>(null);

export function FaktorProvider({ children }: PropsWithChildren<{}>) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  const value = useMemo(() => {
    if (!wallet) return null;
    const provider = new Provider(connection, wallet, opts);
    return new Program<FaktorIdl>(FAKTOR_IDL, FAKTOR_PROGRAM_ID, provider);
  }, [wallet, connection]);

  return <FaktorContext.Provider value={value}>{children}</FaktorContext.Provider>;
}

export function useFaktor() {
  const faktor = useContext(FaktorContext);
  if (!faktor) throw new Error("Faktor program is not initialized.");
  return faktor;
}
