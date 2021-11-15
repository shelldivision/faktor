// TODO add mint
// TODO add transferInterval

import { TimeUnit } from "./TransferRateInput";

// TODO add completedAt
export type CreatePaymentFormData = {
  creditor: string;
  memo: string;
  amount: string;
  nextTransferAt: string;
  interval: TimeUnit;
  frequency: number;
  endDate: string;
};
