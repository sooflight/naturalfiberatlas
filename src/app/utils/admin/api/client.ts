import { apiBearerToken, apiKey, getApiUrl } from "./info";

type Session = { access_token: string } | null;
type AuthCallback = (event: string, session: Session) => void;

const TOKEN_STORAGE_KEY = "atlas_api_access_token";

function readToken(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) return stored;
  }
  return apiBearerToken;
}

function writeToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    return;
  }
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export async function getAuthToken(): Promise<string | null> {
  const token = readToken();
  return token || null;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const apiClient = {
  auth: {
    async getSession(): Promise<{ data: { session: Session } }> {
      const token = await getAuthToken();
      return { data: { session: token ? { access_token: token } : null } };
    },
    onAuthStateChange(callback: AuthCallback): { data: { subscription: { unsubscribe: () => void } } } {
      callback("SIGNED_IN", readToken() ? { access_token: readToken() } : null);
      return { data: { subscription: { unsubscribe: () => undefined } } };
    },
    async signOut(): Promise<{ error: null }> {
      writeToken(null);
      return { error: null };
    },
    async signInWithPassword(_credentials?: { email?: string; password?: string }): Promise<{ error: Error }> {
      return { error: new Error("Interactive sign-in is not supported. Set VITE_API_BEARER_TOKEN instead.") };
    },
    async signInWithOtp(_params?: { email?: string; options?: { emailRedirectTo?: string } }): Promise<{ error: Error }> {
      return { error: new Error("Magic-link sign-in is not supported. Set VITE_API_BEARER_TOKEN instead.") };
    },
  },
  functions: {
    async invoke(name: string, options: { body?: unknown } = {}): Promise<{ data: any; error: any }> {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers.apikey = apiKey;
      const authHeaders = await getAuthHeaders();
      const response = await fetch(getApiUrl(name), {
        method: "POST",
        headers: { ...headers, ...authHeaders },
        body: JSON.stringify(options.body ?? {}),
      });
      if (!response.ok) {
        return {
          data: null,
          error: { message: `Function invoke failed (${response.status})`, context: response },
        };
      }
      const data = await response.json().catch(() => null);
      return { data, error: null };
    },
  },
};
