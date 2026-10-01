export async function readPhoto(file, side) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Utilisez une photo JPEG, PNG ou WebP.");
  if (file.size > 10 * 1024 * 1024) throw new Error("La photo dépasse 10 Mo.");
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await createImageBitmap(file);
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
  img.close();
  return {
    id: crypto.randomUUID(),
    side,
    data,
    name: file.name,
    type: file.type,
    warnings,
  };
}
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
