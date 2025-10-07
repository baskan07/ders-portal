// middleware.ts
import { NextRequest, NextResponse } from "next/server";

const basicAuth = (req: NextRequest) => {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;

  const base64 = authHeader.split(" ")[1] || "";
  const [user, pass] = Buffer.from(base64, "base64").toString().split(":");

  return user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD;
};

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    if (!basicAuth(req)) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Secure Area"' },
      });
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
