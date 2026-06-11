export const ONEDRIVE_CONFIG = {
  clientId: import.meta.env.VITE_ONEDRIVE_CLIENT_ID ?? "REPLACE_WITH_AZURE_CLIENT_ID",
  tenantId: import.meta.env.VITE_ONEDRIVE_TENANT_ID ?? "common",
  redirectUri: import.meta.env.VITE_ONEDRIVE_REDIRECT_URI ?? "http://localhost:1421/auth/callback",
  scope: import.meta.env.VITE_ONEDRIVE_SCOPE ?? "Files.ReadWrite.Selected offline_access",
  authorityUrl: "https://login.microsoftonline.com",
}

export type OAuthTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

export function generateCodeVerifier(): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  const array = new Uint8Array(64)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => charset[byte % charset.length]).join("")
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

export function buildAuthUrl(config: typeof ONEDRIVE_CONFIG, challenge: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    scope: config.scope,
    code_challenge: challenge,
    code_challenge_method: "S256",
  })
  return `${config.authorityUrl}/${config.tenantId}/oauth2/v2.0/authorize?${params}`
}
