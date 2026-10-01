export async function analyzePhotos(card) {
  const token = sessionStorage.getItem("vision-access") || "";
  const r = await fetch("/api/vision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    signal: AbortSignal.timeout(100000),
    body: JSON.stringify({
      photos: card.photos
        .filter((p) => ["front", "back"].includes(p.side))
        .map(({ side, data }) => ({ side, data })),
    }),
  });
  let result;
  try {
    result = await r.json();
  } catch {
    throw new Error(
      "Serveur IA absent. Lancez npm run server et configurez .env.",
    );
  }
  if (!r.ok) throw new Error(result.error || "Analyse impossible.");
  return result;
}
