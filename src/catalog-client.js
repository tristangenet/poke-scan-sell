const API = "https://api.tcgdex.net/v2";

export class CatalogueError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

export function createCatalogueClient({
  fetcher = fetch,
  pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const cache = new Map();
  const pending = new Map();
  async function request(path) {
    let failure;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetcher(API + path, {
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok)
          throw new CatalogueError(
            `Le catalogue répond avec une erreur HTTP ${response.status}.`,
            response.status,
          );
        return await response.json();
      } catch (error) {
        failure = error;
        if (error.status && error.status !== 429 && error.status < 500) break;
        if (attempt < 2) await pause(300 * (attempt + 1));
      }
    }
    throw failure instanceof CatalogueError
      ? failure
      : new CatalogueError(
          "La connexion au catalogue a échoué. Vérifiez votre connexion et relancez la préparation.",
        );
  }
  return {
    async get(path, { refresh = false } = {}) {
      const cached = cache.get(path);
      if (!refresh && cached && Date.now() - cached.at < 300000)
        return structuredClone(cached.data);
      if (!pending.has(path)) {
        const promise = request(path)
          .then((data) => {
            cache.set(path, { at: Date.now(), data });
            return data;
          })
          .finally(() => pending.delete(path));
        pending.set(path, promise);
      }
      return structuredClone(await pending.get(path));
    },
  };
}

// Limit simultaneous detail requests so a broad name search does not flood the API.
export async function settleLimited(items, task, limit = 3) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        try {
          results[index] = {
            status: "fulfilled",
            value: await task(items[index]),
          };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}
