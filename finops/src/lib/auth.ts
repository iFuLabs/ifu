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
