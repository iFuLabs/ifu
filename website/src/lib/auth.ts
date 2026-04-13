export function startTrial(product: string, plan: string) {
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'
  const auth0Domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID
  const redirectUri = `${portalUrl}/auth/callback`
  
  // Redirect to Auth0 Universal Login
  const authUrl = `https://${auth0Domain}/authorize?` + new URLSearchParams({
    client_id: clientId!,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state: JSON.stringify({ product, plan, returnTo: `/onboarding?product=${product}&plan=${plan}` })
  }).toString()
  
  window.location.href = authUrl
}
