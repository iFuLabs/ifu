import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js'

let auth0Client: Auth0Client | null = null

export async function getAuth0Client() {
  if (auth0Client) return auth0Client

  // Skip Auth0 in development with fake credentials
  if (process.env.NEXT_PUBLIC_AUTH0_DOMAIN === 'dev-test.auth0.com') {
    throw new Error('Auth0 not configured for development')
  }

  auth0Client = await createAuth0Client({
    domain: process.env.NEXT_PUBLIC_AUTH0_DOMAIN!,
    clientId: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID!,
    authorizationParams: {
      redirect_uri: `${process.env.NEXT_PUBLIC_PORTAL_URL}/auth/callback`,
      audience: process.env.NEXT_PUBLIC_AUTH0_AUDIENCE,
    },
    cacheLocation: 'localstorage',
  })

  return auth0Client
}

export async function login(product?: string, plan?: string) {
  const client = await getAuth0Client()
  const params: any = {}
  
  if (product) params.product = product
  if (plan) params.plan = plan
  
  await client.loginWithRedirect({
    authorizationParams: {
      redirect_uri: `${process.env.NEXT_PUBLIC_PORTAL_URL}/auth/callback`,
      ...(Object.keys(params).length > 0 && { 
        appState: { returnTo: `/onboarding?${new URLSearchParams(params).toString()}` }
      })
    }
  })
}

export async function logout() {
  const client = await getAuth0Client()
  await client.logout({
    logoutParams: {
      returnTo: process.env.NEXT_PUBLIC_PORTAL_URL
    }
  })
}

export async function getAccessToken() {
  try {
    const client = await getAuth0Client()
    return await client.getTokenSilently()
  } catch (err) {
    // In development mode, return null immediately
    return null
  }
}

export async function isAuthenticated() {
  const client = await getAuth0Client()
  return await client.isAuthenticated()
}

export async function getUser() {
  const client = await getAuth0Client()
  return await client.getUser()
}
