import { execShPromise, prettyLog, readFileAsString, writeFileFromString } from "./helpers";

async function replaceAnchorTOML(newID: string) {
  const oldContent = await readFileAsString("./Anchor.toml", "replaceAnchorTOML");
  const newContent = oldContent.replace(/faktor = "(.*?)"/, `faktor = \"${newID}\"`);
  await writeFileFromString("./Anchor.toml", newContent, "replaceAnchorTOML");
}

async function updateNewIDFile() {
  const res = await execShPromise(
    "solana address -k ./target/deploy/faktor-keypair.json > ./scripts/out/new-id.txt"
  );
  if (res.stderr) {
    prettyLog.err(`updateNewIDFile`, { stderr: res.stderr });
  }
  console.log(res.stdout);
}

async function replaceRustEntrypoint(newId: string) {
  const oldContent = await readFileAsString(
    "./programs/faktor/src/lib.rs",
    "replaceRustEntrypoint"
  );

  const newContent = oldContent.replace(/declare_id\!\("(.*?)"\)/, `declare_id!(\"${newId}\")`);

  await writeFileFromString("./programs/faktor/src/lib.rs", newContent, "replaceRustEntrypoint");
}

async function syncProgramIDs() {
  try {
    await updateNewIDFile();
    const newId = await readFileAsString("./scripts/out/new-id.txt", "syncProgramIDs").then((res) =>
      res.trim()
    );
    console.log(`New program ID: ${newId}`);
    await Promise.all([replaceAnchorTOML(newId), replaceRustEntrypoint(newId)]);
    prettyLog.info("👌 Synced program IDs!");
  } catch (err) {
    prettyLog.err("Failed to sync program IDs", err);
    process.exit(1);
  }
}

syncProgramIDs();
