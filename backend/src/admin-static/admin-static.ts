import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { paths } from '../config/env';

/**
 * Serves the built Angular admin at /admin.
 *  - Real files (JS, CSS, fonts) are served as static files. They have content hashes in their names, so they cache for a year.
 *  - Any other GET under /admin (e.g. /admin/services/12 after a page reload) returns index.html, so Angular's router takes over.
 *  - index.html itself is never cached, so a new deployment is picked up immediately.
 * The build is copied into backend/dist-admin by `npm run build` (scripts/build.js).
 */
export function mountAdmin(app: NestExpressApplication) {
  const dir = paths.adminDir;
  const indexFile = path.join(dir, 'index.html');

  if (!fs.existsSync(indexFile)) {
    console.warn(`[admin] ${indexFile} not found: run "npm run build" in the project root to build the admin app.`);
    app.use('/admin', (_req: Request, res: Response) => {
      res.status(503).type('html').send('<h1>Admin not built yet</h1><p>Run <code>npm run build</code> in the project folder, then restart the server.</p>');
    });
    return;
  }

  app.useStaticAssets(dir, {
    prefix: '/admin/',
    index: false,
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, file) => {
      if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  });

  app.use('/admin', (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    // A missing file (something.js, something.png) is a real 404, not the app shell.
    if (path.extname(req.path) && !req.path.endsWith('.html')) return next();
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}
