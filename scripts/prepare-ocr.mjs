import { mkdir, copyFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const modules = path.join(root, "node_modules"),
  destination = path.join(root, "public", "ocr");
await mkdir(destination, { recursive: true });
await copyFile(
  path.join(modules, "tesseract.js", "dist", "worker.min.js"),
  path.join(destination, "worker.min.js"),
);
await copyFile(
  path.join(modules, "tesseract.js", "dist", "worker.min.js.LICENSE.txt"),
  path.join(destination, "worker.LICENSE.txt"),
);
const core = path.join(modules, "tesseract.js-core");
for (const filename of await readdir(core)) {
  if (/lstm\.wasm(\.js)?$/.test(filename) || filename === "LICENSE")
    await copyFile(path.join(core, filename), path.join(destination, filename));
}
for (const lang of ["fra", "eng"])
  await copyFile(
    path.join(
      modules,
      "@tesseract.js-data",
      lang,
      "4.0.0_best_int",
      `${lang}.traineddata.gz`,
    ),
    path.join(destination, `${lang}.traineddata.gz`),
  );
console.log(
  "OCR : moteur et modèles français/anglais prêts, servis localement.",
);
