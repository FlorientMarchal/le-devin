// Mesure de popularité partagée par les scripts d'extraction.

// Pages Wikipédia les plus lues (top 1 000 de chaque mois, en français et en anglais, sur 3 ans) :
// titre → nombre de mois où la page y figure. C'est notre mesure de « connu de tout le monde ».
export async function mostRead() {
  const hot = new Map();
  const now = new Date();
  for (let back = 1; back <= 36; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0");
    for (const wiki of ["fr", "en"]) {
      try {
        const res = await fetch(`https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${wiki}.wikipedia/all-access/${y}/${m}/all-days`,
          { headers: { "User-Agent": "LeDevinBuild/1.0 (jeu de devinettes)" } });
        if (!res.ok) continue;
        const json = await res.json();
        for (const a of json.items[0].articles) {
          const k = wiki + ":" + a.article;
          hot.set(k, (hot.get(k) || 0) + 1);
        }
      } catch (e) { /* mois indisponible : on passe */ }
    }
  }
  return hot;
}
