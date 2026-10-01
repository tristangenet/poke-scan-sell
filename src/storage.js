let dbPromise;
function db() {
  return (dbPromise ||= new Promise((resolve, reject) => {
    const r = indexedDB.open("poke-scan-sell", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("cards", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
async function transaction(mode, action) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("cards", mode),
      r = action(tx.objectStore("cards"));
    tx.oncomplete = () => resolve(r?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error("Sauvegarde interrompue"));
  });
}
export const listCards = () => transaction("readonly", (s) => s.getAll());
export const saveCard = (c) =>
  transaction("readwrite", (s) => s.put(structuredClone(c)));
export const deleteCard = (id) => transaction("readwrite", (s) => s.delete(id));
export async function importCards(cards) {
  return transaction("readwrite", (s) => {
    for (const c of cards) s.put(c);
  });
}
