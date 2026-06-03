import { Storage } from "@plasmohq/storage"

export interface SiteAuth {
  id: string;
  url: string;
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  isActive: boolean;
}

export const authStorage = new Storage({
  area: "local"
})

export const ORBIT_SITES_KEY = "orbit_sites"

export async function getSites(): Promise<SiteAuth[]> {
  const sites = await authStorage.get<SiteAuth[]>(ORBIT_SITES_KEY)
  return sites || []
}

export async function saveSite(site: SiteAuth): Promise<void> {
  const sites = await getSites()
  const existingIndex = sites.findIndex(s => s.url === site.url)
  
  // Deactivate all other sites if this one is active
  if (site.isActive) {
    sites.forEach(s => s.isActive = false)
  }
  
  if (existingIndex >= 0) {
    sites[existingIndex] = site
  } else {
    sites.push(site)
  }
  
  await authStorage.set(ORBIT_SITES_KEY, sites)
}

export async function getActiveSite(): Promise<SiteAuth | null> {
  const sites = await getSites()
  return sites.find(s => s.isActive) || null
}
