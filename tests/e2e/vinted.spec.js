import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
const script = await readFile(
  new URL("../../extensions/vinted/content.js", import.meta.url),
  "utf8",
);
import { data, draft, fixture, readyCard } from "./support/vinted-fixture.js";
async function controlForm(page, setup = () => {}, setupArg) {
  await page.route("https://www.vinted.fr/items/new", (route) =>
    route.fulfill({ contentType: "text/html", body: fixture }),
  );
  await page.goto("https://www.vinted.fr/items/new");
  await page.evaluate(
    ({ draft, data }) => {
      window.reports = [];
      window.photoReads = 0;
      const attach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (options) {
        const root = attach.call(this, options);
        if (this.id === "poke-scan-sell-helper") window.helperRoot = root;
        return root;
      };
      window.chrome = window.chrome || {};
      window.chrome.runtime = {
        sendMessage(message, reply) {
          if (message.type === "read-draft")
            return reply({
              ok: true,
              id: "test-transfer",
              draft,
              previous: window.photosSubmitted
                ? { photosSubmitted: true }
                : null,
            });
          if (message.type === "read-photo") {
            window.photoReads++;
            return reply({ ok: true, data });
          }
          if (message.type === "photos-submitted") {
            window.photosSubmitted = true;
            return reply({ ok: true });
          }
          if (message.type === "report") {
            window.reports.push(message);
            return reply({ ok: true });
          }
          reply({ ok: false });
        },
      };
    },
    { draft, data },
  );
  await page.evaluate(setup, setupArg);
  await page.addScriptTag({ content: script });
}
test("Vinted : texte corrigé, prix décimal, état, catégorie et photos originaux transférés sans publier", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await controlForm(page);
  await expect(page.locator("#title")).toHaveValue(draft.title);
  await expect(page.locator("#description")).toHaveValue(draft.description);
  await expect(page.locator("#price")).toHaveValue("12,25");
  await expect(page.locator("#catalog_id")).toHaveValue("cards");
  await expect(page.locator("#status_id")).toHaveValue("very-good");
  await expect(page.locator("#photo-result")).toHaveText("2 photos reçues");
  await expect.poll(() => page.evaluate(() => window.reports.length)).toBe(1);
  const actual = await page.evaluate(() => ({
    photos: window.uploadedPhotos,
    state: window.formState,
    reports: window.reports,
    published: window.published,
  }));
  expect(actual.photos.map((p) => p.name)).toEqual([
    "1-front.png",
    "2-back.png",
  ]);
  expect(Buffer.from(actual.photos[0].bytes).toString("base64")).toBe(
    data.split(",")[1],
  );
  expect(actual.state.title).toBe(draft.title);
  expect(actual.reports[0].status).toBe("filled");
  expect(actual.reports[0].missing).toEqual(["parcel"]);
  expect(actual.published).toBe(0);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "/tmp/poke-vinted-control.png",
    fullPage: true,
  });
});
test("Vinted : un brouillon existant est conservé et aucun doublon de photos n’est ajouté", async ({
  page,
}) => {
  await controlForm(page, () => {
    document.querySelector("#title").value = "Mon autre article";
  });
  await expect.poll(() => page.evaluate(() => window.reports.length)).toBe(1);
  await expect(page.locator("#title")).toHaveValue("Mon autre article");
  await expect(page.locator("#description")).toHaveValue("");
  expect(await page.evaluate(() => window.uploadedPhotos || [])).toEqual([]);
  expect(await page.evaluate(() => window.reports[0].status)).toBe("blocked");
});
test("Vinted : repérage par libellés, prix numérique et attributs inconnus signalés", async ({
  page,
}) => {
  await controlForm(page, () => {
    for (const id of ["title", "description", "price"]) {
      document.querySelector(`[for="${id}"]`).htmlFor = `custom-${id}`;
      document.getElementById(id).id = `custom-${id}`;
    }
    document.querySelector("#custom-price").type = "number";
    document.querySelector("#custom-price").step = "0.01";
    document.querySelector("#custom-price").value = "0";
    document.querySelector("#catalog_id").remove();
    document.querySelector("#status_id").remove();
  });
  await expect(page.locator("#custom-title")).toHaveValue(draft.title);
  await expect(page.locator("#custom-price")).toHaveValue("12.25");
  await expect.poll(() => page.evaluate(() => window.reports.length)).toBe(1);
  expect(await page.evaluate(() => window.reports[0].missing)).toEqual([
    "category",
    "condition",
    "parcel",
  ]);
});

