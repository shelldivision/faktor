import { useState } from "react";
import {
  CreatePaymentModal,
  getPaymentsFilterName,
  PaymentsTable,
  PAYMENTS_FILTERS,
  PaymentsFilter,
  WalletButton
} from "@components";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

export function HomeView() {
  // Get the connected wallet
  const wallet = useAnchorWallet();

  // Page state
  const [currentFilter, setCurrentFilter] = useState(PaymentsFilter.Outgoing);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);

  return (
    <div className="flex flex-1 h-screen overflow-auto bg-gray-100 focus:outline-none">
      <main className="z-0 flex-1 max-w-4xl px-2 py-8 mx-auto space-y-8 sm:px-4">
        <Header />
        {wallet && (
          <>
            <div className="space-y-4">
              <Toolbar
                currentFilter={currentFilter}
                setCurrentFilter={setCurrentFilter}
                setIsCreatePaymentModalOpen={setIsCreatePaymentModalOpen}
              />
              <PaymentsTable currentFilter={currentFilter} />
            </div>
            <CreatePaymentModal
              open={isCreatePaymentModalOpen}
              setOpen={setIsCreatePaymentModalOpen}
            />
          </>
        )}
      </main>
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

function Toolbar({
  currentFilter,
  setCurrentFilter,
  setIsCreatePaymentModalOpen
}: {
  currentFilter: PaymentsFilter;
  setCurrentFilter: (filter: PaymentsFilter) => void;
  setIsCreatePaymentModalOpen: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      {/* Left side */}
      <nav className="flex space-x-4" aria-label="Tabs">
        {PAYMENTS_FILTERS.map((filter) => (
          <div
            className={`flex border-b-2 transition duration-200 ${
              currentFilter === filter ? "border-orange-500" : "border-none"
            }`}
          >
            <a
              onClick={() => setCurrentFilter(filter)}
              key={filter.toString()}
              className={`px-3 py-2 text hover:bg-gray-200 transition duration-200 rounded-md font-semibold cursor-pointer ${
                currentFilter === filter ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {getPaymentsFilterName(filter)}
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

function NewPaymentButton({ showModal }: { showModal: () => void }) {
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
