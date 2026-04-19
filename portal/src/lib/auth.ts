// JWT-based authentication (no Auth0)
// Token is stored in localStorage after login/onboarding

export async function getAccessToken() {
  // Get JWT token from localStorage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) return token
  }
  return null
}

export async function isAuthenticated() {
  const token = await getAccessToken()
  return !!token
}

export async function logout() {
  // Clear token from localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
  }
  
  // Call backend logout endpoint
  try {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    })
  } catch (err) {
    console.error('Logout error:', err)
  }
  
  // Redirect to login
  window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3003'}/login`
}

export async function getUser() {
  try {
    const token = await getAccessToken()
    if (!token) return null
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/me`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (!res.ok) return null
    const data = await res.json()
    return data.user
  } catch (err) {
    return null
  }
}
