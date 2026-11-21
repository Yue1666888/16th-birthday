export interface AuthUser {
  sub: string
  name: string
  email?: string
}
export interface AuthClient {
  initialize(): Promise<AuthUser | null>
  login(returnTo: string): Promise<void>
  logout(): Promise<void>
  getAccessToken(): Promise<string>
}
