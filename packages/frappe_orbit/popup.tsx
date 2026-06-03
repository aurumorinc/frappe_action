import React, { useEffect, useState } from "react";
import { getSites, SiteAuth, saveSite } from "./lib/auth_storage";

export default function Popup() {
  const [sites, setSites] = useState<SiteAuth[]>([]);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    const loadedSites = await getSites();
    setSites(loadedSites);
  };

  const handleSetActive = async (site: SiteAuth) => {
    site.isActive = true;
    await saveSite(site);
    await loadSites();
  };

  const handleRemove = async (siteToRemove: SiteAuth) => {
    // In a real app, we'd remove it from storage.
    // For now, just a placeholder.
    console.log("Remove site", siteToRemove);
  };

  return (
    <div style={{ padding: "16px", width: "300px", fontFamily: "system-ui, sans-serif" }}>
      <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "18px" }}>Orbit Connected Sites</h2>
      
      {sites.length === 0 ? (
        <div style={{ color: "#666", fontSize: "14px", lineHeight: "1.5" }}>
          To connect a site, visit the Orbit Settings page on your Frappe site and click Authorize.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sites.map(site => (
            <div 
              key={site.id} 
              style={{ 
                padding: "12px", 
                border: `1px solid ${site.isActive ? "#1a73e8" : "#ddd"}`,
                borderRadius: "8px",
                backgroundColor: site.isActive ? "#f8f9fa" : "white"
              }}
            >
              <div style={{ fontWeight: 500, marginBottom: "4px", wordBreak: "break-all" }}>
                {site.url}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                {site.isActive ? (
                  <span style={{ fontSize: "12px", color: "#1a73e8", fontWeight: 500 }}>Active</span>
                ) : (
                  <button 
                    onClick={() => handleSetActive(site)}
                    style={{ background: "none", border: "none", color: "#1a73e8", cursor: "pointer", padding: 0, fontSize: "12px" }}
                  >
                    Set Active
                  </button>
                )}
                <button 
                  onClick={() => handleRemove(site)}
                  style={{ background: "none", border: "none", color: "#d93025", cursor: "pointer", padding: 0, fontSize: "12px" }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
