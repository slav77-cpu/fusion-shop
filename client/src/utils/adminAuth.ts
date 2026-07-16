const KEY = "adminToken";

export function getAdminToken(): string {
  return localStorage.getItem(KEY) || "";
}

export function setAdminToken(token: string): void {
  localStorage.setItem(KEY, token);
}

export function clearAdminToken(): void {
  localStorage.removeItem(KEY);
}

export function isAdminLoggedIn(): boolean {
  return Boolean(getAdminToken());
}
