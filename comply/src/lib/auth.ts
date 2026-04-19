export async function getAccessToken() {
  // Try to get token from localStorage first (for password-based auth)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) return token
  }
  
  // Otherwise rely on httpOnly cookie sent automatically
  return null
}

export async function isAuthenticated() {
  const token = await getAccessToken()
  return !!token
}

export async function redirectToLogin() {
  window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
}
