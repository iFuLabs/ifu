import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js'

let auth0Client: Auth0Client | null = null

export async function getAuth0Client() {
  if (auth0Client) return auth0Client

  auth0Client = await createAuth0Client({
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
    authorizationParams: {
      redirect_uri: `${process.env.NEXT_PUBLIC_PORTAL_URL}/auth/callback`,
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    },
    cacheLocation: 'memory',
  })

  return auth0Client
}

export async function getAccessToken() {
  // Token is now stored in an httpOnly cookie and sent automatically.
  return null
}

export async function isAuthenticated() {
  const token = await getAccessToken()
  return !!token
}

export async function redirectToLogin() {
  window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
}
