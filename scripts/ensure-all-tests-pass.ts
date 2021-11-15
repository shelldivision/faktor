import execSh from "exec-sh";
import { prettyLog } from "./helpers";

const execShPromise = execSh.promise;

async function ensureAllTestsPass() {
  try {
    const testOut = await execShPromise("anchor test");
    const testLines = testOut.stdout.split("\n");

    if (
      testLines.some((line) => {
        return line.includes("failing");
      })
    ) {
      prettyLog.err("Failed on ensureAllTestsPass", {
        message: "One or more tests failed. Could not deploy program."
      });
      process.exit(1);
    }
    prettyLog.info("👌 All tests passed!");
  } catch (err) {
    prettyLog.err("Failed to ensure all tests pass", err);
    process.exit(1);
  }
}

ensureAllTestsPass();
