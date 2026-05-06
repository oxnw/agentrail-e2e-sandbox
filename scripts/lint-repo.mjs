import { readFile } from "node:fs/promises";

const files = [
  new URL("../README.md", import.meta.url),
  new URL("../AGENTS.md", import.meta.url),
  new URL("../docs/scenarios.md", import.meta.url),
  new URL("../docs/architecture.md", import.meta.url),
];

for (const file of files) {
  const text = await readFile(file, "utf8");
  if (text.includes("\t")) {
    throw new Error(`Tabs are not allowed in ${file.pathname}.`);
  }
  if (!text.endsWith("\n")) {
    throw new Error(`File must end with newline: ${file.pathname}`);
  }
}

console.log(`Linted ${files.length} documentation files.`);
