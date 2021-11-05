import { HomeLink, WalletButton } from "@components";

export function Header() {
  return (
    <div className="flex flex-row justify-between py-0">
      <HomeLink />
      <WalletButton />
    </div>
  );
}
