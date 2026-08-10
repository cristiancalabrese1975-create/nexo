import * as argon2 from 'argon2'

export async function hashPassword(clave: string): Promise<string> {
  return argon2.hash(clave, { type: argon2.argon2id })
}

export async function verifyPassword(hash: string, clave: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, clave)
  } catch {
    return false
  }
}
