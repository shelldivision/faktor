import { Program, Provider, web3 } from "@project-serum/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useMemo, useState } from "react";
import { CreatePaymentModal, PaymentsTable, WalletButton } from "@components";
import idl from "../idl.json";

const programID = new PublicKey(idl.metadata.address);

const opts: web3.ConfirmOptions = {
  preflightCommitment: "processed"
};

enum Tab {
  Incoming = "incoming",
  Outgoing = "outgoing"
}

const tabs = [Tab.Incoming, Tab.Outgoing];

function getTabName(tab: Tab) {
  switch (tab) {
    case Tab.Incoming:
      return "Incoming";
    case Tab.Outgoing:
      return "Outgoing";
    default:
      return "";
  }
}

// const tabs = [{ name: "Incoming" }, { name: "Outgoing" }];

interface PaymentsFeed {
  incoming: any[];
  outgoing: any[];
}

export function HomeView() {
  // Web3
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const provider = useMemo(() => new Provider(connection, wallet, opts), [connection, wallet]);
  const program = useMemo(() => new Program(idl as any, programID, provider), [provider]);

  // Page state
  const [currentTab, setCurrentTab] = useState(Tab.Incoming);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);

  // Cached data
  const [payments, setPayments] = useState<PaymentsFeed>({
    incoming: [],
    outgoing: []
  });
  const visiblePayments = useMemo(() => payments[currentTab.toString()], [payments, currentTab]);

  async function refresh() {
    console.log("REFRESHING HOME VIEW...");
    const payments: any = await program.account.payment.all();
    setPayments({
      incoming: payments.filter(
        (inv: any) => inv.account.receiver.toString() === wallet.publicKey.toString()
      ),
      outgoing: payments.filter(
        (inv: any) => inv.account.sender.toString() === wallet.publicKey.toString()
      )
    });
  }

  // Refresh page on load
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="flex flex-1 h-screen overflow-auto bg-gray-100 focus:outline-none">
      <main className="z-0 flex-1 max-w-4xl py-8 mx-auto space-y-8">
        <Header />
        <div className="space-y-4">
          {wallet && (
            <Toolbar
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              setIsCreatePaymentModalOpen={setIsCreatePaymentModalOpen}
            />
          )}
          <PaymentsTable
            payments={visiblePayments}
            currentTab={currentTab}
            program={program}
            refresh={refresh}
          />
        </div>
      </main>
      {wallet && (
        <CreatePaymentModal
          open={isCreatePaymentModalOpen}
          setOpen={setIsCreatePaymentModalOpen}
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
      <WalletButton />
    </div>
  );
}

function HomeButton() {
  return (
    <a href="/" className="flex h-12 px-2 my-auto transform">
      <img className="h-6 my-auto" src="/svg/logo/logo-wordmark-orange-black.svg" />
    </a>
  );
}

function Toolbar({ currentTab, setCurrentTab, setIsCreatePaymentModalOpen }) {
  return (
    <div className="flex items-center justify-between">
      {/* Left side */}
      <nav className="flex space-x-4" aria-label="Tabs">
        {tabs.map((tab) => (
          <div
            className={`flex border-b-2 transition duration-200 ${
              currentTab === tab ? "border-orange-500" : "border-none"
            }`}
          >
            <a
              onClick={() => setCurrentTab(tab.toString())}
              key={tab.toString()}
              className={`px-3 py-2 text hover:bg-gray-200 transition duration-200 rounded-md font-semibold cursor-pointer ${
                currentTab === tab ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {getTabName(tab)}
            </a>
          </div>
        ))}
      </nav>
      {/* Right side */}
      <div className="space-x-2">
        <NewPaymentButton showModal={() => setIsCreatePaymentModalOpen(true)} />
      </div>
    </div>
  );
}

function NewPaymentButton({ showModal }) {
  return (
    <button
      onClick={showModal}
      type="button"
      className="px-5 py-3 text-lg font-semibold text-white transition duration-200 bg-orange-500 rounded-lg shadow hover:bg-orange-400 hover:shadow-lg"
    >
      New Payment
    </button>
  );
}
