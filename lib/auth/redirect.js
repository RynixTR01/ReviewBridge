export function safeAuthNextPath(value) {
  if (typeof value !== "string") return "/dashboard";

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/dashboard";

  try {
    const url = new URL(candidate, "https://reviewbridge.invalid");
    if (url.origin !== "https://reviewbridge.invalid") return "/dashboard";

    const isDashboardPath = url.pathname === "/dashboard" || url.pathname.startsWith("/dashboard/");
    const isInvitePath = /^\/(?:dashboard\/brands\/accept|join\/brand)\/[a-f0-9]{48}$/.test(url.pathname);
    if (!isDashboardPath && !isInvitePath && url.pathname !== "/account-deletion") return "/dashboard";

    return `${url.pathname}${url.search}`;
  } catch {
    return "/dashboard";
  }
}
