// Read-time enforcement also protects public widgets when the owner has not
// logged in and scheduled maintenance has not run yet. Alias is code-owned.
export function effectivePlanSql(alias) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) throw new TypeError("Invalid SQL alias");
  return `(CASE WHEN ${alias}.billing_status IN ('expired','unpaid')
    OR (${alias}.billing_status='cancelled' AND ${alias}.billing_ends_at<=now())
    OR (${alias}.billing_status='on_trial' AND ${alias}.billing_trial_ends_at<=now())
    OR (${alias}.billing_status='past_due' AND ${alias}.billing_past_due_since<=now()-INTERVAL '14 days')
    THEN 'free' ELSE ${alias}.plan END)`;
}
