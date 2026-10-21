# ACR Innovative website: project guide

Rebuild of acrinnovative.com (old static site is in `reference/acrinnovative-static/`, READ-ONLY and git-ignored). Content comes from MySQL and is edited by the founder in an Angular admin. The owner knows NestJS/Angular, not PHP: keep code conventional and well-commented.

## Layout
- `backend/` NestJS + Prisma + Handlebars views + design assets (`backend/public`). Serves the public site (SSR), `/api`, `/uploads`, and the built admin at `/admin`.
- `frontend/` Angular + Angular Material admin (base-href `/admin/`). Dev server proxies `/api` and `/uploads` to Nest (`proxy.conf.json`) so cookies work locally.
- Root `package.json`: `dev` (both), `build` (frontend first, output copied into backend, then backend), `start`, `seed:content`, `seed:admin`, `admin:reset-password`.

## Hard constraints (Hostinger Business shared hosting, Node app)
- ONE Node process. No Redis, workers, Docker, root, or new paid services (ask before adding any, or before changing the stack).
- MySQL via Prisma. Read PORT and all secrets from env; `.env.example` is committed, `.env` never is. `TRUST_PROXY=1` so rate limits/logs use the real client IP.
- Redeploys may replace the app folder: uploads live OUTSIDE it (`UPLOAD_DIR`, served at `/uploads`); CVs in `PRIVATE_DIR` are never served and only downloadable through an authenticated admin endpoint.
- Images: DB stores only a `Media` row (path + alt). Allowed uploads JPG/PNG/WebP, 5 MB, resized and converted to WebP with sharp, unique names. If sharp fails to load, store the original and skip resizing (never crash). Alt text required. Media still referenced anywhere cannot be deleted (409 with a "used in" list).
- Rich text is sanitised (`backend/src/common/sanitize.ts`) when saved AND when rendered.

## Conventions
- Template text convention: `[[words]]` = highlighted, newline = `<br>` (helper `hl`). Partials are registered by file name WITH dashes (`{{> seo-head}}`), see `main.ts`.
- One `<h1>` per page. Only the first hero slide is an `<h1>`; others use `.uk-h1`.
- Theme CSS (`public/css/style.css`) is left untouched; our additions go in `public/css/site.css`.
- Redirects live in ONE file: `backend/src/seo/redirects.ts` (applied by `seo.middleware.ts`, 301, keeps query string). `/sitemap.xml` and `/robots.txt` are in `seo.controller.ts`; JSON-LD builders in `seo/jsonld.ts` (business on home, Article on posts).
- Seeds are idempotent and never overwrite: `seed:content` (run once; `SiteSettings` is the "done" marker) and `seed:admin` (creates the admin only if none exists). Reset a password with `npm run admin:reset-password`.
- Images (seed AND uploads) go through `src/common/image-processor.ts` (resize + WebP; SVG/GIF/ICO kept; falls back to the original if sharp is unavailable). Uploads: type is verified from the file's bytes (JPG/PNG/WebP), 5 MB, alt text required.
- Seed images: already-optimized WebP/SVG committed in `backend/prisma/seed-assets/`; the seed never needs `reference/`. Regenerate them (dev only) with `npm run seed:build-assets`. `SEED_ASSETS_DIR` is an optional override.
- Favicon: generated from the logo by `src/common/favicon.ts` into `UPLOAD_DIR/_favicon` (favicon.ico 16+32, 32px PNG, 180 apple-touch, 192/512 PNG) and served at the root URLs + `/site.webmanifest` by `seo/favicon.controller.ts`. Seeded via `SiteSettings.faviconId`; `PATCH /api/admin/settings` with a new `faviconId` regenerates the set (`POST /api/admin/settings/favicon/regenerate` forces it). Head links carry `?v=<faviconId>`.
- Title rules live in ONE place, `seo/seo-rules.ts`: custom meta title wins; home without one = brand only (never "Home — ..."); other pages = "Page — Brand". The admin's SEO preview (`POST /api/admin/seo/preview`) uses the same functions. og:title/twitter:title = the same title.
- Password hashing: `bcryptjs` (pure JS, no native build on shared hosting). `sharp` is the only native dependency.
- Rich text editor in the admin: Tiptap used directly (`@tiptap/core` + starter-kit + image; no `ngx-tiptap` wrapper needed), see `frontend/src/app/shared/rich-text.ts`. MIT, maintained, clean HTML; limited to formats the server sanitiser allows.

