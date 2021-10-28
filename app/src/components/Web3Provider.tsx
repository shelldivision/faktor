import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useAnchorWallet,
  useConnection,
  AnchorWallet
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  getLedgerWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { ConfirmOptions, clusterApiUrl, Connection } from "@solana/web3.js";
import { Program, Provider } from "@project-serum/anchor";
import { FAKTOR_IDL, FAKTOR_PROGRAM_ID } from "@api";

export function Web3Provider({ children }) {
  // Can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const endpoint = useMemo(
    () =>
      process.env.NODE_ENV === "development"
        ? "http://localhost:8899"
        : clusterApiUrl(WalletAdapterNetwork.Devnet),
    []
  );

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
          <Web3ContextProvider>{children}</Web3ContextProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

const opts: ConfirmOptions = {
  preflightCommitment: "processed"
};

type Web3 = {
  wallet: AnchorWallet;
  connection: Connection;
  provider: Provider;
  faktor: Program;
};

const Web3Context = createContext<Web3 | null>(null);

export function Web3ContextProvider({ children }: PropsWithChildren<{}>) {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const provider = useMemo(() => new Provider(connection, wallet, opts), [connection, wallet]);
  const faktor = useMemo(() => new Program(FAKTOR_IDL, FAKTOR_PROGRAM_ID, provider), [provider]);
  return (
    <Web3Context.Provider
      value={{
        wallet,
        connection,
        provider,
        faktor
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  return useContext(Web3Context);
}
