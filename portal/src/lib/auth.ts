// JWT-based authentication (no Auth0)
// Token is stored in httpOnly cookie

export async function getAccessToken() {
  // Auth is handled via httpOnly cookie sent automatically with credentials: 'include'
  // No need to read from localStorage
  return null
}

export async function isAuthenticated() {
  // Check authentication by calling /api/v1/auth/me
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/me`, {
      credentials: 'include'
    })
    return res.ok
  } catch {
    return false
  }
}

export async function logout() {
  // Call backend logout endpoint to clear cookie
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
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1/auth/me`, {
      credentials: 'include'
    })
    
    if (!res.ok) return null
    const data = await res.json()
    return data.user
  } catch (err) {
    return null
  }
}

