export const PLAN_LIMITS = {
  free: {
    maxSources: 1,
    maxReviews: 10,
    canRemoveBadge: false,
    canSelectTheme: false,
  },
  pro: {
    maxSources: 5,
    maxReviews: Infinity,
    canRemoveBadge: true,
    canSelectTheme: true,
  },
  agency: {
    maxSources: Infinity,
    maxReviews: Infinity,
    canRemoveBadge: true,
    canSelectTheme: true,
  },
}
