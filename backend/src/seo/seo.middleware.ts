import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { redirects } from './redirects';

// Lower-cased lookup built once at startup.
const table = new Map(Object.entries(redirects).map(([from, to]) => [from.toLowerCase(), to]));

/** 301 redirects from old URLs (see redirects.ts). Runs before every route. */
export function redirectMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const pathname = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
  const target = table.get(pathname.toLowerCase());
  if (!target) return next();
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  return res.redirect(301, target + qs);
}

/** Keep the admin app and the JSON API out of search engines. */
export function noindexMiddleware(req: Request, res: Response, next: NextFunction) {
  // NOINDEX_SITE=true (test / staging address): the WHOLE site asks search engines to stay away.
  if (env.noindexSite) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  else if (req.path === '/admin' || req.path.startsWith('/admin/') || req.path.startsWith('/api/')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
}
