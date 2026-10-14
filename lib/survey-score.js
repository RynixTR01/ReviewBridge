export function summarizeSurveyScores(type, stats = {}) {
  const total = Math.max(0, Number(stats.responseCount) || 0);
  const averageValue = Number(stats.average);
  const average = Number.isFinite(averageValue) ? Number(averageValue.toFixed(1)) : null;
  if (!total) return { total: 0, score: null, average: null };

  if (type === "nps") {
    const promoters = Number(stats.promoters) || 0;
    const detractors = Number(stats.detractors) || 0;
    return { total, score: Math.round(((promoters - detractors) / total) * 100), average };
  }

  const satisfied = Number(stats.satisfied) || 0;
  return { total, score: Number(((satisfied / total) * 100).toFixed(1)), average };
}
