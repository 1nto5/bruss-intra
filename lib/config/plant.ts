import { ROUTE_PATHS } from './header-routes';

export type Plant = 'mrg' | 'bri';

export const plant: Plant = (process.env.PLANT as Plant) || 'mrg';

// If a plant is listed here, only these routes are allowed. Omitted = all routes allowed.
const allowedPathsByPlant: Partial<Record<Plant, string[]>> = {
  bri: [ROUTE_PATHS.dmcheckData],
};

export function isRouteAllowed(path: string): boolean {
  const allowed = allowedPathsByPlant[plant];
  if (!allowed) return true; // no restrictions (mrg)
  return allowed.some((p) => path === p || path.startsWith(p + '/'));
}
