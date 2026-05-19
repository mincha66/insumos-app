import jwt from 'jsonwebtoken'

export function verifyToken(request) {
  const auth = request.headers.get('authorization')
  if (!auth) return null
  try {
    return jwt.verify(auth.replace('Bearer ', ''), process.env.JWT_SECRET)
  } catch {
    return null
  }
}
