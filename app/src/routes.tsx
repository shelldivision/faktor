import { useAnchorWallet } from "@solana/wallet-adapter-react";

import { Switch, Route } from "react-router-dom";
import { ConnectWalletView, HomeView } from "./views";

export const Routes = () => {
  return (
    <div className="w-screen h-screen">
      <Switch>
        <Route exact path="/" component={() => <HomeView />} />
      </Switch>
    </div>
  );
};
