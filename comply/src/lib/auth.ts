export async function getAccessToken() {
  // Token is now stored in an httpOnly cookie and sent automatically.
  // Return null so apiFetch omits the Authorization header —
  // the browser will attach the cookie on same-origin requests.
  return null
}

export async function isAuthenticated() {
  const token = await getAccessToken()
  return !!token
}

export async function redirectToLogin() {
  window.location.href = `${process.env.NEXT_PUBLIC_PORTAL_URL}/login`
}
