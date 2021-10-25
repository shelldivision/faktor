import { PublicKey } from "@solana/web3.js";
import { useRef, useState } from "react";
import { useOnClickOutside } from "@hooks";

export type Mint = {
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

export function MintSelect() {
  const [selectedMint, setSelectedMint] = useState(MINTS[0]);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);
  const [error, setError] = useState(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef, () => setIsDropdownVisible(false));

  return (
    <div className={`flex flex-col rounded-lg hover:shadow-sm`} ref={dropdownRef}>
      <DropdownButton onClick={() => setIsDropdownVisible(true)} selectedMint={selectedMint} />
      <div className="relative">
        {isDropdownVisible && (
          <DropdownList>
            {MINTS.map((mint) => (
              <DropdownItem mint={mint} />
            ))}
          </DropdownList>
        )}
      </div>
    </div>
  );
}

function DropdownButton({ onClick, selectedMint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between flex-1 px-3 py-2 space-x-2 text-left rounded-lg focus:outline-none sm:text-sm"
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

function DropdownToggleIcon() {
  return (
    <span className="flex items-center justify-center pointer-events-none">
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

function MintSummary({ mint }: { mint: Mint }) {
  return (
    <div className="flex flex-row space-x-3">
      <img className="w-6 h-6 my-auto" src={mint.icon} />
      <span className="block text-lg font-semibold text-gray-900 truncate">{mint.ticker}</span>
    </div>
  );
}
