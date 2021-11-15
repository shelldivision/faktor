import execSh from "exec-sh";
export const execShPromise = execSh.promise;

export const prettyLog = {
  info: (msg: string, args?: object | string[]) => {
    console.log(`\n[INFO] %s\n`, msg);
    if (args) {
      console.log("Args: %o\n", { args });
    }
  },
  debug: (fnName: string, callee: string, args: object) => {
    process.env.DEBUG_SETUP_DEV &&
      console.log(`\n[DEBUG] Called %s from %s with args:\n%o`, fnName, callee, args);
  },
  err: (msg: string, err: unknown) => {
    if (typeof err === "object") {
      console.log(`\n[ERROR] %s:\n`, msg, "Details: %o", err);
    }
  }
};

import fsPromises from "fs/promises";

export async function readFileAsString(path: string, callee: string): Promise<string> {
  prettyLog.debug("readFileAsString", callee, { path });
  try {
    const res = await fsPromises.readFile(path).then((buf) => buf.toString());
    return res;
  } catch (err) {
    prettyLog.err(`Failed on readFileAsString`, err);
    process.exit(1);
  }
}

export async function writeFileFromString(
  path: string,
  content: string,
  callee: string
): Promise<void> {
  prettyLog.debug("writeFileFromString", callee, { path, content });
  try {
    await fsPromises.writeFile(path, content);
  } catch (err) {
    prettyLog.err(`Failed on writeFileFromString`, err);
    process.exit(1);
  }
}
