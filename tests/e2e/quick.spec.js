import { test, expect } from "@playwright/test";

async function addPhotos(
  page,
  fields = { name: "Dracaufeu", number: "4/102" },
) {
  const image = await page.evaluate(({ name, number }) => {
    const c = document.createElement("canvas");
    c.width = 800;
    c.height = 1100;
    const x = c.getContext("2d");
    x.fillStyle = "white";
    x.fillRect(0, 0, 800, 1100);
    x.fillStyle = "black";
    x.font = "bold 60px Arial";
    x.fillText(name, 70, 100);
    x.font = "40px Arial";
    x.fillText(number, 70, 1000);
    return c.toDataURL("image/png").split(",")[1];
  }, fields);
  for (const side of ["front", "back"]) {
    await page.locator(`input[data-side="${side}"]`).setInputFiles({
      name: "carte.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
    await expect(
      page.getByAltText(
        side === "front" ? "Recto de la carte" : "Verso de la carte",
      ),
    ).toBeVisible();
  }
}
async function catalogue(page, ambiguous = false) {
  await page.route("https://api.tcgdex.net/**", (route) => {
    const id = route.request().url().split("/").pop();
    if (id === "sets")
      return route.fulfill({
        json: [
          { id: "base1", name: "Set de Base", cardCount: { official: 102 } },
          { id: "other", name: "Réédition", cardCount: { official: 102 } },
        ],
      });
    return route.fulfill({
      json:
        id === "cards"
          ? [
              { id: "base1-4", name: "Dracaufeu", localId: "4" },
              ...(ambiguous
                ? [{ id: "other-4", name: "Dracaufeu", localId: "4" }]
                : []),
            ]
          : {
              id,
              name: "Dracaufeu",
              localId: "4",
              set: { name: "Set de Base", cardCount: { official: 102 } },
              variants: { holo: true },
              pricing: { cardmarket: { trend: 50, updated: "2026-09-30" } },
            },
    });
  });
}
test("mode rapide : OCR, référence, prix et une validation sans champs Vinted ni emballage", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await catalogue(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Deux photos. Une annonce." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Préparer ma carte" }),
  ).toBeDisabled();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="set"]')).toHaveValue("Set de Base");
  await expect(page.locator('[data-field="variant"]')).toHaveValue("holo");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
  await page
    .getByRole("button", {
      name: "Utiliser cette tendance comme point de départ",
    })
    .click();
  await expect(page.locator('[data-field="price"]')).toHaveValue("50");
  await expect(
    page.locator('[data-field="vintedCondition"], [data-field="packaging"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator("#toast")).toContainText("état");
  await expect(page.locator('[data-field="title"]')).toHaveCount(0);
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator('[data-field="title"]')).toHaveValue(/Dracaufeu/);
  await expect(page.locator('[data-field="description"]')).toHaveValue(
    /Excellent/,
  );
  await expect(page.locator('[data-field="description"]')).not.toHaveValue(
    /Protection et expédition|État Vinted/,
  );
  await page.locator(".manual-tools > summary").click();
  await expect(
    page.getByRole("button", { name: "Télécharger le dossier ZIP" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Modifier les informations" }).click();
  await page.locator('[data-field="price"]').fill("45");
  await page.locator('[data-field="price"]').blur();
  await expect(
    page.getByRole("button", { name: "3 Annonce", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Remplir mon annonce sur Vinted" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/poke-quick-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Scanner", exact: true }).click();
  await page.getByRole("button", { name: "Options avancées" }).click();
  await page.getByRole("button", { name: "5 Annonce" }).click();
  await expect(
    page.locator('[data-field="vintedCondition"], [data-field="packaging"]'),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("une édition inconnue n’empêche pas de créer l’annonce à partir du nom et du numéro", async ({
  page,
}) => {
  test.setTimeout(60000);
  await catalogue(page, true);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator("#job-status")).toContainText(
    "vous pouvez préparer l’annonce",
    {
      timeout: 45000,
    },
  );
  await expect(page.locator(".candidate")).toHaveCount(0);
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="set"]')).toHaveValue("");
  await expect(page.locator('[data-field="variant"]')).toHaveValue("");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
  await expect(
    page.getByRole("button", {
      name: "Utiliser cette tendance comme point de départ",
    }),
  ).toHaveCount(0);
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page.locator('[data-field="price"]').fill("45");
  await page.locator('[data-field="price"]').blur();
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator('[data-field="title"]')).toHaveValue(
    "Pokémon Dracaufeu 4/102 — FR",
  );
  await expect(page.locator('[data-field="description"]')).not.toHaveValue(
    /Extension|Variante/,
  );
  await page.locator(".manual-tools > summary").click();
  await expect(
    page.getByRole("button", { name: "Télécharger le dossier ZIP" }),
  ).toBeEnabled();
});

test("mode IA configuré : identité et état proposés en une préparation", async ({
  page,
}) => {
  await catalogue(page);
  await page.route("**/api/vision", (route) =>
    route.fulfill({
      json: {
        name: "Dracaufeu",
        number: "4/102",
        set: "Set de Base",
        variant: "Holo illimité",
        condition: "EX",
        confidence: "medium",
        defects: ["Point blanc au dos"],
        warnings: [],
        photosSufficient: true,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.locator(".analysis-options > summary").click();
  await page.locator("#quick-ai").check();
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="condition"]')).toHaveValue("EX");
  await expect(page.locator('[data-field="variant"]')).toHaveValue(
    "Holo illimité",
  );
  await expect(page.locator('[data-field="defectNotes"]')).toHaveValue(
    "Point blanc au dos",
  );
  await expect(page.locator('[data-field="title"]')).toHaveCount(0);
});

test("plus de 24 références : l’extension cible la bonne carte sans charger les autres fiches", async ({
  page,
}) => {
  test.setTimeout(60000);
  const requests = [];
  const briefs = Array.from({ length: 30 }, (_, i) => ({
    id: `series${i}-4`,
    name: "Dracaufeu",
    localId: "4",
  }));
  const sets = Array.from({ length: 30 }, (_, i) => ({
    id: `series${i}`,
    name: `Extension ${i}`,
    cardCount: { official: i === 28 ? 102 : 200 + i },
  }));
  let selectedCalls = 0;
  await page.route("https://api.tcgdex.net/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(path);
    if (path.endsWith("/sets")) return route.fulfill({ json: sets });
    if (path.endsWith("/cards")) return route.fulfill({ json: briefs });
    if (path.endsWith("/cards/series28-4")) {
      selectedCalls++;
      if (selectedCalls === 1)
        return route.fulfill({ status: 503, json: { error: "Temporaire" } });
      return route.fulfill({
        json: { ...briefs[28], set: sets[28], variants: { holo: true } },
      });
    }
    return route.fulfill({
      status: 500,
      json: { error: "Fiche hors de la bonne extension" },
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="set"]')).toHaveValue("Extension 28", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  expect(selectedCalls).toBe(2);
  expect(requests.filter((path) => path.includes("/cards/"))).toEqual([
    "/v2/fr/cards/series28-4",
    "/v2/fr/cards/series28-4",
  ]);
});

test("fiche détaillée indisponible : identité conservée, prix et variante laissés vides", async ({
  page,
}) => {
  test.setTimeout(60000);
  const set = {
    id: "base1",
    name: "Set de Base",
    cardCount: { official: 102 },
  };
  await page.route("https://api.tcgdex.net/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/sets")) return route.fulfill({ json: [set] });
    if (path.endsWith("/cards"))
      return route.fulfill({
        json: [{ id: "base1-4", name: "Dracaufeu", localId: "4" }],
      });
    return route.fulfill({ status: 404, json: { error: "Fiche absente" } });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="set"]')).toHaveValue("Set de Base", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
  await expect(page.locator('[data-field="variant"]')).toHaveValue("");
  await expect(page.locator("#job-status")).toContainText(
    "variantes et le prix",
  );
});

test("lecture partielle : le nom reste rempli après les tentatives automatiques et le champ manquant est indiqué", async ({
  page,
}) => {
  test.setTimeout(60000);
  await catalogue(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page, { name: "Dracaufeu", number: "" });
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator("#job-status")).toContainText(
    "numéro reste illisible",
    { timeout: 45000 },
  );
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("");
  await page
    .getByText("Voir le texte lu sur la photo", { exact: true })
    .click();
  await expect(page.locator("pre")).toContainText("Lecture agrandie du numéro");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
});

test("numéro non retrouvé : le nom et le numéro lus sont conservés sans prix d’une autre carte", async ({
  page,
}) => {
  test.setTimeout(60000);
  await catalogue(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page, { name: "Dracaufeu", number: "5/102" });
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator("#job-status")).toContainText(
    "Référence exacte non retrouvée",
    { timeout: 45000 },
  );
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("5/102");
  await expect(page.locator('[data-field="set"]')).toHaveValue("");
  await expect(page.locator('[data-field="price"]')).toHaveValue("");
});

test("sous-série TG : reconnaissance réelle et numéro imprimé conservé", async ({
  page,
}) => {
  test.setTimeout(60000);
  const card = {
    id: "subset-TG01",
    name: "Mew",
    localId: "TG01",
    set: { id: "subset", name: "Test", cardCount: { official: 185 } },
  };
  await page.route("https://api.tcgdex.net/**", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/sets")
        ? [card.set]
        : route.request().url().endsWith("/cards")
          ? [card]
          : card,
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page, { name: "Mew", number: "TG01/TG30" });
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Mew", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="number"]')).toHaveValue("TG01/TG30");
  await expect(page.locator('[data-field="set"]')).toHaveValue("Test");
});

test("une analyse IA lisant le nom et le numéro reste exploitable sans fiche catalogue", async ({
  page,
}) => {
  await page.route("https://api.tcgdex.net/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/vision", (route) =>
    route.fulfill({
      json: {
        name: "Dracaufeu",
        number: "4/102",
        set: "",
        variant: "",
        condition: "EX",
        confidence: "medium",
        defects: [],
        warnings: [],
        photosSufficient: true,
      },
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page);
  await page.locator(".analysis-options > summary").click();
  await page.locator("#quick-ai").check();
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator("#job-status")).toContainText("Nom et numéro lus");
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu");
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="condition"]')).toHaveValue("EX");
});

test("séparateur non lu : le numéro est restauré par le nom et le total catalogue concordants", async ({
  page,
}) => {
  test.setTimeout(60000);
  await catalogue(page);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Ajouter une carte", exact: true })
    .first()
    .click();
  await addPhotos(page, { name: "Dracaufeu", number: "4102" });
  await page.getByRole("button", { name: "Préparer ma carte" }).click();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Dracaufeu", {
    timeout: 45000,
  });
  await expect(page.locator('[data-field="number"]')).toHaveValue("4/102");
  await expect(page.locator('[data-field="set"]')).toHaveValue("Set de Base");
});
