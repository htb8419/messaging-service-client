export class Auth {
  readonly username: string
  readonly sessionId: string
  readonly accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
    const userInfo = Auth.decodePayload(accessToken)

    if (!userInfo.user_name) {
      throw new Error('JWT payload must contain user_name')
    }

    this.username = userInfo.user_name
    this.sessionId = userInfo.user_name
  }

  private static decodePayload(token: string): Record<string, unknown> {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format')
    }
    try {
      return JSON.parse(atob(parts[1]!))
    } catch {
      throw new Error('Invalid JWT payload encoding')
    }
  }
}
