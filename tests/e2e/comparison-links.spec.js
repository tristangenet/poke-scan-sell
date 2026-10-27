import { test, expect } from "@playwright/test";
import { data } from "./support/vinted-fixture.js";
import { advanced, expectSaved } from "./support/app.js";

async function checkLinks(vinted, cardmarket, name, number, language) {
  await expect
    .poll(async () =>
      new URL(await vinted.getAttribute("href")).searchParams.get(
        "search_text",
      ),
    )
    .toBe(`${name} ${number}`);
  const url = new URL(await cardmarket.getAttribute("href"));
  expect(url.origin).toBe("https://www.cardmarket.com");
  expect(url.pathname).toBe("/fr/Pokemon/Products/Search");
  expect(url.searchParams.get("searchString")).toBe(
    `${name} ${number.split("/")[0]}`,
  );
  expect(url.searchParams.get("searchMode")).toBe("v2");
  expect(url.searchParams.get("sellerCountry")).toBe("12");
  expect(url.searchParams.get("language")).toBe(language);
  for (const link of [vinted, cardmarket]) {
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
}

for (const [language, filter] of [
  ["fr", "2"],
  ["en", "1"],
]) {
  test(`comparaisons ${language} : Vinted sans extension, Cardmarket France et langue choisie, liens actualisés dans les deux vues`, async ({
    page,
    context,
  }) => {
    for (const host of ["www.vinted.fr", "www.cardmarket.com"])
      await context.route(`https://${host}/**`, (route) =>
        route.fulfill({
          contentType: "text/html; charset=utf-8",
          body: "<h1>Comparaison — formulaire de contrôle</h1>",
        }),
      );
    await page.goto("/");
    const id = await page.evaluate(async (image) => {
      const { newCard } = await import("/src/domain.js");
      const { saveCard } = await import("/src/storage.js");
      const card = Object.assign(newCard(), {
        name: "Magirêve",
        number: "212/193",
        set: "Évolutions à Paldea",
        variant: "Holo",
        condition: "NM",
        price: 3,
        photos: ["front", "back"].map((side) => ({
          id: side,
          side,
          type: "image/png",
          data: image,
        })),
      });
      await saveCard(card);
      return card.id;
    }, data);
    await page.reload();
    await page.goto(`/#/cards/${id}/photos`);
    await expect(page.locator('[data-field="language"]')).toHaveValue("fr");
    await page.locator(".analysis-options > summary").click();
    await page.locator('[data-field="language"]').selectOption(language);
    await expectSaved(page, "language", language);
    await page
      .getByRole("button", { name: "2 Vérification", exact: true })
      .click();
    const vinted = page.getByRole("link", {
      name: "Comparer les annonces Vinted",
    });
    const cardmarket = page.getByRole("link", {
      name: "Comparer les annonces Cardmarket",
    });
    await checkLinks(vinted, cardmarket, "Magirêve", "212/193", filter);
    for (const link of [vinted, cardmarket]) {
      const expected = await link.getAttribute("href");
      const [tab] = await Promise.all([
        context.waitForEvent("page"),
        link.click(),
      ]);
      await tab.waitForURL(expected);
      expect(tab.url()).toBe(expected);
      await tab.close();
    }
    await page.locator('[data-field="name"]').fill("Évoli");
    await page.locator('[data-field="number"]').fill("TG01/TG30");
    await page.locator('[data-field="number"]').blur();
    await expectSaved(page, "number", "TG01/TG30");
    await checkLinks(vinted, cardmarket, "Évoli", "TG01/TG30", filter);
    await page.reload();
    await checkLinks(vinted, cardmarket, "Évoli", "TG01/TG30", filter);
    await advanced(page, 3);
    await checkLinks(
      page.getByRole("link", { name: /Rechercher sur Vinted/ }),
      page.getByRole("link", { name: /Rechercher sur Cardmarket/ }),
      "Évoli",
      "TG01/TG30",
      filter,
    );
  });
}
