import {
  CreatePaymentModal,
  PaymentsFilter,
  PaymentsTable,
  PaymentsToolbar,
  useFaktor
} from "@components";
import { useEffect, useState } from "react";

export function PaymentsDashboard() {
  // Get Faktor program
  const faktor = useFaktor();

  const [allPayments, setAllPayments] = useState([]);
  const [currentFilter, setCurrentFilter] = useState(PaymentsFilter.Outgoing);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);

  // Refresh page on load
  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    if (!faktor) return;
    const payments: any = await faktor.account.payment.all();
    setAllPayments(payments);
  }

  return (
    <>
      <div className="py-4 space-y-8">
        <PaymentsToolbar
          currentFilter={currentFilter}
          refresh={refresh}
          setCurrentFilter={setCurrentFilter}
          setIsCreatePaymentModalOpen={setIsCreatePaymentModalOpen}
        />
        <PaymentsTable allPayments={allPayments} currentFilter={currentFilter} />
      </div>
      <CreatePaymentModal
        isOpen={isCreatePaymentModalOpen}
        setIsOpen={setIsCreatePaymentModalOpen}
        refresh={() => refresh()}
      />
    </>
  );
}
