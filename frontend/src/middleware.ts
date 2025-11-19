import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/students') ||
    request.nextUrl.pathname.startsWith('/teachers') ||
    request.nextUrl.pathname.startsWith('/classes') ||
    request.nextUrl.pathname.startsWith('/attendance') ||
    request.nextUrl.pathname.startsWith('/fees') ||
    request.nextUrl.pathname.startsWith('/settings')

  // Redirect to login if accessing protected pages without token
  if (isDashboardPage && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect to dashboard if accessing auth pages with token
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/students/:path*',
    '/teachers/:path*',
    '/classes/:path*',
    '/attendance/:path*',
    '/fees/:path*',
    '/settings/:path*',
    '/auth/:path*',
  ],
}
