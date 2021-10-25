import { PublicKey } from "@solana/web3.js";
import { useState } from "react";
import { InputField } from "./InputField";

type Mint = {
  address: PublicKey;
  name: string;
  ticker: string;
  icon: string;
};

const MINTS = [
  {
    address: new PublicKey("So11111111111111111111111111111111111111112"),
    name: "Solana",
    ticker: "wSOL",
    icon: "/svg/token/sol.svg"
  },
  {
    address: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    name: "USD Coin",
    ticker: "USDC",
    icon: "/svg/token/usdc.svg"
  }
];

export function MintAmountInput() {
  return (
    <div className="flex flex-row flex-1 space-x-2">
      <MintInput />
      <InputField type="number" placeholder="0.00" step="1" onChange={() => {}} />
    </div>
  );
}

// border border-gray-200
function MintInput() {
  const [selectedMint, setSelectedMint] = useState(MINTS[0]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div
      className={`flex flex-col w-1/3 pb-1 bg-white border rounded-lg ${
        error ? "border-red-600" : `border-gray-200`
      }`}
    >
      <DropdownButton
        selectedMint={selectedMint}
        setSelectedMint={setSelectedMint}
        isDropdownVisible={isDropdownVisible}
        setIsDropdownVisible={setIsDropdownVisible}
      />
      <div className="relative">
        {isDropdownVisible && (
          <DropdownList>
            {MINTS.map((mint) => (
              <DropdownItem mint={mint} />
            ))}
            {/* <DropdownItem title="wSOL" /> */}
            {/* <DropdownItem title="USDC" /> */}
            {/* <DropdownItem title="USDT" /> */}
          </DropdownList>
        )}
      </div>
    </div>
  );
}

export function MintSummary({ mint }: { mint: Mint }) {
  return (
    <div className="flex flex-row space-x-4">
      <img className="my-auto w-7 h-7" src={mint.icon} />
      <div className="">
        <span className="block text-lg font-medium text-gray-900 truncate">{mint.name}</span>
        <span className="block -mt-1 text-sm font-medium text-gray-400 truncate">
          {mint.ticker}
        </span>
      </div>
    </div>
  );
}

function DropdownButton({
  selectedMint,
  setSelectedMint,
  isDropdownVisible,
  setIsDropdownVisible
}) {
  return (
    <button
      type="button"
      onClick={() => setIsDropdownVisible(!isDropdownVisible)}
      className="relative w-full py-2 pl-3 pr-10 text-left rounded-md cursor-default cursor-pointer focus:outline-none sm:text-sm"
    >
      <MintSummary mint={selectedMint} />
      <DropdownToggleIcon />
    </button>
  );
}

function DropdownList({ children }) {
  return (
    <ul
      className="absolute z-10 w-full py-2 mt-1 space-y-0 overflow-y-auto text-base bg-white rounded-lg shadow-lg max-h-48 focus:outline-none sm:text-sm"
      tabIndex={-1}
      role="listbox"
      aria-labelledby="listbox-label"
      aria-activedescendant="listbox-option-3"
    >
      {children}
    </ul>
  );
}

function DropdownItem({ mint }: { mint: Mint }) {
  return (
    <li className="relative px-4 py-3 cursor-pointer select-none hover:bg-gray-100">
      <MintSummary mint={mint} />
    </li>
  );
}

function CheckmarkIcon() {
  return (
    <span className="absolute inset-y-0 right-0 flex items-center text-indigo-600">
      <svg
        className="w-5 h-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    </span>
  );
}

function DropdownToggleIcon() {
  return (
    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
      <svg
        className="w-5 h-5 text-gray-400"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
          clip-rule="evenodd"
        />
      </svg>
    </span>
  );
}
