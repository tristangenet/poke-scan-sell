import { currentCard, expectSaved } from "./support/app.js";
import { test, expect } from "@playwright/test";
import { data, readyCard } from "./support/vinted-fixture.js";

async function seedCollection(page) {
  await page.goto("/");
  const ids = await page.evaluate(async (image) => {
    const { newCard, generateListing, listingFingerprint } =
      await import("/src/domain.js");
    const { saveCard } = await import("/src/storage.js");
    const names = ["Évoli", "Pikachu", "Dracaufeu", "Mew", "Rondoudou"];
    const statuses = ["À vérifier", "Prête", "Publiée", "Vendue", "Archivée"];
    const ids = [];
    for (let i = 0; i < names.length; i++) {
      const card = Object.assign(newCard(), {
        name: names[i],
        number: `${i + 1}/102`,
        price: [5, 12, 40, 30, 8][i],
        condition: "EX",
        identityConfirmed: i > 0,
        conditionConfirmed: i > 0,
        status: statuses[i],
        updatedAt: new Date(Date.now() - i * 60000).toISOString(),
        photos: ["front", "back"].map((side) => ({
          id: side,
          side,
          type: "image/png",
          data: image,
        })),
      });
      if (i > 0) {
        Object.assign(card, generateListing(card));
        card.listingFingerprint = listingFingerprint(card);
      }
      await saveCard(card);
      ids.push(card.id);
    }
    return ids;
  }, data);
  await page.reload();
  return ids;
}

test("première utilisation : accès direct aux photos, menu retiré et un seul brouillon vide", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#stage-title")).toHaveText(
    "Deux photos. Une annonce.",
  );
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Navigation principale" }),
  ).toHaveCount(0);
  for (const name of [
    "Accueil",
    "Mes cartes",
    "Aide",
    "Paramètres",
    "Besoin d’aide ?",
  ])
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  await expect(
    page.getByText("Enregistré sur cet appareil", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".wizard-steps button")).toHaveCount(2);
  await page.getByRole("button", { name: "Scanner", exact: true }).click();
  const route = new URL(page.url()).hash;
  await expect(page.locator("#app")).not.toHaveAttribute("aria-busy", "true");
  await page.getByRole("button", { name: "Scanner", exact: true }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe(route);
  expect(
    await page.evaluate(
      async () => (await (await import("/src/storage.js")).listCards()).length,
    ),
  ).toBe(1);
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await skip.focus();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.reload();
  expect(new URL(page.url()).hash).toBe(route);
});

test("vérification : erreurs ciblées, sauvegarde silencieuse et défauts conservés sans champs d’édition", async ({
  page,
}) => {
  const [id] = await seedCollection(page);
  await page.goto(`/#/cards/${id}/review`);
  for (const field of ["name", "number", "price"])
    await page.locator(`[data-field="${field}"]`).fill("");
  await page.locator('[data-field="condition"]').selectOption("");
  await page.getByRole("button", { name: "Valider et remplir Vinted" }).click();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await expect(page.locator('[data-field="name"]')).toBeFocused();
  await page.locator('[data-field="name"]').fill("Évoli");
  await expectSaved(page, "name", "Évoli");
  await expect(page.locator('[data-field="name"]')).toBeFocused();
  await expect(page.locator("#save-status")).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Évoli");
  await page
    .getByText("Préciser les défauts de la carte", { exact: true })
    .click();
  await page.locator('[data-field="defectNotes"]').fill("Petit point blanc");
  await expectSaved(page, "defectNotes", "Petit point blanc");
  await expect(page.locator('[data-field="defectNotes"]')).toBeFocused();
  await expect(
    page.locator('[data-field="set"], [data-field="variant"]'),
  ).toHaveCount(0);
  await expect(
    page.getByText("Voir le texte lu sur la photo", { exact: true }),
  ).toHaveCount(0);
  await page.locator('[data-field="number"]').fill("1/102");
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page.locator('[data-field="price"]').fill("100001");
  await page.getByRole("button", { name: "Valider et remplir Vinted" }).click();
  await expect(page.locator("#error-price")).toContainText("100 000");
  await page.locator('[data-field="price"]').fill("12.25");
  await page.getByRole("button", { name: "Valider et remplir Vinted" }).click();
  await expect(page).toHaveURL(new RegExp(`${id}/review$`));
  await expect(page.locator("#vinted-install")).toHaveAttribute("open", "");
  expect((await currentCard(page)).title).toBe("Pokémon Évoli 1/102");
});

