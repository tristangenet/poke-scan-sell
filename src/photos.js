const PHOTO_LIMIT = 10 * 1024 * 1024;
export const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence,.heic,.heif";

function isHeic(file) {
  return (
    /^image\/hei[cf](?:-sequence)?$/i.test(file.type) ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

async function convertHeic(file) {
  let bitmap;
  try {
    // Safari can decode HEIC natively. Other browsers load the local decoder
    // only when needed; decoding runs in its worker to keep the UI responsive.
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      const { heicTo } = await import("heic-to/csp");
      bitmap = await heicTo({ blob: file, type: "bitmap" });
    }
    const canvas = document.createElement("canvas");
    try {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0);
      // Keep the original pixel dimensions. Only lower JPEG quality if a
      // high-resolution iPhone image would exceed the Vinted photo limit.
      for (const quality of [0.95, 0.9, 0.85, 0.8]) {
        const jpeg = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", quality),
        );
        if (jpeg?.type === "image/jpeg" && jpeg.size <= PHOTO_LIMIT)
          return new File([jpeg], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
            type: "image/jpeg",
            lastModified: file.lastModified,
          });
      }
      throw new Error("La photo convertie dépasse 10 Mo.");
    } finally {
      canvas.width = canvas.height = 1;
    }
  } catch (error) {
    throw new Error(
      error?.message === "La photo convertie dépasse 10 Mo."
        ? error.message
        : "Impossible de lire cette photo HEIC. Vérifiez le fichier ou exportez-le en JPEG, puis réessayez.",
      { cause: error },
    );
  } finally {
    bitmap?.close();
  }
}

export async function readPhoto(file, side, onProgress = () => {}) {
  const heic = isHeic(file);
  if (!heic && !["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Utilisez une photo HEIC, HEIF, JPEG, PNG ou WebP.");
  if (file.size > PHOTO_LIMIT) throw new Error("La photo dépasse 10 Mo.");
  const sourceName = file.name;
  if (heic) {
    onProgress("Conversion de la photo HEIC en JPEG…");
    file = await convertHeic(file);
    onProgress("Enregistrement de la photo…");
  }
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Impossible de lire la photo."));
    r.readAsDataURL(file);
  });
  let img;
  try {
    img = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Cette photo est illisible. Vérifiez le fichier et réessayez.",
    );
  }
  try {
    // The back is only an announcement photo. Decode to reject unreadable
    // files, but skip pixel analysis and quality warnings entirely.
    const photo = {
      id: crypto.randomUUID(),
      side,
      data,
      name: file.name,
      type: file.type,
      ...(heic ? { convertedFrom: sourceName } : {}),
      warnings: [],
    };
    if (side === "back") return photo;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = Math.round((256 * img.height) / img.width);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let sum = 0,
      bright = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const v = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      sum += v;
      if (v > 245) bright++;
    }
    const count = pixels.length / 4;
    const warnings = [];
    if (sum / count < 55)
      warnings.push("Photo sombre : reprenez-la avec davantage de lumière.");
    if (bright / count > 0.45)
      warnings.push("Zone très claire : vérifiez les reflets et les détails.");
    if (Math.min(img.width, img.height) < 600)
      warnings.push("Résolution faible : photographiez la carte de plus près.");
    return { ...photo, warnings };
  } finally {
    img.close();
  }
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
