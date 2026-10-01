import { test } from "node:test";
import assert from "node:assert/strict";
import { createCatalogueClient, settleLimited } from "../src/catalog-client.js";

test("catalogue : reprise automatique après erreurs temporaires puis cache", async () => {
  let calls = 0;
  const client = createCatalogueClient({
    pause: async () => {},
    fetcher: async () => {
      calls++;
      return calls < 3
        ? new Response("", { status: calls === 1 ? 503 : 429 })
        : Response.json({ id: "base1-4" });
    },
  });
  assert.equal((await client.get("/fr/cards/base1-4")).id, "base1-4");
  assert.equal((await client.get("/fr/cards/base1-4")).id, "base1-4");
  assert.equal(calls, 3);
});

test("catalogue : un échec permanent n’est pas conservé dans le cache", async () => {
  let calls = 0;
  const client = createCatalogueClient({
    pause: async () => {},
    fetcher: async () => {
      calls++;
      return calls === 1
        ? new Response("", { status: 404 })
        : Response.json({ id: "base1-4" });
    },
  });
  await assert.rejects(client.get("/fr/cards/base1-4"), /404/);
  assert.equal((await client.get("/fr/cards/base1-4")).id, "base1-4");
  assert.equal(calls, 2);
});

test("catalogue : demandes simultanées dédupliquées et données isolées", async () => {
  let calls = 0;
  const client = createCatalogueClient({
    fetcher: async () => {
      calls++;
      return Response.json({ name: "Dracaufeu" });
    },
  });
  const [a, b] = await Promise.all([client.get("/same"), client.get("/same")]);
  a.name = "Modifié";
  assert.equal(b.name, "Dracaufeu");
  assert.equal(calls, 1);
});

test("catalogue : au plus trois requêtes simultanées, résultats et erreurs conservés", async () => {
  let active = 0,
    maximum = 0;
  const result = await settleLimited(
    Array.from({ length: 30 }, (_, i) => i),
    async (value) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setImmediate(resolve));
      active--;
      if (value === 4) throw new Error("Échec isolé");
      return value;
    },
  );
  assert.equal(maximum, 3);
  assert.equal(result.length, 30);
  assert.equal(result[4].status, "rejected");
  assert.equal(result[29].value, 29);
});

test("catalogue : une actualisation explicite contourne le cache", async () => {
  let calls = 0;
  const client = createCatalogueClient({
    fetcher: async () => Response.json({ price: ++calls }),
  });
  assert.equal((await client.get("/card")).price, 1);
  assert.equal((await client.get("/card")).price, 1);
  assert.equal((await client.get("/card", { refresh: true })).price, 2);
});
