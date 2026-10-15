export function widgetExperimentStorageKey(token, experimentId) {
  return `reviewbridge:experiment:${token}:${experimentId}`;
}

export function experimentMetricForEvent(widget, payload) {
  if (!widget.experiment_enabled || !widget.show_review_button || widget.user_plan === "free"
      || !widget.experiment_id || payload.experimentId !== widget.experiment_id
      || !["A", "B"].includes(payload.variant)) return null;
  return { view: "views", cta_click: "cta_clicks", goal: "goal_completions" }[payload.event] || null;
}
