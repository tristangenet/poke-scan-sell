import { photoReading } from "./recognition.js";
import { normalizeNumber } from "./domain.js";

// Analysis copies only: the photos exported with the listing stay untouched.
export async function createOCRViews(data) {
  const image = new Image();
  image.src = data;
  await image.decode();
  const scale = Math.min(
    3,
    2400 / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const full = document.createElement("canvas");
  full.width = Math.round(image.naturalWidth * scale);
  full.height = Math.round(image.naturalHeight * scale);
  full.getContext("2d").drawImage(image, 0, 0, full.width, full.height);
  const copy = (top, height, contrast = false, left = 0, width = 1) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(full.width * width);
    canvas.height = Math.round(full.height * height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(
      full,
      Math.round(full.width * left),
      Math.round(full.height * top),
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    if (contrast) {
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const histogram = new Uint32Array(256);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const grey = Math.round(
          0.299 * pixels.data[i] +
            0.587 * pixels.data[i + 1] +
            0.114 * pixels.data[i + 2],
        );
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
        histogram[grey]++;
      }
      const tail = canvas.width * canvas.height * 0.005;
      let low = 0,
        high = 255,
        count = 0;
      while (low < 254 && count + histogram[low] < tail)
        count += histogram[low++];
      count = 0;
      while (high > low + 10 && count + histogram[high] < tail)
        count += histogram[high--];
      for (let i = 0; i < pixels.data.length; i += 4) {
        const grey = Math.max(
          0,
          Math.min(
            255,
            ((pixels.data[i] - low) * 255) / Math.max(10, high - low),
          ),
        );
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = grey;
      }
      ctx.putImageData(pixels, 0, 0);
    }
    return canvas;
  };
  const rotate = (angle) => {
    const canvas = document.createElement("canvas");
    canvas.width = full.height;
    canvas.height = full.width;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(angle);
    ctx.drawImage(full, -full.width / 2, -full.height / 2);
    return canvas;
  };
  return {
    full,
    header: () => copy(0, 0.25, true),
    footer: () => copy(0.85, 0.15, true),
    referenceLeft: () => copy(0.92, 0.08, true, 0, 0.5),
    referenceRight: () => copy(0.92, 0.08, true, 0.5, 0.5),
    contrast: () => copy(0, 1, true),
    clockwise: () => rotate(Math.PI / 2),
    anticlockwise: () => rotate(-Math.PI / 2),
  };
}

export async function readCardPhoto(
  worker,
  views,
  cards,
  onProgress = () => {},
) {
  const passes = [];
  const stages = [
    ["full", "Lecture du recto", "11"],
    ["header", "Lecture agrandie du nom", "11"],
    ["footer", "Lecture agrandie du numéro", "11"],
    ["referenceLeft", "Lecture du numéro en bas à gauche", "11"],
    ["referenceRight", "Lecture du numéro en bas à droite", "11"],
    ["contrast", "Seconde lecture du recto", "6"],
    ["clockwise", "Lecture du recto tourné", "11"],
    ["anticlockwise", "Dernière lecture du recto tourné", "11"],
  ];
  let best = { name: "", number: "", matches: [] };
  let headerText = "",
    numberText = "",
    fullText = "";
  for (const [key, label, mode] of stages) {
    if (key === "header" && best.name) continue;
    if (
      ["clockwise", "anticlockwise"].includes(key) &&
      (best.name || best.number)
    )
      continue;
    onProgress(label);
    await worker.setParameters({
      tessedit_pageseg_mode: mode,
      preserve_interword_spaces: "1",
    });
    const view = typeof views[key] === "function" ? views[key]() : views[key];
    const { data } = await worker.recognize(
      view,
      { rotateAuto: true },
      { text: true, blocks: true },
    );
    const text = data.text || "";
    const lines = (data.blocks || [])
      .flatMap((b) => b.paragraphs || [])
      .flatMap((p) => p.lines || []);
    if (key === "footer" || key.startsWith("reference"))
      numberText = text || numberText;
    else {
      if (key !== "header") fullText = text;
      const titleLines = lines
        .filter((l) => l.bbox.y0 < view.height * (key === "header" ? 1 : 0.3))
        .sort((a, b) => b.bbox.y1 - b.bbox.y0 - (a.bbox.y1 - a.bbox.y0));
      const footerContext = lines
        .filter((l) => l.bbox.y0 > view.height * 0.6)
        .map((l) => l.text)
        .join("\n");
      const title = titleLines.find(
        (l) =>
          photoReading(cards, l.text, {
            numberText: numberText || footerContext,
          }).name,
      );
      headerText =
        title?.text ||
        lines
          .filter((l) => l.bbox.y0 < view.height * 0.4)
          .map((l) => l.text)
          .join("\n") ||
        text.split("\n").slice(0, 4).join("\n");
      if (key !== "header")
        numberText = lines
          .filter((l) => l.bbox.y0 > view.height * 0.6)
          .map((l) => l.text)
          .join("\n");
    }
    const reading = photoReading(cards, fullText, { headerText, numberText });
    // Preserve each successfully read field across attempts.
    if (!reading.name && best.name) reading.name = best.name;
    if (!reading.number && best.number) reading.number = best.number;
    reading.matches = cards.filter(
      (c) =>
        c.name === reading.name &&
        (!reading.number ||
          normalizeNumber(c.localId) === normalizeNumber(reading.number)),
    );
    const score = (r) =>
      Number(Boolean(r.name)) +
      Number(Boolean(r.number)) +
      (r.matches.length && r.name && r.number ? 2 : 0);
    if (score(reading) >= score(best)) best = reading;
    passes.push({ label, text, confidence: Math.round(data.confidence || 0) });
    console.info("[scan:ocr]", {
      pass: passes.length,
      mode,
      confidence: Math.round(data.confidence || 0),
      nameRead: Boolean(reading.name),
      numberRead: Boolean(reading.number),
      references: reading.matches.length,
    });
    if (best.name && best.number && best.matches.length) break;
  }
  return {
    ...best,
    text: passes.map((p) => `${p.label}\n${p.text}`).join("\n"),
    diagnostics: {
      passes: passes.length,
      confidence: passes.at(-1)?.confidence || 0,
    },
  };
}
