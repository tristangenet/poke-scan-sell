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

test("première utilisation : navigation explicite, aide au clavier et reprise d’un seul brouillon vide", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vendez vos cartes, simplement." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Préparer ma première annonce" })
    .click();
  const route = new URL(page.url()).hash;
  await expect(
    page.getByRole("button", { name: "Préparer ma carte", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.getByRole("button", { name: "Scanner", exact: true }).click();
  expect(new URL(page.url()).hash).toBe(route);
  await page.getByRole("button", { name: "Aide", exact: true }).click();
  await expect(page.locator("main h1")).toBeFocused();
  const skip = page.getByRole("link", { name: "Aller au contenu" });
  await skip.focus();
  await skip.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#\/help$/);
  await page
    .getByRole("button", { name: "Mes cartes", exact: true })
    .first()
    .click();
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await page.locator(".collection-card").click();
  await page.getByRole("button", { name: "Options avancées" }).click();
  await page.getByRole("button", { name: "5 Annonce" }).click();
  await page.locator(".card-admin > summary").click();
  await page.getByRole("button", { name: "Archiver la carte" }).click();
  await page.getByRole("button", { name: "Scanner", exact: true }).click();
  expect(new URL(page.url()).hash).not.toBe(route);
  await page
    .getByRole("button", { name: "Mes cartes", exact: true })
    .first()
    .click();
  await expect(page.locator(".collection-card")).toHaveCount(2);
});

test("saisie : erreurs ciblées, enregistrement sans quitter le champ et options maintenues ouvertes", async ({
  page,
}) => {
  const [id] = await seedCollection(page);
  await page.goto(`/#/cards/${id}/review`);
  await page.locator('[data-field="name"]').fill("");
  await page.locator('[data-field="number"]').fill("");
  await page.locator('[data-field="condition"]').selectOption("");
  await page.locator('[data-field="price"]').fill("");
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(4);
  await expect(page.locator('[data-field="name"]')).toBeFocused();
  await page.locator('[data-field="name"]').fill("Évoli");
  await expect(page.locator("#save-status")).toHaveText(
    "Enregistré sur cet appareil",
  );
  await expect(page.locator('[data-field="name"]')).toBeFocused();
  await page.reload();
  await expect(page.locator('[data-field="name"]')).toHaveValue("Évoli");
  await expect(page).toHaveURL(new RegExp(`${id}/review$`));
  await page.locator(".optional-details > summary").click();
  await page.locator('[data-field="set"]').fill("Écarlate et Violet");
  await expect(page.locator("#save-status")).toHaveText(
    "Enregistré sur cet appareil",
  );
  await expect(page.locator(".optional-details")).toHaveAttribute("open", "");
  await expect(page.locator('[data-field="set"]')).toBeFocused();
  await page.locator('[data-field="variant"]').fill("Holographique");
  await expect(page.locator("#save-status")).toHaveText(
    "Enregistré sur cet appareil",
  );
  await page.locator('[data-field="number"]').fill("1/102");
  await page.locator('[data-field="condition"]').selectOption("EX");
  await page.locator('[data-field="price"]').fill("100001");
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(page.locator("#error-price")).toContainText("100 000");
  await page.locator('[data-field="price"]').fill("12.25");
  await page
    .getByRole("button", { name: "Valider ma carte et créer l’annonce" })
    .click();
  await expect(
    page.getByRole("button", { name: "Remplir mon annonce sur Vinted" }),
  ).toBeEnabled();
  await expect(page).toHaveURL(new RegExp(`${id}/listing$`));
});

test("annonce : corrections conservées lors d’une vérification inchangée et navigation précédent/suivant", async ({
  page,
}) => {
  let dialogs = 0;
  page.on("dialog", async (dialog) => {
    dialogs++;
    await dialog.dismiss();
  });
  await readyCard(page);
  const listingRoute = page.url();
  await page.locator(".edit-listing > summary").click();
  await page
    .locator('[data-field="description"]')
    .fill("Texte personnalisé, prêt à vendre.");
  await expect(page.locator("#save-status")).toHaveText(
    "Enregistré sur cet appareil",
  );
  await expect(page.locator("#listing-preview-description")).toHaveText(
    "Texte personnalisé, prêt à vendre.",
  );
  await page.getByRole("button", { name: "Modifier les informations" }).click();
  await expect(page.locator('[data-field="price"]')).toHaveValue("12.25");
  await page
    .getByRole("button", { name: "Valider et actualiser mon annonce" })
    .click();
  await expect(page.locator('[data-field="description"]')).toHaveValue(
    "Texte personnalisé, prêt à vendre.",
  );
  expect(dialogs).toBe(0);
  await page.goBack();
  await expect(page.locator("#stage-title")).toHaveText("Vérifiez votre carte");
  await page.goForward();
  await expect(page).toHaveURL(listingRoute);
  await expect(page.locator("#listing-preview-description")).toHaveText(
    "Texte personnalisé, prêt à vendre.",
  );
  await page.locator(".edit-listing > summary").click();
  await page.locator('[data-field="title"]').fill("");
  await expect(
    page.getByRole("button", { name: "Remplir mon annonce sur Vinted" }),
  ).toBeDisabled();
});

test("collection : recherche sans accent, statuts réels, tri et filtres effaçables sans perdre de carte", async ({
  page,
}) => {
  await seedCollection(page);
  await page
    .getByRole("button", { name: "Mes cartes", exact: true })
    .first()
    .click();
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

test("accueil : les compteurs ouvrent la collection filtrée sans perdre les archives", async ({
  page,
}) => {
  await seedCollection(page);
  await page.locator('.stat-card[data-group="ready"]').click();
  await expect(page).toHaveURL(/#\/cards$/);
  await expect(
    page.locator('.filter-chip[data-group="ready"]'),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".collection-card")).toHaveCount(1);
  await expect(page.locator(".collection-card h3")).toHaveText("Pikachu");
  await expect(page.locator("main h1")).toBeFocused();
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
  await page.locator('.stat-card[data-group="sold"]').click();
  await expect(page.locator(".collection-card h3")).toHaveText("Mew");
  await page.getByRole("button", { name: "Accueil", exact: true }).click();
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
    await expect(page.locator("#save-status")).toHaveText(
      "Enregistré sur cet appareil",
    );
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
      if (hash.endsWith("/review"))
        await expect(
          page.getByRole("heading", { name: "Vérifiez votre carte" }),
        ).toBeVisible();
      if (hash.endsWith("/listing"))
        await expect(
          page.getByRole("button", { name: "Remplir mon annonce sur Vinted" }),
        ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const label of [
        "Accueil",
        "Scanner",
        "Mes cartes",
        "Aide",
        "Paramètres",
      ])
        await expect(
          page
            .getByRole("navigation", { name: "Navigation principale" })
            .getByRole("button", { name: label, exact: true }),
        ).toBeVisible();
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