for (const format of ["dot", "comma", "number", "fallback", "plain"]) {
  test(`Vinted : prix exact et validé avec le format ${format}`, async ({
    page,
  }) => {
    await controlForm(
      page,
      (format) => {
        const input = document.getElementById("price");
        input.placeholder = ["comma", "fallback"].includes(format)
          ? "0,00"
          : format === "plain"
            ? ""
            : "0.00";
        if (format === "dot") input.pattern = "[0-9]+(?:\\.[0-9]{1,2})?";
        if (format === "comma") input.pattern = "[0-9]+(?:,[0-9]{1,2})?";
        if (format === "number") {
          input.type = "number";
          input.step = "0.01";
        }
        input.addEventListener("blur", () => {
          if (format === "fallback" && input.value) {
            // A controlled money field can normalize a comma to an incorrect integer.
            input.value = String(parseFloat(input.value));
          }
          window.priceCommitted =
            input.validity.valid && input.value
              ? format === "plain"
                ? parseFloat(input.value)
                : Number(input.value.replace(",", "."))
              : null;
        });
      },
      format,
    );
    await expect(page.locator("#price")).toHaveValue(
      format === "comma" ? "12,25" : "12.25",
    );
    await expect
      .poll(() => page.evaluate(() => window.priceCommitted))
      .toBe(draft.price);
    expect(
      await page.evaluate(
        () => document.getElementById("price").validity.valid,
      ),
    ).toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
      .toBe("filled");
    expect(await page.evaluate(() => window.published)).toBe(0);
  });
}

test("Vinted : prix dans un composant avec titre de section, suffixe field/input et devise", async ({
  page,
}) => {
  await controlForm(page, () => {
    const input = document.getElementById("price");
    document.querySelector('[for="price"]').remove();
    const section = document.createElement("section");
    section.innerHTML = "<h4>Prix</h4><div><span>€</span></div>";
    input.before(section);
    section.querySelector("div").append(input);
    input.id = "amount-control";
    input.setAttribute("data-testid", "price-field--input");
    input.inputMode = "numeric";
    input.placeholder = "0.00 €";
    input.pattern = "[0-9]+(?:\\.[0-9]{1,2})?";
  });
  await expect(page.locator("#amount-control")).toHaveValue("12.25");
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("filled");
});

test("Vinted : prix refusé jamais annoncé comme rempli et montant erroné retiré", async ({
  page,
}) => {
  await controlForm(page, () => {
    const input = document.getElementById("price");
    input.placeholder = "0.00";
    input.pattern = "[0-9]+";
    input.addEventListener("blur", () => {
      if (input.value)
        input.value = String(Math.trunc(Number(input.value.replace(",", "."))));
    });
  });
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("partial");
  expect(await page.evaluate(() => window.reports.at(-1).missing)).toContain(
    "price",
  );
  await expect(page.locator("#price")).toHaveValue("");
  await expect(page.locator("#title")).toHaveValue(draft.title);
  await expect(page.locator("#photo-result")).toHaveText("2 photos reçues");
});

test("Vinted : un prix déjà saisi pour un autre brouillon est conservé", async ({
  page,
}) => {
  await controlForm(page, () => {
    document.getElementById("price").value = "7,00";
  });
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("blocked");
  await expect(page.locator("#price")).toHaveValue("7,00");
  await expect(page.locator("#title")).toHaveValue("");
  expect(await page.evaluate(() => window.photoReads)).toBe(0);
});

test("Vinted : une saisie utilisateur pendant la validation du prix est conservée", async ({
  page,
}) => {
  await controlForm(page, () => {
    const input = document.getElementById("price");
    input.placeholder = "0.00";
    input.pattern = "[0-9]+(?:\\.[0-9]{1,2})?";
  });
  await expect(page.locator("#price")).toHaveValue("12.25");
  await page.locator("#price").fill("17.00");
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("partial");
  await expect(page.locator("#price")).toHaveValue("17.00");
  expect(await page.evaluate(() => window.reports.at(-1).missing)).toContain(
    "price",
  );
  expect(
    await page.evaluate(
      () => window.helperRoot.querySelector('[role="status"]').textContent,
    ),
  ).toContain("votre saisie");
});

