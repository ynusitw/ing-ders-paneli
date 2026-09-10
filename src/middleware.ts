import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Edge runtime'da çalışır; firebase-admin Node API'lerine bağımlı olduğundan
// burada sadece "oturum çerezi var mı" diye bakılır (kaba erişim engeli).
// Asıl rol kontrolü (TEACHER/STUDENT) ilgili layout'larda getCurrentUser() ile yapılır.
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/teacher/:path*", "/student/:path*", "/room/:path*"],
};
