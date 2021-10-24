import { Program, Provider, web3 } from "@project-serum/anchor";
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
  WalletDisconnectButton,
} from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { CreateCashflowModal, CashflowTable } from "src/components";
import idl from "../idl.json";

const programID = new PublicKey(idl.metadata.address);

const opts: web3.ConfirmOptions = {
  preflightCommitment: "processed",
};

const tabs = [{ name: "All" }, { name: "Outgoing" }, { name: "Incoming" }];

interface Cashflows {
  all: any[];
  incoming: any[];
  outgoing: any[];
}

export function HomeView() {
  const wallet = useAnchorWallet();

  const [cashflows, setCashflows] = useState<Cashflows>({
    all: [],
    incoming: [],
    outgoing: [],
  });

  const [currentTab, setCurrentTab] = useState("All");
  const [isCreateCashflowModalOpen, setIsCreateCashflowModalOpen] =
    useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const visibleCashflows = useMemo(() => {
    switch (currentTab) {
      case "All":
        return cashflows.all;
      case "Incoming":
        return cashflows.incoming;
      case "Outgoing":
        return cashflows.outgoing;
    }
  }, [cashflows, currentTab]);

  const { connection } = useConnection();

  const provider = useMemo(() => {
    return new Provider(connection, wallet, opts);
  }, [connection, wallet, opts]);

  const program = useMemo(() => {
    return new Program(idl as any, programID, provider);
  }, [idl, programID, provider]);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setIsRefreshing(true);
    const cashflows: any = await program.account.cashflow.all();
    setCashflows({
      all: cashflows,
      incoming: cashflows.filter(
        (inv: any) =>
          inv.account.receiver.toString() === wallet.publicKey.toString()
      ),
      outgoing: cashflows.filter(
        (inv: any) =>
          inv.account.sender.toString() === wallet.publicKey.toString()
      ),
    });
    setIsRefreshing(false);
  }

  return (
    <div className="flex flex-1 h-screen overflow-auto overflow-hidden bg-gray-100 focus:outline-none">
      <main className="z-0 flex-1 max-w-4xl py-8 mx-auto space-y-8">
        <Header />
        <CashflowTable
          cashflows={visibleCashflows}
          currentTab={currentTab}
          program={program}
          refresh={refresh}
        />
      </main>
      {wallet && (
        <CreateCashflowModal
          open={isCreateCashflowModalOpen}
          setOpen={setIsCreateCashflowModalOpen}
          program={program}
          refresh={refresh}
          provider={provider}
        />
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-row justify-between py-0">
      <HomeButton />
      {/* <img className="h-6 my-auto" src="/wordmark-orange-black.svg" /> */}
      <WalletManager />
    </div>
  );
}

function HomeButton() {
  return (
    <a href="/" className="flex h-12 px-2 my-auto transform hover:opacity-75">
      <img className="h-6 my-auto" src="/wordmark-orange-black.svg" />
    </a>
  );
}

function WalletManager() {
  // const wallet = useAnchorWallet();
  // if (wallet)
  //   return (
  //     <div className="my-auto">
  //       <WalletDisconnectButton />
  //     </div>
  //   );
  // else
  return (
    <div className="my-auto">
      <WalletMultiButton />
    </div>
  );
}

function Toolbar({
  currentTab,
  setCurrentTab,
  isRefreshing,
  refresh,
  setIsCreateCashflowModalOpen,
}) {
  const wallet = useAnchorWallet();
  return (
    <div className="flex items-center justify-between mt-4">
      {/* Left side */}
      <nav className="flex space-x-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <a
            onClick={() => setCurrentTab(tab.name)}
            key={tab.name}
            className={`px-3 py-2 font-medium text-sm rounded-md cursor-pointer ${
              tab.name === currentTab
                ? "bg-blue-100 text-blue-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.name}
          </a>
        ))}
      </nav>
      {/* Right side */}
      {wallet && (
        <div className="space-x-2">
          <RefreshButton refresh={refresh} isRefreshing={isRefreshing} />
          <CreateCashflowButton
            showModal={() => setIsCreateCashflowModalOpen(true)}
          />
        </div>
      )}
    </div>
  );
}

function CreateCashflowButton({ showModal }) {
  return (
    <button
      onClick={showModal}
      type="button"
      className="px-4 py-3 font-semibold text-white bg-blue-500 rounded-md shadow-sm hover:bg-blue-600"
    >
      Create cashflow
    </button>
  );
}

function RefreshButton({ refresh, isRefreshing }) {
  return (
    <button
      onClick={refresh}
      disabled={isRefreshing}
      className="px-4 py-3 font-semibold text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-200"
    >
      {isRefreshing ? "Refreshing..." : "Refresh"}
    </button>
  );
}
