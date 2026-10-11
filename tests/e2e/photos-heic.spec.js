import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const front = await readFile(
  new URL("../fixtures/photos/card-front.HEIC", import.meta.url),
);
const back = await readFile(
  new URL("../fixtures/photos/card-back.heif", import.meta.url),
);

async function scan(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Scanner", exact: true })
    .first()
    .click();
}

async function backup(page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sauvegarder", exact: true }).click();
  const download = await event;
  const path = await download.path();
  return { path, data: JSON.parse(await readFile(path, "utf8")) };
}

test("HEIC recto/verso : extension majuscule sans MIME, conversion, résolution et sauvegarde", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await scan(page);
  for (const side of ["front", "back", "detail"])
    await expect(page.locator(`input[data-side="${side}"]`)).toHaveAttribute(
      "accept",
      /\.heic,\.heif/,
    );

  await page.locator('input[data-side="front"]').setInputFiles({
    name: "IMG_0001.HEIC",
    mimeType: "",
    buffer: front,
  });
  await expect(
    page.locator('.photo-slot[data-side="front"] img'),
  ).toBeVisible();
  await expect(page.locator("#toast")).toContainText(
    "Photo HEIC convertie et enregistrée.",
  );
  // Some photo libraries provide a HEIC MIME type without a file extension.
  await page.locator('input[data-side="back"]').setInputFiles({
    name: "IMG_0002",
    mimeType: "image/heic",
    buffer: back,
  });
  await expect(page.locator('.photo-slot[data-side="back"] img')).toBeVisible();
  await expect(page.locator(".capture-progress")).toHaveText("2 / 2 photos");
  for (const image of await page.locator(".photo-slot img").all()) {
    expect(await image.getAttribute("src")).toMatch(
      /^data:image\/jpeg;base64,/,
    );
    expect(
      await image.evaluate((img) => [img.naturalWidth, img.naturalHeight]),
    ).toEqual([1000, 1400]);
  }
  const saved = await backup(page);
  const photos = saved.data.cards[0].photos;
  expect(
    photos.map(({ side, type, name, convertedFrom }) => ({
      side,
      type,
      name,
      convertedFrom,
    })),
  ).toEqual([
    {
      side: "front",
      type: "image/jpeg",
      name: "IMG_0001.jpg",
      convertedFrom: "IMG_0001.HEIC",
    },
    {
      side: "back",
      type: "image/jpeg",
      name: "IMG_0002.jpg",
      convertedFrom: "IMG_0002",
    },
  ]);
  expect(photos[0].data).not.toBe(photos[1].data);
  expect(
    Buffer.from(photos[0].data.split(",")[1], "base64").subarray(0, 3),
  ).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  await page.reload();
  await expect(
    page.locator('.photo-slot[data-side="back"] img'),
  ).toHaveAttribute("src", photos[1].data);
  await page
    .getByRole("button", { name: "Paramètres", exact: true })
    .first()
    .click();
  await page.locator("#restore").setInputFiles(saved.path);
  await expect(page.locator("#toast")).toContainText("1 carte(s) restaurée(s)");
  const restored = (await backup(page)).data.cards.find(
    (card) => card.id !== saved.data.cards[0].id,
  );
  expect(restored.photos.map(({ data, type }) => ({ data, type }))).toEqual(
    photos.map(({ data, type }) => ({ data, type })),
  );
  expect(errors).toEqual([]);
});

test("HEIF : glisser-déposer et photo de détail, limite de six photos", async ({
  page,
}) => {
  await scan(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator('.photo-slot[data-side="front"]').evaluate(
    (slot, bytes) => {
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([new Uint8Array(bytes)], "recto.heif", {
          type: "application/octet-stream",
        }),
      );
      slot.dispatchEvent(
        new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    },
    [...front],
  );
  await expect(
    page.locator('.photo-slot[data-side="front"] img'),
  ).toBeVisible();
  await page.locator('input[data-side="back"]').setInputFiles({
    name: "verso.heif",
    mimeType: "image/heif",
    buffer: back,
  });
  await expect(page.locator('.photo-slot[data-side="back"] img')).toBeVisible();
  await page.locator(".photo-extras summary").click();
  for (let i = 1; i <= 4; i++) {
    await page.locator('input[data-side="detail"]').setInputFiles({
      name: `detail-${i}.HEIC`,
      mimeType: "image/heic-sequence",
      buffer: front,
    });
    await expect(page.locator(".detail-photos img")).toHaveCount(i);
    await page.locator(".photo-extras summary").click();
  }
  await page.locator('input[data-side="detail"]').setInputFiles({
    name: "detail-5.HEIC",
    mimeType: "image/heic",
    buffer: front,
  });
  await expect(page.locator("#toast")).toContainText("Maximum 6 photos");
  await expect(page.locator(".detail-photos img")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("HEIC invalide ou trop volumineux : photo existante conservée et import récupérable", async ({
  page,
}) => {
  await scan(page);
  const input = page.locator('input[data-side="front"]');
  await input.setInputFiles({
    name: "valide.HEIC",
    mimeType: "image/heic",
    buffer: front,
  });
  const image = page.locator('.photo-slot[data-side="front"] img');
  await expect(image).toBeVisible();
  const saved = await image.getAttribute("src");
  await input.setInputFiles({
    name: "illisible.HEIC",
    mimeType: "image/heic",
    buffer: Buffer.from("fichier corrompu"),
  });
  await expect(page.locator("#toast")).toContainText(
    "Impossible de lire cette photo HEIC",
  );
  await expect(image).toHaveAttribute("src", saved);
  await input.evaluate((el) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], "trop-grand.HEIC", {
        type: "image/heic",
      }),
    );
    el.files = transfer.files;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.locator("#toast")).toContainText("La photo dépasse 10 Mo.");
  await expect(image).toHaveAttribute("src", saved);
  await input.setInputFiles({
    name: "remplacement.HEIC",
    mimeType: "image/heic",
    buffer: back,
  });
  await expect(image).not.toHaveAttribute("src", saved);
  await expect(page.locator("#app")).not.toHaveAttribute("aria-busy", "true");
});

test("JPEG, PNG et WebP : octets conservés et décodeur HEIC non chargé", async ({
  page,
}) => {
  const codecRequests = [];
  page.on("request", (request) => {
    if (/heic-to/.test(request.url())) codecRequests.push(request.url());
  });
  await scan(page);
  for (const [type, extension] of [
    ["image/jpeg", "jpg"],
    ["image/png", "png"],
    ["image/webp", "webp"],
  ]) {
    const data = await page.evaluate((type) => {
      const canvas = document.createElement("canvas");
      canvas.width = 650;
      canvas.height = 900;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#e5ecd7";
      ctx.fillRect(0, 0, 650, 900);
      return canvas.toDataURL(type);
    }, type);
    await page.locator('input[data-side="front"]').setInputFiles({
      name: `original.${extension}`,
      mimeType: type,
      buffer: Buffer.from(data.split(",")[1], "base64"),
    });
    await expect(
      page.locator('.photo-slot[data-side="front"] img'),
    ).toHaveAttribute("src", data);
    const photo = (await backup(page)).data.cards[0].photos[0];
    expect(photo).toMatchObject({ data, type, name: `original.${extension}` });
    expect(photo.convertedFrom).toBeUndefined();
  }
  expect(codecRequests).toEqual([]);
});
