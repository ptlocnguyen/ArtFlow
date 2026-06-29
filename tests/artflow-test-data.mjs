import { mkdir, rm, writeFile } from "node:fs/promises";
import { createArtflowFixture } from "./fixtures/artflow-test-state.mjs";

const command = process.argv.includes("--reset") ? "reset" : "write";

if (command === "reset") {
  await rm("test-artifacts", { recursive: true, force: true });
  console.log("Removed test-artifacts.");
  process.exit(0);
}

await mkdir("test-artifacts/data", { recursive: true });
await writeFile(
  "test-artifacts/data/artflow-test-state.json",
  JSON.stringify(createArtflowFixture(), null, 2),
  "utf8"
);
console.log("Wrote test-artifacts/data/artflow-test-state.json.");
