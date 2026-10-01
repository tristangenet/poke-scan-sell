import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
test("serveur : interface construite accessible et mode IA absent explicitement signalé", async () => {
  const child = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: "0",
      OPENAI_API_KEY: "",
      APP_ACCESS_TOKEN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const origin = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Serveur non démarré")),
        5000,
      );
      child.stdout.on("data", (data) => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) {
          clearTimeout(timer);
          resolve(match[0]);
        }
      });
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code) reject(new Error("Serveur arrêté"));
      });
    });
    const home = await fetch(origin);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Poke Scan Sell/);
    assert.equal((await fetch(origin + "/icon.svg")).status, 200);
    assert.deepEqual(await (await fetch(origin + "/api/capabilities")).json(), {
      vision: false,
      publication: false,
    });
    assert.equal(
      (
        await fetch(origin + "/api/vision", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        })
      ).status,
      503,
    );
    assert.equal((await fetch(origin + "/api/missing")).status, 404);
  } finally {
    child.kill();
  }
});
