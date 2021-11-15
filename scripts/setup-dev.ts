import { execShPromise, prettyLog, writeFileFromString } from "./helpers";

import fs from "fs";
import { startTestValidator } from "./start-test-validator";

const scriptFiles = {
  syncProgramIds: "./scripts/sync-program-ids.ts",
  syncIDLs: "./scripts/sync-idls.ts",
  startTestValidator: "./scripts/start-test-validator.ts",
  ensureAllTestsPass: "./scripts/ensure-all-tests-pass.ts"
};

(async () => {
  if (!fs.existsSync("./logs")) {
    fs.mkdirSync("./logs");
  }

  if (!fs.existsSync("./logs/debug")) {
    fs.mkdirSync("./logs/debug");
  }

  if (!fs.existsSync("./logs/out")) {
    fs.mkdirSync("./logs/out");
  }

  if (fs.existsSync("./logs/debug/setup-dev.log")) {
    await writeFileFromString("./logs/debug/setup-dev.log", "", "setup-dev.ts");
  }

  // * Set network to Localnet
  prettyLog.info("👉 Switching network to localhost...");
  await execShPromise("solana config set --url localhost");

  // * Build program from scratch
  prettyLog.info("🏗️ Building program from scratch...");
  if (fs.existsSync("./target")) {
    fs.rmSync("./target", { force: true, recursive: true });
  }
  await execShPromise("anchor build");

  // * Sync program IDs
  prettyLog.info("🔄 Syncing program IDs...");
  await execShPromise(`ts-node ${scriptFiles.syncProgramIds}`);

  // * Make sure all tests pass
  prettyLog.info("🧪 Running all tests...");
  await execShPromise(`ts-node ${scriptFiles.ensureAllTestsPass}`);

  // * Rebuild program
  prettyLog.info("🔄 Re-building...");
  await execShPromise("anchor build");

  // * Startup solana-test-validator
  prettyLog.info("▶️ Starting test validator...");
  await startTestValidator(async () => {
    // * Deploy program
    prettyLog.info("🚀 Deploying program...");
    await execShPromise("anchor deploy");

    // * Copy IDL into app/src/api/idl.json
    prettyLog.info("👉 Syncing IDLs...");
    await execShPromise(`ts-node ${scriptFiles.syncIDLs}`);

    // * Kill solana-test-validator
    prettyLog.info("Killing test validator...");
    await execShPromise("killall solana-test-validator");
  });
})();