test("texte personnalisé conservé et navigation photos/vérification sans étape Annonce", async ({
  page,
}) => {
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await readyCard(page);
  const route = page.url();
  await page.locator(".edit-listing > summary").click();
  await page
    .locator('[data-field="description"]')
    .fill("Texte personnalisé, prêt à vendre.");
  await expectSaved(page, "description", "Texte personnalisé, prêt à vendre.");
  await page.getByRole("button", { name: "1 Photos", exact: true }).click();
  await page
    .getByRole("button", { name: "2 Vérification", exact: true })
    .click();
  await expect(page).toHaveURL(route);
  await page.getByRole("button", { name: "Valider et remplir Vinted" }).click();
  expect(dialogs).toBe(0);
  await expectSaved(page, "description", "Texte personnalisé, prêt à vendre.");
  await expect(page).toHaveURL(route);
  await page.goBack();
  await expect(page.locator("#stage-title")).toHaveText(
    "Deux photos. Une annonce.",
  );
  await page.goForward();
  await expect(page.locator("#stage-title")).toHaveText("Vérifiez votre carte");
  await page.locator(".edit-listing > summary").click();
  await page.locator('[data-field="title"]').fill("");
  await page.locator('[data-field="title"]').blur();
  await expect(
    page.getByRole("button", { name: "Valider et remplir Vinted" }),
  ).toBeDisabled();
  await expectSaved(page, "title", "");
  await page.reload();
  await page.locator(".edit-listing > summary").click();
  await expect(page.locator('[data-field="title"]')).toHaveValue("");
  await page.locator('[data-field="title"]').fill("Mon titre personnalisé");
  await page.locator('[data-field="title"]').blur();
  await expect(
    page.getByRole("button", { name: "Valider et remplir Vinted" }),
  ).toBeEnabled();
});

test("collection : recherche sans accent, statuts réels, tri et filtres effaçables sans perdre de carte", async ({
  page,
}) => {
  await seedCollection(page);
  await page.goto("/#/cards");
  await expect(page.locator(".collection-card")).toHaveCount(5);
  await page
    .getByRole("searchbox", { name: "Rechercher dans la collection" })
    .fill("evoli");
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await expect(page.locator(".collection-card h3")).toHaveText("Évoli");
  await page
    .getByRole("searchbox", { name: "Rechercher dans la collection" })
    .fill("introuvable");
  await page.getByRole("button", { name: "Effacer les filtres" }).click();
  await expect(page.locator(".collection-card")).toHaveCount(5);
  await page.getByRole("button", { name: /^Prêtes 1$/ }).click();
  await expect(page.locator(".collection-card h3")).toHaveText("Pikachu");
  await expect(page.locator('[data-group="ready"]')).toBeFocused();
  await page.getByRole("button", { name: /^Vendues 1$/ }).click();
  await expect(page.locator(".collection-card h3")).toHaveText("Mew");
  await page.getByRole("button", { name: /^Toutes 5$/ }).click();
  await page.getByRole("combobox", { name: "Trier les cartes" }).focus();
  await page
    .getByRole("combobox", { name: "Trier les cartes" })
    .selectOption("price");
  await expect(page.locator(".collection-card h3").first()).toHaveText(
    "Dracaufeu",
  );
  await expect(
    page.getByRole("combobox", { name: "Trier les cartes" }),
  ).toBeFocused();
  await expect(page.locator(".collection-card")).toHaveCount(5);
});

