import { masterFilePaths } from "./constants";
import { prettyLog, readFileAsString, writeFileFromString } from "./helpers";

export const idlFilePaths = ["./app/src/api/idl.json"];

async function syncIDLs() {
  const idlData = await readFileAsString(masterFilePaths.idl, "syncIDLs");
  try {
    await writeFileFromString(idlFilePaths[0], idlData, "syncIDLs");
    prettyLog.info("✅ Synced IDLs!");
  } catch (err) {
    prettyLog.err("Failed to sync IDLs", err);
    process.exit(1);
  }
}

syncIDLs();
