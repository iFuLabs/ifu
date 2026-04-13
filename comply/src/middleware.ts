import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')

  if (!authToken) {
    const loginUrl = process.env.NEXT_PUBLIC_PORTAL_URL
      ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
      : 'http://localhost:3003/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*',
}
