import { Program, Provider, web3 } from "@project-serum/anchor";
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
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
    <>
      <div className="flex flex-1 h-screen overflow-auto overflow-hidden bg-gray-100 focus:outline-none">
        <main className="z-0 flex-1 pb-8 overflow-y-auto">
          {/* Devnet banner */}
          <div className="flex w-full h-12 bg-orange-500">
            <p className="m-auto font-medium text-white">
              Currently available on Solana devnet.
            </p>
          </div>
          {/* Page header */}
          <div className="max-w-4xl mx-auto mt-8">
            <Header />
            {/* Toolbar */}
            <div className="flex items-center justify-between mt-4">
              {/* Invoice tabs */}
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
              {/* Toolbar */}
              {wallet && (
                <div className="space-x-2">
                  <RefreshButton
                    refresh={refresh}
                    isRefreshing={isRefreshing}
                  />
                  <CreateCashflowButton
                    showModal={() => setIsCreateCashflowModalOpen(true)}
                  />
                </div>
              )}
            </div>
            {/* Cashflows table */}
            <div className="flex flex-col min-w-full mt-2 overflow-hidden overflow-x-auto rounded shadow">
              <CashflowTable
                cashflows={visibleCashflows}
                currentTab={currentTab}
                program={program}
                refresh={refresh}
              />
            </div>
          </div>
        </main>
      </div>
      {wallet && (
        <CreateCashflowModal
          open={isCreateCashflowModalOpen}
          setOpen={setIsCreateCashflowModalOpen}
          program={program}
          refresh={refresh}
          provider={provider}
        />
      )}
    </>
  );
}

function Header() {
  const wallet = useAnchorWallet();

  return (
    <div className="flex flex-row justify-between h-20 py-4">
      <h2 className="my-auto text-4xl font-bold leading-6 text-left text-gray-900">
        Faktor
      </h2>
      {!wallet && (
        <div className="my-auto">
          <WalletMultiButton />
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
