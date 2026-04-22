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

export async function redirectToLogin() {
  window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
}
