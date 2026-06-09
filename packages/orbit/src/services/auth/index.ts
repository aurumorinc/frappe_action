import { storage } from "#imports";
import { SiteAuth } from "../models/auth";

export const ORBIT_SITES_KEY = "local:orbit_sites";

export async function getSites(): Promise<SiteAuth[]> {
  const sites = await storage.getItem<SiteAuth[]>(ORBIT_SITES_KEY);
  return sites || [];
}

export async function saveSite(site: SiteAuth): Promise<void> {
  const sites = await getSites();
  const existingIndex = sites.findIndex(s => s.url === site.url);
  
  // Deactivate all other sites if this one is active
  if (site.isActive) {
    sites.forEach(s => s.isActive = false);
  }
  
  if (existingIndex >= 0) {
    sites[existingIndex] = site;
  } else {
    sites.push(site);
  }
  
  await storage.setItem(ORBIT_SITES_KEY, sites);
}

export async function getActiveSite(): Promise<SiteAuth | null> {
  const sites = await getSites();
  return sites.find(s => s.isActive) || null;
}
