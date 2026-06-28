export interface SiteAuth {
  id: string;
  url: string;
  clientId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  isActive: boolean;
}
