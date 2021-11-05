import { useState } from "react";
import {
  CreatePaymentModal,
  getPaymentsFilterName,
  PaymentsTable,
  PAYMENTS_FILTERS,
  PaymentsFilter,
  ConnectWalletPrompt,
  Header,
  IconName,
  Icon
} from "@components";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";

export function HomeView() {
  const wallet = useAnchorWallet();
  return (
    <div className="flex flex-1 h-screen overflow-auto bg-white focus:outline-none">
      <main className="z-0 flex-1 max-w-5xl px-2 mx-auto space-y-8 py-11">
        <Header />
        {wallet ? <PaymentsApp /> : <ConnectWalletPrompt />}
      </main>
    </div>
  );
}

function PaymentsApp() {
  const [currentFilter, setCurrentFilter] = useState(PaymentsFilter.Outgoing);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);

  return (
    <>
      <div className="py-4 space-y-4">
        <Toolbar
          currentFilter={currentFilter}
          setCurrentFilter={setCurrentFilter}
          setIsCreatePaymentModalOpen={setIsCreatePaymentModalOpen}
        />
        <PaymentsTable currentFilter={currentFilter} />
      </div>
      <CreatePaymentModal open={isCreatePaymentModalOpen} setOpen={setIsCreatePaymentModalOpen} />
    </>
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
              className={`px-3 py-2 text hover:text-gray-900 transition duration-200 rounded-md font-semibold cursor-pointer ${
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
      className="flex flex-row px-4 py-2 space-x-2 text-base font-semibold text-white transition bg-orange-500 rounded hover:bg-gray-900"
    >
      <Icon name={IconName.Plus} className="w-4 h-4 my-auto" />
      <span>New Payment</span>
    </button>
  );
}
