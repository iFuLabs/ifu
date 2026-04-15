import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')

  if (!authToken) {
    const loginUrl = process.env.NEXT_PUBLIC_PORTAL_URL
      ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
      : 'http://localhost:3003/login'
    return NextResponse.redirect(loginUrl)
  }

  // Validate token by calling the API
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${apiUrl}/api/v1/auth/me`, {
      headers: {
        Cookie: `auth_token=${authToken.value}`
      }
    })

    if (!response.ok) {
      // Token is invalid, redirect to login
      const loginUrl = process.env.NEXT_PUBLIC_PORTAL_URL
        ? `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
        : 'http://localhost:3003/login'
      return NextResponse.redirect(loginUrl)
    }
  } catch (error) {
    // API is down or error occurred, redirect to login
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
