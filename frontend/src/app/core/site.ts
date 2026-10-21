/** Base address of the public website (same server in production; Nest on :3000 while developing with `ng serve` on :4200). */
export const siteOrigin = location.port === '4200' ? 'http://localhost:3000' : location.origin;
export const siteLink = (path: string) => siteOrigin + path;
