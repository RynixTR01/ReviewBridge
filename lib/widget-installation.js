export function observedWidgetHost(request, reportedHost, appHost) {
  if (typeof reportedHost !== "string" || reportedHost.length > 253) return null;
  const host = reportedHost.trim().toLowerCase();
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(host)) return null;
  if (host === appHost) return null;
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    return url.hostname.toLowerCase() === host ? host : null;
  } catch {
    return null;
  }
}
