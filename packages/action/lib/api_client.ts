import { getActiveSite, saveSite } from "./auth_storage";

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const site = await getActiveSite();
  if (!site) {
    throw new Error("No active site configured");
  }

  // Check if token needs refresh (e.g., within 5 minutes of expiry)
  if (Date.now() > site.expiresAt - 5 * 60 * 1000) {
    await refreshToken(site);
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${site.accessToken}`);

  const url = new URL(endpoint, site.url).toString();
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401 || response.status === 403) {
    // Try refreshing token once if we get an auth error
    await refreshToken(site);
    headers.set("Authorization", `Bearer ${site.accessToken}`);
    return fetch(url, { ...options, headers });
  }

  return response;
}

async function refreshToken(site: any) {
  // Implementation for refreshing token via Frappe OAuth endpoint
  // This would typically call /api/method/frappe.integrations.oauth2.get_token
  // with grant_type=refresh_token
  console.log("Refreshing token for", site.url);
  // Mock implementation for now
  site.expiresAt = Date.now() + 3600 * 1000;
  await saveSite(site);
}
