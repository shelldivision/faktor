import { PaymentsFilter, PAYMENTS_FILTERS } from "@components";
import { NewPaymentButton } from "./NewPaymentButton";
import { RefreshIcon } from "@heroicons/react/outline";

type PaymentsToolbarProps = {
  currentFilter: PaymentsFilter;
  refresh: () => void;
  setCurrentFilter: (filter: PaymentsFilter) => void;
  setIsCreatePaymentModalOpen: (val: boolean) => void;
};

export function PaymentsToolbar({
  currentFilter,
  refresh,
  setCurrentFilter,
  setIsCreatePaymentModalOpen
}: PaymentsToolbarProps) {
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
              {filter.toString()}
            </a>
          </div>
        ))}
      </nav>
      {/* Right side */}
      <div className="flex flex-row space-x-4">
        <RefreshButton refresh={refresh} />
        <NewPaymentButton showModal={() => setIsCreatePaymentModalOpen(true)} />
      </div>
    </div>
  );
}

type RefreshButtonProps = {
  refresh: () => void;
};

function RefreshButton({ refresh }: RefreshButtonProps) {
  return (
    <button
      className="flex flex-row px-2 px-4 space-x-2 text-base font-medium text-gray-900 rounded hover:bg-gray-200"
      onClick={() => refresh()}
    >
      <RefreshIcon className="w-5 h-5 m-auto" />
      <span className="my-auto ">Refresh</span>
    </button>
  );
}