test("application : extension absente, installation guidée et ZIP associé uniquement à cette adresse", async ({
  page,
}) => {
  await readyCard(page);
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-install")).toHaveAttribute("open", "");
  const event = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Télécharger l’extension Chrome / Edge" })
    .click();
  const download = await event;
  const chunks = [];
  for await (const chunk of await download.createReadStream())
    chunks.push(chunk);
  const files = await JSZip.loadAsync(Buffer.concat(chunks));
  const prefix = "poke-scan-sell-vinted/";
  const config = JSON.parse(
    await files.file(prefix + "config.json").async("text"),
  );
  const manifest = JSON.parse(
    await files.file(prefix + "manifest.json").async("text"),
  );
  expect(config.appOrigin).toBe("http://127.0.0.1:5173");
  expect(manifest.externally_connectable.matches).toEqual([
    "http://127.0.0.1/*",
  ]);
  expect(files.file(prefix + "background.js")).not.toBeNull();
  expect(files.file(prefix + "content.js")).not.toBeNull();
  expect(manifest.permissions).not.toContain("cookies");
});
test("application : un clic transmet texte et photos, puis une modification bloque le nouveau transfert", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sent = [];
    window.chrome = window.chrome || {};
    window.chrome.runtime = {
      sendMessage(id, message, reply) {
        window.sent.push(message);
        if (message.type === "ping")
          return reply({ ok: true, protocol: 1, version: "0.2.8" });
        if (message.type === "prepare")
          return reply({ ok: true, id: "transfer" });
        if (message.type === "status")
          return reply({ ok: true, status: "filled" });
        reply({ ok: true, id: "transfer" });
      },
    };
  });
  await readyCard(page);
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-transfer-status")).toContainText(
    "Annonce envoyée",
  );
  const actual = await page.evaluate(() =>
    window.sent.filter((m) => m.type !== "ping"),
  );
  expect(actual.map((m) => m.type)).toEqual([
    "prepare",
    "photo",
    "photo",
    "commit",
  ]);
  expect(actual[0].draft.description).toBe(
    "Description personnalisée pour Vinted.",
  );
  expect(actual[0].draft.photos.map((p) => p.side)).toEqual(["front", "back"]);
  expect(actual[1].data).toBe(data);
  await page.locator('[data-field="price"]').fill("15");
  await page.locator('[data-field="price"]').blur();
  await expect(
    page.getByRole("button", { name: "Remplir mon annonce sur Vinted" }),
  ).toBeDisabled();
});

test("Vinted : libellés de conteneur, noms entre crochets et prix avec placeholder, sans toucher la recherche", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await controlForm(page, () => {
    for (const name of ["title", "description", "price"]) {
      const input = document.getElementById(name);
      const label = document.querySelector(`[for="${name}"]`);
      const section = document.createElement("section");
      label.removeAttribute("for");
      input.id = `x-${name}`;
      input.removeAttribute("name");
      input.before(section);
      section.append(label, input);
      if (name === "title") {
        input.setAttribute("aria-label", "Saisie");
        label.textContent = "Titre de l’article * (100 caractères maximum)";
      } else if (name === "description") {
        label.textContent = "Informations";
        input.name = "item[description]";
      } else {
        label.textContent = "Montant demandé";
        input.placeholder = "0,00 €";
        section.setAttribute("data-testid", "item-upload-price-field");
      }
    }
    const header = document.createElement("header");
    header.innerHTML =
      '<input id="title" aria-label="Titre" value="Mes recherches"><input type="search" aria-label="Description">';
    document.body.prepend(header);
  });
  await expect(page.locator("#x-title")).toHaveValue(draft.title);
  await expect(page.locator("#x-description")).toHaveValue(draft.description);
  await expect(
    page.locator('[data-testid="item-upload-price-field"] input'),
  ).toHaveValue("12,25");
  await expect(page.locator("header #title")).toHaveValue("Mes recherches");
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("filled");
  expect(errors).toEqual([]);
});

