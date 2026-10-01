export const EXTENSION_ID = "fdljjbnephkhdjoccpljmbohipiddlio";
export const PROTOCOL = 1;
export const VINTED_URL = "https://www.vinted.fr/items/new";
export const PHOTO_LIMIT = 10 * 1024 * 1024;
export const TRANSFER_TTL = 30 * 60 * 1000;

export function isVinted(url) {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      ["www.vinted.fr", "vinted.fr"].includes(u.hostname)
    );
  } catch {
    return false;
  }
}

export function isCreatePage(url) {
  return isVinted(url) && /^\/items\/new\/?$/.test(new URL(url).pathname);
}

export function isAppSender(sender, origin) {
  try {
    return !sender.id && new URL(sender.url).origin === origin;
  } catch {
    return false;
  }
}

export function validateDraft(raw) {
  if (!raw || typeof raw !== "object") throw new Error("Annonce absente.");
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  const price = Number(raw.price);
  if (
    !title ||
    title.length > 500 ||
    !description ||
    description.length > 20000
  )
    throw new Error("Titre ou description invalide.");
  if (!Number.isFinite(price) || price <= 0 || price > 100000)
    throw new Error("Prix de vente invalide.");
  if (
    !Array.isArray(raw.photos) ||
    raw.photos.length < 2 ||
    raw.photos.length > 6
  )
    throw new Error("Deux à six photos sont nécessaires.");
  const photos = raw.photos.map((p) => {
    if (
      !p ||
      !["front", "back", "detail"].includes(p.side) ||
      !["image/jpeg", "image/png", "image/webp"].includes(p.type)
    )
      throw new Error("Photo non reconnue.");
    return { side: p.side, type: p.type };
  });
  if (
    !photos.some((p) => p.side === "front") ||
    !photos.some((p) => p.side === "back")
  )
    throw new Error("Le recto et le verso sont nécessaires.");
  return {
    title,
    description,
    price: Math.round(price * 100) / 100,
    condition: ["M", "NM", "EX", "GD", "LP", "PL", "PO"].includes(raw.condition)
      ? raw.condition
      : "",
    photos,
  };
}

export function validatePhoto(data, type) {
  if (typeof data !== "string") throw new Error("Photo absente.");
  const header = `data:${type};base64,`;
  if (!data.startsWith(header))
    throw new Error("Format de photo incompatible.");
  const base64 = data.slice(header.length);
  if (
    !base64 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)
  )
    throw new Error("Photo encodée invalide.");
  const bytes =
    (base64.length / 4) * 3 -
    (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  if (bytes > PHOTO_LIMIT) throw new Error("La photo dépasse 10 Mo.");
  return data;
}
