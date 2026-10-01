import manifestTemplate from "../extensions/vinted/manifest.json";
import background from "../extensions/vinted/background.js?raw";
import protocolSource from "../extensions/vinted/protocol.js?raw";
import content from "../extensions/vinted/content.js?raw";
import {
  EXTENSION_ID,
  PROTOCOL,
  validateDraft,
  validatePhoto,
} from "../extensions/vinted/protocol.js";
import { readyErrors, listingFingerprint } from "./domain.js";
import { download } from "./photos.js";

function request(message, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const runtime = globalThis.chrome?.runtime;
    if (!runtime?.sendMessage)
      return reject(
        new Error(
          "Activez l’extension Poke Scan Sell — Vinted dans Chrome ou Edge.",
        ),
      );
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "L’extension ne répond pas. Rechargez l’application après son activation.",
          ),
        ),
      timeout,
    );
    try {
      runtime.sendMessage(
        EXTENSION_ID,
        { ...message, protocol: PROTOCOL },
        (response) => {
          clearTimeout(timer);
          if (runtime.lastError || !response?.ok)
            return reject(
              new Error(
                response?.error ||
                  "Extension absente ou non associée à cette adresse. Téléchargez-la depuis cette application.",
              ),
            );
          resolve(response);
        },
      );
    } catch (e) {
      clearTimeout(timer);
      reject(e);
    }
  });
}
export async function checkVintedHelper() {
  try {
    const r = await request({ type: "ping" }, 1200);
    return r.protocol === PROTOCOL;
  } catch {
    return false;
  }
}
export function makeVintedDraft(card) {
  const errors = readyErrors(card);
  if (
    !card.title?.trim() ||
    !card.description?.trim() ||
    card.listingFingerprint !== listingFingerprint(card)
  )
    errors.push("Validez et actualisez l’annonce avant son transfert.");
  if (errors.length) throw new Error(errors.join(" "));
  const ordered = [...card.photos].sort(
    (a, b) =>
      ["front", "back", "detail"].indexOf(a.side) -
      ["front", "back", "detail"].indexOf(b.side),
  );
  const draft = validateDraft({ ...card, photos: ordered });
  const files = ordered.map((p) => validatePhoto(p.data, p.type));
  return { draft, files };
}
export async function sendToVinted(card, onProgress = () => {}) {
  const { draft, files } = makeVintedDraft(card);
  const prepared = await request({ type: "prepare", draft });
  try {
    for (let i = 0; i < files.length; i++) {
      onProgress(`Transfert de la photo ${i + 1} sur ${files.length}…`);
      await request(
        { type: "photo", id: prepared.id, index: i, data: files[i] },
        30000,
      );
    }
    onProgress("Ouverture du formulaire Vinted…");
    return await request({ type: "commit", id: prepared.id });
  } catch (e) {
    await request({ type: "cancel", id: prepared.id }).catch(() => {});
    throw e;
  }
}
export const getVintedStatus = (id) => request({ type: "status", id });

export async function downloadVintedExtension() {
  const { default: JSZip } = await import("jszip");
  const origin = location.origin;
  const url = new URL(origin);
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Adresse de l’application non reconnue.");
  const manifest = structuredClone(manifestTemplate);
  // The companion is paired only with the application that provided this ZIP.
  manifest.externally_connectable.matches = [
    `${url.protocol}//${url.hostname}/*`,
  ];
  const zip = new JSZip();
  const folder = zip.folder("poke-scan-sell-vinted");
  for (const [name, source] of Object.entries({
    "manifest.json": JSON.stringify(manifest, null, 2),
    "config.json": JSON.stringify({ appOrigin: origin }, null, 2),
    "background.js": background,
    "protocol.js": protocolSource,
    "content.js": content,
  }))
    folder.file(name, source);
  folder.file(
    "INSTALLATION.txt",
    "1. Décompressez ce dossier.\n2. Ouvrez chrome://extensions (ou edge://extensions).\n3. Activez le mode développeur.\n4. Cliquez sur Charger l’extension non empaquetée et sélectionnez poke-scan-sell-vinted.\n5. Rechargez Poke Scan Sell, puis cliquez sur Remplir mon annonce sur Vinted.\n\nL’extension est associée uniquement à : " +
      origin +
      "\nLes photos sont conservées temporairement dans ce navigateur, puis retirées après transfert ou expiration. Aucune connexion Vinted n’est demandée dans Poke Scan Sell. Vérifiez les champs et les photos sur Vinted avant de publier.\n",
  );
  download(
    await zip.generateAsync({ type: "blob" }),
    "poke-scan-sell-vinted.zip",
  );
}
