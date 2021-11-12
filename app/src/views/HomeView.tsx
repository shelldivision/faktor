import { ConnectWalletPrompt, Header, PaymentsDashboard } from "@components";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

export function HomeView() {
  const wallet = useAnchorWallet();
  return (
    <div className="flex flex-1 w-screen h-screen overflow-x-auto bg-white focus:outline-none">
      <main className="z-0 flex-1 max-w-5xl px-2 mx-auto space-y-8 py-11">
        <Header />
        {wallet ? <PaymentsDashboard /> : <ConnectWalletPrompt />}
      </main>
    </div>
  );
}
