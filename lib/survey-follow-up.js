export function getSurveyFollowUp(type, score) {
  if (!Number.isInteger(score)) return "general";
  if (type === "nps") {
    if (score <= 6) return "improve";
    if (score <= 8) return "feedback";
    if (score <= 10) return "recommend";
    return "general";
  }
  if (type === "csat") {
    if (score >= 1 && score <= 3) return "recover";
    if (score >= 4 && score <= 5) return "positive";
  }
  return "general";
}
