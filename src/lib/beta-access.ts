export const BETA_USERS = ['emersonbljr2802@gmail.com']

export function isBetaUser(email?: string | null): boolean {
  return BETA_USERS.includes(email?.toLowerCase() || '')
}
