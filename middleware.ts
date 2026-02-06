import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const publicRoutes = ["/login"]

// Set to true to require login for all protected routes
const REQUIRE_AUTH = false

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  const isPublicRoute = publicRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(route + "/")
  )

  // Redirect unauthenticated users to login (only when REQUIRE_AUTH is on)
  if (REQUIRE_AUTH && !isPublicRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from login
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