test("Vinted : les photos débloquent des champs désactivés et le prix apparaît plus tard", async ({
  page,
}) => {
  await controlForm(page, () => {
    for (const id of ["title", "description", "price"])
      document.getElementById(id).disabled = true;
    const price = document.getElementById("price");
    price.remove();
    document.getElementById("images").addEventListener("change", () => {
      document.getElementById("title").disabled = false;
      document.getElementById("description").disabled = false;
      setTimeout(() => {
        price.disabled = false;
        document.querySelector("form").append(price);
      }, 400);
    });
  });
  await expect(page.locator("#photo-result")).toHaveText("2 photos reçues");
  await expect(page.locator("#title")).toHaveValue(draft.title);
  await expect(page.locator("#price")).toHaveValue("12,25");
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("filled");
  expect(await page.evaluate(() => window.photoReads)).toBe(2);
});

test("Vinted : un prix ambigu laisse les autres champs remplis, diagnostic sans valeurs et reprise sans doublon", async ({
  page,
}) => {
  test.setTimeout(40000);
  await controlForm(page, () => {
    const other = document.createElement("input");
    other.id = "second-price";
    other.name = "price";
    other.setAttribute("aria-label", "Prix");
    document.querySelector("form").append(other);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.diagnostic = text;
        },
      },
    });
  });
  await expect(page.locator("#title")).toHaveValue(draft.title);
  await expect(page.locator("#description")).toHaveValue(draft.description);
  await expect(page.locator("#photo-result")).toHaveText("2 photos reçues");
  await expect(page.locator("#price")).toHaveValue("");
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status), {
      timeout: 25000,
    })
    .toBe("partial");
  expect(await page.evaluate(() => window.reports.at(-1).missing)).toContain(
    "price",
  );
  expect(
    await page.evaluate(
      () => window.helperRoot.querySelector('[role="status"]').textContent,
    ),
  ).toContain("prix");
  await page.evaluate(() =>
    [...window.helperRoot.querySelectorAll("button")]
      .find((b) => b.textContent === "Copier le diagnostic")
      .click(),
  );
  const diagnostic = await page.evaluate(() => window.diagnostic);
  expect(JSON.parse(diagnostic).found.price).toBe(false);
  expect(diagnostic).not.toContain(draft.title);
  expect(diagnostic).not.toContain(draft.description);
  expect(diagnostic).not.toContain(data);
  await page.evaluate(() => {
    document.getElementById("second-price").remove();
    [...window.helperRoot.querySelectorAll("button")]
      .find((b) => b.textContent === "Reprendre le remplissage")
      .click();
  });
  await expect(page.locator("#price")).toHaveValue("12,25");
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("filled");
  expect(await page.evaluate(() => window.photoReads)).toBe(2);
  expect(await page.evaluate(() => window.published)).toBe(0);
});

test("Vinted : un message photo sans réponse finit en erreur explicite et conserve les champs remplis", async ({
  page,
}) => {
  await page.clock.install();
  await controlForm(page, () => {
    const send = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = (message, reply) => {
      if (message.type === "read-photo") {
        window.waitingPhoto = true;
        return;
      }
      send(message, reply);
    };
  });
  await expect.poll(() => page.evaluate(() => window.waitingPhoto)).toBe(true);
  await page.clock.fastForward(30100);
  await expect
    .poll(() => page.evaluate(() => window.reports.at(-1)?.status))
    .toBe("partial");
  expect(
    await page.evaluate(
      () => window.helperRoot.querySelector('[role="status"]').textContent,
    ),
  ).toContain("ne répond plus");
  await expect(page.locator("#title")).toHaveValue(draft.title);
  expect(await page.evaluate(() => window.reports.at(-1).photosSubmitted)).toBe(
    false,
  );
});

test("application : un ancien compagnon demande la mise à jour et aucun transfert n’est envoyé", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.sent = [];
    window.chrome = window.chrome || {};
    window.chrome.runtime = {
      sendMessage(id, message, reply) {
        window.sent.push(message);
        reply({ ok: true, protocol: 1, version: "0.2.6" });
      },
    };
  });
  await readyCard(page);
  await expect(page.locator("#vinted-connection-status")).toContainText(
    "mise à jour nécessaire",
  );
  await page
    .getByRole("button", { name: "Remplir mon annonce sur Vinted" })
    .click();
  await expect(page.locator("#vinted-install")).toHaveAttribute("open", "");
  await expect(page.locator("#vinted-install")).toContainText("Recharger");
  expect(
    await page.evaluate(() => window.sent.every((m) => m.type === "ping")),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/poke-vinted-update.png",
    fullPage: true,
  });
});
