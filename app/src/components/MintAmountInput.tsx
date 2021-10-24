import { InputField } from "./InputField";

export function MintAmountInput() {
  return (
    <div className="flex flex-row flex-1 space-x-2">
      <InputField
        type="text"
        label="Mint"
        placeholder="USDC"
        onChange={() => {}}
      />
      <InputField
        type="number"
        label="Amount"
        placeholder="0.00"
        onChange={() => {}}
      />
    </div>
  );
}
