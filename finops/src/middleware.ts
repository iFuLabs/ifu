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

  // Validate token and product access by calling the API
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

    const userData = await response.json()
    
    // Check if user has access to FinOps product
    // Look for active FinOps subscription in subscriptions array
    const hasFinOpsAccess = userData.subscriptions?.some((sub: any) => 
      sub.product === 'finops' && (sub.status === 'active' || sub.status === 'trialing')
    )
    
    if (!hasFinOpsAccess) {
      // User doesn't have FinOps subscription, redirect to Comply or portal
      const complyUrl = process.env.NEXT_PUBLIC_COMPLY_URL || 'http://localhost:3001'
      const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
      
      // Check if they have Comply subscription
      const hasComplyAccess = userData.subscriptions?.some((sub: any) => 
        sub.product === 'comply' && (sub.status === 'active' || sub.status === 'trialing')
      )
      
      if (hasComplyAccess) {
        // Redirect to Comply dashboard
        return NextResponse.redirect(`${complyUrl}/dashboard`)
      } else {
        // No valid subscription, redirect to portal
        return NextResponse.redirect(`${portalUrl}/onboarding?product=finops`)
      }
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
