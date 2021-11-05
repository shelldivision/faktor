import { PaymentsFilter, PAYMENTS_FILTERS } from "@components";
import { NewPaymentButton } from "./NewPaymentButton";

export function PaymentsToolbar({
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
              {filter.toString()}
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