## Pinned versions (exact, no ^)
Nest 11.2.7 (core/common/platform-express), Prisma + @prisma/client 6.19.3, sharp 0.35.5, hbs 4.3.1, helmet 8.3.0, TypeScript 5.9.3, Node 22 locally (Hostinger: 20/22). Frontend: Angular 21.2.25 (core/common/forms/router/platform-browser/compiler), Angular CLI + @angular/build 21.2.27, Angular Material + CDK 21.2.14, @tiptap/* 3.32.0, @fontsource/roboto + material-icons 5.3.0, RxJS 7.8.2, zoneless change detection (no zone.js).

## Auth and admin API (phase c)
- Everything under `/api/admin` is protected by the GLOBAL `AdminGuard` (path-based, `auth/admin.guard.ts`); only `@Public()` routes (login, logout) are open. JWT in httpOnly, SameSite=strict cookie `acr_admin` (Secure in production, 12 h). The token carries a password fingerprint, so changing/resetting the password logs out all sessions.
- Login is rate-limited 5/min/IP (ThrottlerGuard opt-in per route; the public forms in phase e do the same). `TRUST_PROXY` makes that the real client IP.
- Most resources are one config entry in `admin-api/resources.ts` using the generic `crud.ts` factory (list/get/create/update/delete/`PUT /reorder`, filters, slug generation, rich-text sanitising). DTOs in `admin-api/dto.ts` (trimmed strings, link URLs can't be `javascript:`). Special controllers: media (usage + delete protection), settings, inbox (+ authenticated CV download), dashboard, SEO preview.
- Inboxes are read-only by design (list, open, mark read/unread; no delete). Fixed pages and content blocks can be edited, not created/deleted.
- `npm run admin:reset-password` (interactive, or `-- --email x --password y`).
- Windows gotcha: `npm run build` runs `prisma generate`, which fails with EPERM while a Node process (e.g. `start:dev`) holds the Prisma engine. Stop the server first.

## Admin app (phase d, `frontend/`)
- Angular 21, standalone + signals, zoneless: anything async that changes the view MUST go through a signal (plain fields won't re-render).
- Almost everything is DATA-DRIVEN from `src/app/core/resources.ts`: each content type lists its API endpoint, form fields (type, validation, hints, show-if) and list layout. The generic `features/resource/resource-list.ts` and `resource-form.ts` build the screens, and `app.routes.ts` generates <base>, <base>/new, <base>/:id routes for every entry. To add a field, add it to the registry (and the backend DTO).
- Custom screens: dashboard + landings (`features/landings.ts`), page editor with content blocks (`page-editor.ts`), inbox, picture library, account. Shared pieces in `shared/`: field renderer, image picker + upload (alt text required), icon picker (Font Awesome glyphs from the site's /public/fonts), rich text, SEO panel (live Google preview from `POST /api/admin/seo/preview`, 60/160 character counters).
- UX rules: confirmation before every delete (`ConfirmService`), success/error snackbars (`NotifyService`, server messages turned into plain English), "unsaved changes" guard on every form (`core/unsaved.ts`, also warns on tab close), 401 → login page, phone layout (drawer menu, arrows instead of drag handles, no horizontal scrolling).
- Auth cookie is httpOnly, so the app asks `/auth/me` on start. Dev: `npm run dev` (Nest on :3000 + `ng serve` on :4200 at http://localhost:4200/admin/, `proxy.conf.json` forwards /api, /uploads, /public so the cookie is same-origin). Production: `npm run build` (or `npm run build:admin`) copies the Angular build to `backend/dist-admin`, served by Nest at /admin (`src/admin-static/admin-static.ts`: hashed assets cached 1 year, index.html never cached, unknown /admin/* paths return index.html).
- Angular build must not emit inline scripts/handlers (Content-Security-Policy): `inlineCritical` is disabled in angular.json, fonts are self-hosted via @fontsource, `.material-icons` rule is in styles.scss.

## Phases
a) scaffold/schema/seed/public pages (done) · b) SEO (done) · c) auth + admin API (done) · d) Angular admin (done) · e) contact/careers forms · f) build script + Hostinger notes. Stop after each phase for review.

## Local dev notes
- `backend/.env` (git-ignored) points at XAMPP MySQL `mysql://root:@localhost:3306/acr_innovative_web`.
- First run: `cd backend && npm install && npx prisma migrate dev && npm run seed:content && npm run seed:admin && npm run start:dev`.
- Seeded content images are copied to `UPLOAD_DIR/seed/`.
