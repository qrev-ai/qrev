import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const protectedRoutes = [
  "/dashboard",
  "/workspaces",
  "/campaigns",
  "/prospects",
  "/settings",
]

const authRoutes = ["/login", "/signup"]

export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  const isProtectedRoute = protectedRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  )

  const isAuthRoute = authRoutes.some(route => 
    nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)",
  ],
}
