import { CreatePaymentModal, PaymentsFilter, PaymentsTable, PaymentsToolbar } from "@components";
import { useState } from "react";

export function PaymentsDashboard() {
  const [currentFilter, setCurrentFilter] = useState(PaymentsFilter.Outgoing);
  const [isCreatePaymentModalOpen, setIsCreatePaymentModalOpen] = useState(false);

  return (
    <>
      <div className="py-4 space-y-8">
        <PaymentsToolbar
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
