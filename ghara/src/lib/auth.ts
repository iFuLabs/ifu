// JWT-based authentication via httpOnly cookie
// No client-side token storage needed

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function getAccessToken() {
  // Auth is handled via httpOnly cookie sent automatically with credentials: 'include'
  return null
}

export async function isAuthenticated() {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      credentials: 'include',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function logout() {
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (err) {
    console.error('Logout error:', err)
  }
  window.location.href = '/login'
}

export async function getUser() {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.user
  } catch {
    return null
  }
}