test("ancien accueil accessible par lien direct : les compteurs ouvrent la collection filtrée sans perdre les archives", async ({
  page,
}) => {
  await seedCollection(page);
  await page.goto("/#/dashboard");
  await page.locator('.stat-card[data-group="ready"]').click();
  await expect(page).toHaveURL(/#\/cards$/);
  await expect(
    page.locator('.filter-chip[data-group="ready"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await expect(page.locator(".collection-card h3")).toHaveText("Pikachu");
  await expect(page.locator("main h1")).toBeFocused();
  await page.goto("/#/dashboard");
  await page.locator('.stat-card[data-group="sold"]').click();
  await expect(page.locator(".collection-card h3")).toHaveText("Mew");
  await page.goto("/#/dashboard");
  await page.locator('.stat-card[data-group="all"]').click();
  await expect(page.locator(".collection-card")).toHaveCount(5);
});

for (const width of [1440, 390, 320]) {
  test(`inspection ${width} px : recto/verso, agrandissement au clavier et sauvegarde sans modifier les photos`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const [id] = await seedCollection(page);
    const back = await page.evaluate(async (id) => {
      const { listCards, saveCard } = await import("/src/storage.js");
      const card = (await listCards()).find((c) => c.id === id);
      const canvas = document.createElement("canvas");
      canvas.width = 10;
      canvas.height = 15;
      const context = canvas.getContext("2d");
      context.fillStyle = "#263d78";
      context.fillRect(0, 0, 10, 15);
      const data = canvas.toDataURL("image/png");
      card.photos.find((p) => p.side === "back").data = data;
      await saveCard(card);
      return data;
    }, id);
    await page.goto(`/#/cards/${id}/review`);
    await page.reload();
    const summary = page.getByRole("complementary", {
      name: "Résumé de la carte",
    });
    await expect(summary).toBeVisible();
    await expect(summary.locator(".card-photo")).toHaveAttribute("src", data);
    const verso = summary.getByRole("button", { name: "Verso", exact: true });
    await verso.click();
    await expect(verso).toBeFocused();
    await expect(verso).toHaveAttribute("aria-pressed", "true");
    await expect(summary.locator(".card-photo")).toHaveAttribute("src", back);
    await page.locator('[data-field="price"]').fill("12.99");
    await expectSaved(page, "price", "12.99");
    await expect(summary.locator(".card-photo")).toHaveAttribute("src", back);
    await page.getByRole("button", { name: "Agrandir le verso" }).click();
    const dialog = page.getByRole("dialog", { name: "Verso · Évoli" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("img")).toHaveAttribute("src", back);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Agrandir le verso" }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Agrandir le verso" }).click();
    await page.getByRole("button", { name: "Fermer la photo" }).click();
    await expect(dialog).not.toBeVisible();
    await summary.getByRole("button", { name: "Recto", exact: true }).click();
    await expect(summary.locator(".card-photo")).toHaveAttribute("src", data);
    const persisted = await page.evaluate(async (id) => {
      const { listCards } = await import("/src/storage.js");
      const card = (await listCards()).find((c) => c.id === id);
      return { price: card.price, photos: card.photos.map((p) => p.data) };
    }, id);
    expect(Number(persisted.price)).toBe(12.99);
    expect(persisted.photos).toEqual([data, back]);
    if (width === 1440)
      await page.screenshot({
        path: ".local/simplify-1440-review.png",
        fullPage: true,
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

for (const width of [320, 390, 768]) {
  test(`interface ${width} px : toutes les pages utilisables sans débordement et navigation accessible`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const [draft, ready] = await seedCollection(page);
    for (const hash of [
      "/",
      "/cards",
      `/cards/${draft}/photos`,
      `/cards/${draft}/review`,
      `/cards/${ready}/listing`,
      "/help",
      "/settings",
    ]) {
      await page.goto(`/#${hash}`);
      await page.reload();
      await expect(page.locator("main h1")).toBeVisible();
      if (hash.endsWith("/photos"))
        await expect(
          page.getByRole("heading", { name: "Deux photos. Une annonce." }),
        ).toBeVisible();
      if (hash.endsWith("/photos") || hash.endsWith("/review"))
        await page.screenshot({
          path: `.local/simplify-${width}-${hash.endsWith("/photos") ? "photos" : "review"}.png`,
          fullPage: true,
        });
      if (hash.endsWith("/review"))
        await expect(
          page.getByRole("heading", { name: "Vérifiez votre carte" }),
        ).toBeVisible();
      if (hash.endsWith("/listing"))
        await expect(
          page.getByRole("button", { name: "Valider et remplir Vinted" }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page
          .locator(".topbar")
          .getByRole("button", { name: "Scanner", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Navigation principale" }),
      ).toHaveCount(0);
    }
    await page.getByRole("button", { name: "Scanner", exact: true }).click();
    await page.locator('input[data-side="front"]').focus();
    await expect(page.locator('input[data-side="front"]')).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Préparer ma carte", exact: true }),
    ).toBeDisabled();
    expect(errors).toEqual([]);
  });
}
