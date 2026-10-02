import {
  PROTOCOL,
  VINTED_URL,
  TRANSFER_TTL,
  isAppSender,
  isVinted,
  isCreatePage,
  validateDraft,
  validatePhoto,
} from "./protocol.js";

const settings = fetch(chrome.runtime.getURL("config.json")).then((r) =>
  r.json(),
);
let database;
const opening = new Map();
function db() {
  return (database ||= new Promise((resolve, reject) => {
    const request = indexedDB.open("poke-scan-sell-vinted", 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore("transfers", {
        keyPath: "id",
      });
      store.createIndex("tabId", "tabId", { unique: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}
async function transaction(mode, action) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("transfers", mode);
    let value;
    action(tx.objectStore("transfers"), (v) => {
      value = v;
    });
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Transfert interrompu."));
  });
}
const get = (id) =>
  transaction("readonly", (s, done) => {
    s.get(id).onsuccess = (e) => done(e.target.result);
  });
const byTab = (id) =>
  transaction("readonly", (s, done) => {
    s.index("tabId").get(id).onsuccess = (e) => done(e.target.result);
  });
const put = (record) => transaction("readwrite", (s) => s.put(record));
const remove = (id) => transaction("readwrite", (s) => s.delete(id));
const all = () =>
  transaction("readonly", (s, done) => {
    s.getAll().onsuccess = (e) => done(e.target.result);
  });
async function cleanup() {
  for (const r of await all())
    if (r.expiresAt <= Date.now()) await remove(r.id);
}
async function appRecord(id) {
  const r = await get(id);
  if (!r || r.expiresAt <= Date.now()) {
    if (r) await remove(id);
    throw new Error("Le transfert a expiré. Relancez-le depuis l’application.");
  }
  return r;
}
async function open(record) {
  if (record.tabId !== undefined) {
    await chrome.tabs.update(record.tabId, { active: true });
    return { ok: true, id: record.id };
  }
  const tab = await chrome.tabs.create({ url: "about:blank", active: true });
  try {
    record.tabId = tab.id;
    record.status = "opening";
    await put(record);
    await chrome.tabs.update(tab.id, { url: VINTED_URL });
    return { ok: true, id: record.id };
  } catch (e) {
    await chrome.tabs.remove(tab.id).catch(() => {});
    await remove(record.id);
    throw e;
  }
}
export async function handleApp(message, sender) {
  const config = await settings;
  if (!isAppSender(sender, config.appOrigin) || message?.protocol !== PROTOCOL)
    throw new Error("Application non associée à cette extension.");
  if (message.type === "ping")
    return {
      ok: true,
      protocol: PROTOCOL,
      version: chrome.runtime.getManifest().version,
    };
  if (message.type === "prepare") {
    await cleanup();
    if ((await all()).filter((r) => r.draft).length >= 4)
      throw new Error(
        "Quatre transferts sont déjà en attente. Terminez-les avant de continuer.",
      );
    const draft = validateDraft(message.draft);
    const id = crypto.randomUUID();
    await put({
      id,
      draft,
      files: [],
      status: "staging",
      expiresAt: Date.now() + TRANSFER_TTL,
    });
    return { ok: true, id };
  }
  const record = await appRecord(message.id);
  if (message.type === "photo") {
    if (
      record.status !== "staging" ||
      !Number.isInteger(message.index) ||
      !record.draft.photos[message.index]
    )
      throw new Error("Transfert photo non reconnu.");
    record.files[message.index] = validatePhoto(
      message.data,
      record.draft.photos[message.index].type,
    );
    await put(record);
    return { ok: true };
  }
  if (message.type === "commit") {
    if (!record.draft || !record.draft.photos.every((_, i) => record.files[i]))
      throw new Error("Le transfert des photos est incomplet.");
    if (!opening.has(record.id))
      opening.set(
        record.id,
        open(record).finally(() => opening.delete(record.id)),
      );
    return opening.get(record.id);
  }
  if (message.type === "status")
    return {
      ok: true,
      id: record.id,
      status: record.status,
      result: record.result || null,
    };
  if (message.type === "cancel") {
    if (record.tabId === undefined) await remove(record.id);
    return { ok: true };
  }
  throw new Error("Commande non reconnue.");
}

export async function handleVinted(message, sender) {
  if (sender.id !== chrome.runtime.id || !sender.tab || !isVinted(sender.url))
    throw new Error("Onglet Vinted non reconnu.");
  const record = await byTab(sender.tab.id);
  if (!record || record.expiresAt <= Date.now()) {
    if (record) await remove(record.id);
    return { ok: true, draft: null };
  }
  if (message.type === "read-draft") {
    if (!isCreatePage(sender.url))
      return { ok: true, waitingForLogin: true, draft: null };
    if (!record.draft)
      return { ok: true, draft: null, result: record.result || null };
    return {
      ok: true,
      id: record.id,
      draft: record.draft,
      previous: record.result || null,
    };
  }
  if (
    message.type === "read-photo" &&
    message.id === record.id &&
    isCreatePage(sender.url)
  ) {
    if (
      !record.draft ||
      !Number.isInteger(message.index) ||
      !record.files[message.index]
    )
      throw new Error("Photo non reconnue.");
    return { ok: true, data: record.files[message.index] };
  }
  if (
    message.type === "photos-submitted" &&
    message.id === record.id &&
    isCreatePage(sender.url)
  ) {
    record.result = {
      fields: record.result?.fields || [],
      missing: record.result?.missing || [
        "title",
        "description",
        "price",
        "category",
        "condition",
        "parcel",
      ],
      photosSubmitted: true,
    };
    await put(record);
    return { ok: true };
  }
  if (
    message.type === "report" &&
    message.id === record.id &&
    isCreatePage(sender.url)
  ) {
    if (!["filled", "partial", "blocked"].includes(message.status))
      throw new Error("Résultat non reconnu.");
    const result = {
      fields: (Array.isArray(message.fields) ? message.fields : []).filter(
        (x) =>
          ["title", "description", "price", "category", "condition"].includes(
            x,
          ),
      ),
      photosSubmitted: message.photosSubmitted === true,
      missing: (Array.isArray(message.missing) ? message.missing : []).filter(
        (x) =>
          [
            "title",
            "description",
            "price",
            "photos",
            "category",
            "condition",
            "parcel",
          ].includes(x),
      ),
    };
    record.status = message.status;
    record.result = result;
    // Originals are removed as soon as the form has received them and the text.
    if (message.status === "filled") {
      record.draft = null;
      record.files = [];
    }
    await put(record);
    return { ok: true };
  }
  throw new Error("Commande Vinted non reconnue.");
}

const respond = (handler) => (message, sender, reply) => {
  handler(message, sender).then(reply, (e) =>
    reply({ ok: false, error: e.message || "Transfert indisponible." }),
  );
  return true;
};
chrome.runtime.onMessageExternal.addListener(respond(handleApp));
chrome.runtime.onMessage.addListener(respond(handleVinted));
chrome.tabs.onRemoved.addListener((id) => {
  byTab(id)
    .then((r) => r && remove(r.id))
    .catch(() => {});
});
chrome.alarms.create("purge-transfers", { periodInMinutes: 5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "purge-transfers") cleanup().catch(() => {});
});
cleanup().catch(() => {});
