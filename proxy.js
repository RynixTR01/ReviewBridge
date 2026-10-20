import { auth } from "@/lib/auth/server";
import { NextResponse } from "next/server";

const neonAuthProxy = auth.middleware({ loginUrl: "/login" });

export default async function proxy(request) {
  const response = await neonAuthProxy(request);
  const location = response?.headers?.get("location");
  if (!location) return response;

  const loginUrl = new URL(location, request.url);
  if (loginUrl.origin !== request.nextUrl.origin || loginUrl.pathname !== "/login") {
    return response;
  }

  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  response.headers.set("location", loginUrl.toString());
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
