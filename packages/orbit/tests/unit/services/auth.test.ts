import { describe, it, expect, beforeEach } from 'vitest';
import { getSites, saveSite, getActiveSite, SiteAuth } from '../../../src/services/auth';
import { fakeBrowser } from 'wxt/testing/fake-browser';

describe('auth_storage', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  const mockSite: SiteAuth = {
    id: '1',
    url: 'https://example.com',
    clientId: 'client123',
    accessToken: 'access123',
    refreshToken: 'refresh123',
    expiresAt: Date.now() + 3600000,
    isActive: true
  };

  it('should save and retrieve site auth', async () => {
    await saveSite(mockSite);
    const sites = await getSites();
    
    expect(sites).toHaveLength(1);
    expect(sites[0]).toEqual(mockSite);
  });

  it('should deactivate other sites when saving active site', async () => {
    await saveSite(mockSite);
    
    const newSite: SiteAuth = {
      ...mockSite,
      id: '2',
      url: 'https://another.com',
      isActive: true
    };
    
    await saveSite(newSite);
    
    const sites = await getSites();
    expect(sites).toHaveLength(2);
    
    const oldSite = sites.find(s => s.id === '1');
    expect(oldSite?.isActive).toBe(false);
    
    const activeSite = await getActiveSite();
    expect(activeSite?.id).toBe('2');
  });
});
