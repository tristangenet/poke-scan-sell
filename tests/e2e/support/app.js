import { expect } from "@playwright/test";

export async function currentCard(page) {
  return page.evaluate(async () => {
    const { listCards } = await import("/src/storage.js");
    const id = location.hash.split("/")[2];
    return (await listCards()).find((card) => card.id === id);
  });
}

export async function expectSaved(page, field, value, options = {}) {
  await expect
    .poll(async () => (await currentCard(page))?.[field], options)
    .toEqual(value);
}

export async function advanced(page, step = 0) {
  await expect(page.locator("#app")).not.toHaveAttribute("aria-busy", "true");
  const id = new URL(page.url()).hash.split("/")[2];
  await page.goto(`/#/cards/${id}/advanced/${step}`);
}
