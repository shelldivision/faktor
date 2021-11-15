import execSh from "exec-sh";

import { prettyLog, readFileAsString } from "./helpers";

export const outFiles = {
  solanaTestValidator: "./logs/out/solana-test-validator-out.log"
};

const execShPromise = execSh.promise;

/**
 * Starts solana-test-validator in the background
 */
export async function startTestValidator(onReady: () => any) {
  try {
    execSh(`solana-test-validator -r > ${outFiles.solanaTestValidator}`);

    await execShPromise("sleep 3");

    // * Makes sure solana-test-validator is ready
    const lines = await readFileAsString(outFiles.solanaTestValidator, "startTestValidator").then(
      (txt) => txt.split("\n")
    );

    if (!lines.includes("JSON RPC URL: http://127.0.0.1:8899")) {
      prettyLog.err("Failed on startTestValidator", {
        message: "Tried to exit when solana-test-validator was not ready"
      });
      process.exit(1);
    }
    prettyLog.info("👌 Validator is ready for deployment");
    onReady();
  } catch (err) {
    prettyLog.err("Failed on startTestValidator", err);
    process.exit(1);
  }
}
