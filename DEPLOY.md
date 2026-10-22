# Putting the ACR website on Hostinger (Business web hosting)

A step-by-step guide. Follow it in order and tick the boxes. Nothing here costs extra: it uses what the
Hostinger Business plan already includes (Node.js apps, MySQL, a mailbox, SSH, cron jobs).

**How much was tested?** Every command below that runs on *your computer or in SSH* was tested in a simulated server
(unzip the release → `npm install` → migrate → seed → start in production mode → full test suites → backup → restore).
The parts that happen *inside Hostinger's control panel (hPanel)* are written from general knowledge of how Hostinger
works; their menu names change now and then. For each of those steps the **goal** is stated, so you can find the right
button even if the label differs. Section 14 lists the few things to double-check in your own panel.

---

## 0. How the pieces fit (read this once)

```
 YOUR PC                              HOSTINGER
 ───────                              ────────────────────────────────────────────────────────
 npm run package  ──► acr-site-….zip  ──►  APP FOLDER   (replaced on every update; holds code only)
                                          ~/acr-data/   (NEVER replaced; holds your real data)
                                             ├─ uploads/   pictures uploaded in the admin (public)
                                             ├─ private/   CVs (private, never on the web)
                                             ├─ backups/   backup files
                                             └─ .env       the settings/passwords (private)
                                          MySQL database   all text content, messages, applications
```

The golden rule: **the app folder can be deleted and re-uploaded at any time without losing anything**, because
everything precious lives in `~/acr-data` and the database. The app refuses to start if you point the data folders
inside the app folder, so you cannot get this wrong by accident.

---

## 1. Before you start

- [ ] Hostinger **Business** web hosting plan with **Node.js** apps and **SSH** access.
- [ ] The domain `acrinnovative.com` is in your Hostinger account (you do not need to switch it over yet, see Section 9).
- [ ] On your PC: Node.js 22 and the project folder. First time only: `npm run install:all`.
- [ ] A mailbox for sending the form alerts: a Hostinger mailbox (hPanel → Emails) **or** a Gmail account with an App Password.
- [ ] An SSH program: Windows 10/11 has one built in. In PowerShell, `ssh` works.

> **Do not touch the live (old) site until Section 9.** Build and test the new site on a test address first.

---

## 2. On your PC: make the release file

```powershell
cd C:\Users\HP\Desktop\ACR\PROJECTS\acr-innovative-web
npm run package
```

This builds the admin and the website and creates `release\acr-site-<date>-<time>.zip` (about 3 MB).
It contains no passwords and no `node_modules` (the server installs those itself, so the image-processing library
gets the right build for Hostinger's computers).

- [ ] `release\acr-site-….zip` exists.

---

## 3. In hPanel: the database

1. hPanel → **Databases → Management** (MySQL Databases).
2. Create a database and a database user. Hostinger adds a prefix, so you get names like `u123456789_acr` (database)
   and `u123456789_acruser` (user).
3. **Use a password with only letters and numbers** (Hostinger's generator can include symbols). If it has symbols, see the note in Section 5.
4. Write down: **database name, user, password**. The host is `localhost`.

- [ ] Database, user and password noted.

---

## 4. Connect with SSH and create the data folders

1. hPanel → **Advanced → SSH Access**: switch it on, and note the **IP, port and user name**
   (Hostinger usually uses port `65002` and a user like `u123456789`).
2. From your PC:
   ```powershell
   ssh -p 65002 u123456789@YOUR.SERVER.IP
   ```
   (Replace port, user and IP with yours. Enter your SSH password.)
3. Check Node is available, then create the folders:
   ```bash
   node -v                     # should say v20 or v22. If "not found", see Section 14.
   echo $HOME                  # e.g. /home/u123456789  <- remember this
   mkdir -p ~/acr-data/uploads ~/acr-data/private ~/acr-data/backups
   chmod 700 ~/acr-data ~/acr-data/private ~/acr-data/backups
   ```

- [ ] `node -v` shows 20 or 22.
- [ ] `~/acr-data/` exists, and you know your `$HOME` path.

---

## 5. Create the settings file (`~/acr-data/.env`)

This file holds every setting and password. It lives in `acr-data`, **outside** the app folder, so updates never overwrite it.

1. Make a secret for logins (copy the long output):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Create the file: `nano ~/acr-data/.env` and paste the text below, replacing every `<…>`:

```ini
NODE_ENV=production
SITE_URL=https://test.acrinnovative.com
NOINDEX_SITE=true
TRUST_PROXY=1

DATABASE_URL="mysql://<db user>:<db password>@localhost:3306/<db name>"

UPLOAD_DIR=/home/<your user>/acr-data/uploads
PRIVATE_DIR=/home/<your user>/acr-data/private
BACKUP_DIR=/home/<your user>/acr-data/backups

JWT_SECRET=<the long secret from step 1>

ADMIN_EMAIL=<your email, used to log in to the admin>
ADMIN_PASSWORD=<a strong password, at least 10 characters>

# Email alerts: choose ONE of these two blocks (remove the other)
# --- Hostinger mailbox ---
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=<full mailbox address, e.g. info@acrinnovative.com>
SMTP_PASS=<mailbox password>
SMTP_FROM=<same mailbox address>
# --- Gmail with an App Password ---
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=465
# SMTP_SECURE=true
# SMTP_USER=<yourname@gmail.com>
# SMTP_PASS=<16-character App Password>
# SMTP_FROM=<yourname@gmail.com>
```

3. Save (`Ctrl+O`, Enter, `Ctrl+X`) and lock the file: `chmod 600 ~/acr-data/.env`

**Notes**
- `SITE_URL` is the address visitors will use. For now it is a **test address** (a subdomain such as
  `test.acrinnovative.com`, or the temporary address Hostinger gives the app). `NOINDEX_SITE=true` tells Google to
  ignore this test copy. You will change both in Section 9. `SITE_URL` must start with `https://` and have no slash at the end.
- If the database password contains symbols, write them URL-encoded: `@`→`%40`, `#`→`%23`, `/`→`%2F`, `:`→`%3A`, `%`→`%25`.
  (Easier: use a password with letters and numbers only.)
- Quotes around a value are only for this file. In hPanel's screen (Section 6) type values **without** quotes.
- **Gmail App Password**: Google account → Security → turn on 2-Step Verification → App passwords → create one for "Mail".
  Your normal Gmail password will not work.
- Do not set `PORT` unless Hostinger's screen tells you to; the hosting provides it.

- [ ] `~/acr-data/.env` saved and locked (`chmod 600`).

**One file, one place.** The website reads this file by itself: in hPanel (Section 6) you will only enter two variables,
`NODE_ENV` and `ENV_FILE` (the path of this file). Every other setting lives here, so there is nothing to keep in sync.
(A variable typed directly into hPanel would override the file; you normally never need that.)

**A shortcut for later:** the maintenance commands in SSH need to know where the settings file is. Add this helper once
(replace `APPFOLDER` with the real app folder path after Section 6):

```bash
echo 'acr() { cd APPFOLDER && export NODE_ENV=production ENV_FILE="$HOME/acr-data/.env"; }' >> ~/.bashrc && source ~/.bashrc
```
After that, typing `acr` takes you to the app, ready to run the commands in this guide.

---

## 5b. Test the mailbox first (optional but wise)

Create the mailbox in hPanel → **Emails** (e.g. `info@acrinnovative.com`) and make sure you can log into its webmail. You will send a real test email in Section 8.

---

## 6. In hPanel: create the Node.js app

0. **Decide the test address.** Easiest: create a subdomain such as `test.acrinnovative.com` (hPanel → **Domains → Subdomains**)
   and attach the Node.js app to it (step 1 below). If Hostinger gives the new app a temporary preview address, you can use that instead.
   Whatever you choose, it must be the same address you put in `SITE_URL` in Section 5, and it needs SSL (Hostinger offers it free).
1. hPanel → **Websites → Add website → Node.js App** (or *Node.js* under Advanced; the name varies).
2. Choose **Upload your website files / ZIP** and upload `acr-site-….zip` from Section 2.
   *Goal: the app folder must contain `package.json`, `dist/`, `dist-admin/`, `views/`, `public/`, `prisma/`… directly at its top level (not inside another folder).*
3. Settings to enter:

   | Setting | Value |
   |---|---|
   | Node.js version | **22** (or 20) |
   | Application root / folder | the folder the zip was extracted into (note its full path) |
   | Application startup file / entry file | `dist/main.js` |
   | Start command (if asked) | `npm start` |
   | Build command (if asked) | leave empty, or `npm install --omit=dev` |
   | Framework preset (if asked) | "Other" / "Node" / "Express" (any generic one) |

4. **Environment variables**: in the app's settings add exactly these two (no quotes):

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `ENV_FILE` | `/home/<your user>/acr-data/.env` |

   Everything else (database, passwords, email, addresses) is read from that file. *(If your panel has no screen for variables: copy the settings file into the app folder as `.env`, which the app reads too.
   Keep the original in `acr-data` and copy it back after each update, because an update replaces the app folder.)*
5. Do **not** start the app yet if it asks to; first do Section 7.

Find the app folder's path (you need it for SSH): in hPanel's File Manager look for the folder that contains `package.json`,
or in SSH run `find ~ -maxdepth 4 -name BUILD-INFO.txt` and use the folder it shows.

- [ ] App created, zip extracted, entry file `dist/main.js`, the two environment variables entered.
- [ ] You know the app folder path (now put it in the `acr` helper from Section 5).

---

## 7. In SSH: install, create the tables, load the content

```bash
acr                                   # goes to the app folder and points to ~/acr-data/.env  (helper from Section 5)
npm install --omit=dev --no-audit --no-fund
```
This takes a few minutes the first time (about 400 MB, mostly the database engine). It also creates the database client automatically.
If it ends with errors, run it again; if it still fails see Section 14.

Then, still in SSH, **one after the other**:

```bash
npm run migrate:deploy                # creates all the database tables
npm run seed:content                  # loads the current website text and pictures (run ONCE)
npm run seed:admin                    # creates your admin login from ADMIN_EMAIL / ADMIN_PASSWORD
npm run doctor                        # the health check: it must end with "No problems found"
```

- Running the seed commands again is harmless: they never overwrite existing content or the admin password.
- The doctor tells you in plain words what to fix. Warnings (like "no backup yet") are fine for now.
- When the doctor warns about `ADMIN_PASSWORD`: delete that line from `~/acr-data/.env` (nano → delete the line → save). It is only needed for the first `seed:admin`.

- [ ] `npm run doctor` says "No problems found".

---

## 8. Start the app and check it

1. In hPanel start (or **Restart**) the Node.js app.
2. Open the test address in your browser. You should see the website. Then check each:
   - [ ] Home, Services, About, How We Work, Insights, Careers, Contact all open and look right.
   - [ ] `https://<test address>/admin/` shows the login page. Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
   - [ ] **My account → change your password** to a new one only you know.
   - [ ] Admin → **Settings → Business details**: check the public email and **"Send form alerts to"**. Save.
   - [ ] Upload a picture in the admin (Settings → Pictures): it must appear and survive a restart.
3. **Test the email** (in SSH): `acr && npm run mail:test`. Expect "Accepted by the mail server", then check the inbox.
   Then send a real message from the Contact page: it must appear in the admin **Inbox** *and* arrive by email.
4. Send a test job application with a small PDF: it appears in the Inbox, and **Download CV** works from the admin only.
5. `https://<test address>/robots.txt` should say `Disallow: /` while `NOINDEX_SITE=true` (that is correct for the test copy).

If something is wrong: `acr && npm run doctor -- --mail`, and Section 14.

---

## 9. Going live (switching the real domain)

Do this when Section 8 is all ticked.

1. **Keep a copy of the old static site**: download everything in the domain's `public_html` (File Manager → select all → Compress → download). That is your way back.
2. hPanel: point `acrinnovative.com` (and `www`) at the Node.js app instead of the old site. *(Goal: visitors to the domain reach the app. In hPanel this is usually "connect domain" on the Node.js app, or moving the domain's document root; remove or disable the old static site so it no longer answers.)*
3. Turn on **SSL** for the domain (Hostinger → Security → SSL; free) and switch on **Force HTTPS**.
4. Edit `~/acr-data/.env` (`nano ~/acr-data/.env`):
   - `SITE_URL=https://acrinnovative.com`
   - **delete** the `NOINDEX_SITE` line (otherwise Google ignores the real site!)
5. **Restart** the app. In SSH run `acr && npm run doctor`: it must show no problems and no "NOINDEX_SITE" warning.
6. Check the old links redirect (these should answer `301`):
   ```bash
   for u in /about.html /services.html /how-we-work.html /insights.html /careers.html /contact.html /index.html /aboutus /contactus /contatus /training /index; do
     printf "%-18s" $u; curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" https://acrinnovative.com$u; done
   ```
7. Check `https://acrinnovative.com/robots.txt` (allows the site, blocks `/admin` and `/api`, links the sitemap) and `/sitemap.xml`.
8. **Google Search Console** (free): add the domain, then submit `https://acrinnovative.com/sitemap.xml`.
9. Set up the backup (Section 10) **now**, and run the first one by hand.
10. Optional: a free uptime monitor (e.g. UptimeRobot) pointing at the home page, emailing you if it is down.

**If something goes badly wrong after switching:** point the domain back at the old site (you kept a copy) and fix the new one calmly on the test address.

- [ ] Live, HTTPS works, redirects answer 301, sitemap submitted.

---

## 10. Backups (set this up on day one)

`npm run backup` creates one file containing **the whole database, all uploaded pictures and all CVs**:
`~/acr-data/backups/acr-backup-YYYY-MM-DD_HHMM.tar.gz`. It keeps 14 days (the newest 3 are always kept).

**First one by hand:**
```bash
acr && npm run backup
ls -lh ~/acr-data/backups
```

**Daily, automatically** (hPanel → **Advanced → Cron Jobs**): add a job every day at 03:00 with this command
(replace `APPFOLDER` and `NODEPATH`; get `NODEPATH` by running `which node` in SSH):

```bash
cd APPFOLDER && ENV_FILE=$HOME/acr-data/.env NODEPATH scripts/backup.js >> $HOME/acr-data/backups/backup.log 2>&1
```
The next morning check that a new file exists and `backup.log` shows no error. `npm run doctor` also warns if the newest backup is older than 2 days.

**Copy backups off the server** (a backup on the same server does not survive a server problem):
download the newest file from hPanel File Manager (or `scp -P 65002 user@ip:~/acr-data/backups/acr-backup-….tar.gz .`) at least once a week
and keep it somewhere safe, for example an encrypted cloud folder. **Backups contain CVs (personal data): treat them as confidential.**
Hostinger's own backups (hPanel → Backups) are a useful extra but are not a replacement, because you cannot choose when they run.

### Restore (if data is lost or damaged)

1. Upload/choose the backup file and unpack it: `mkdir -p ~/restore && tar -xzf acr-backup-….tar.gz -C ~/restore` — you get `database.sql`, `uploads/` and `private/`.
2. **Database** (this replaces what is there): `acr` then
   ```bash
   mysql -h localhost -u <db user> -p <db name> < ~/restore/database.sql
   ```
   (it asks for the database password)
3. **Pictures and CVs**: `cp -a ~/restore/uploads/. ~/acr-data/uploads/` and `cp -a ~/restore/private/. ~/acr-data/private/`
4. Restart the app; run `npm run doctor`.

**Practise a restore once** (into a spare test database) before you need it: an untested backup is only a hope.

---

## 11. Updating the website later (the routine)

On your PC (after code changes): `npm run package` → new zip.

On Hostinger:
1. (Wise) `acr && npm run backup`.
2. Upload the new zip over the app folder **but never touch `~/acr-data`**. (In hPanel: re-upload/redeploy; or delete the app folder's contents except `node_modules` and extract the zip there.)
3. In SSH: `acr && npm install --omit=dev --no-audit --no-fund && npm run migrate:deploy && npm run doctor`
4. **Restart** the app in hPanel. Open the site and the admin and check.

**Roll back:** upload the previous zip the same way and restart. If the update changed the database, restore the backup from step 1 (Section 10) first.

---

## 12. Everyday commands (in SSH, after typing `acr`)

| Task | Command |
|---|---|
| Health check (do this after every change) | `npm run doctor` (add `-- --mail` to test the mail login) |
| Send a test email | `npm run mail:test` |
| Backup now | `npm run backup` |
| Forgot the admin password | `npm run admin:reset-password` |
| Apply database updates after an upgrade | `npm run migrate:deploy` |

Content (pages, services, articles, jobs, pictures, settings, inbox) is edited in the admin at `/admin/`, never in SSH.

---

## 13. Security checklist

- [ ] The admin password is long and unique; `ADMIN_PASSWORD` is removed from the environment.
- [ ] `~/acr-data/.env` is `chmod 600`; nothing secret is in the zip or in GitHub (`.env` is git-ignored).
- [ ] HTTPS is forced; `SITE_URL` starts with `https://`.
- [ ] Hostinger account and your email have two-step verification on.
- [ ] Backups are copied off the server regularly and kept private.
- [ ] You delete old messages and applications you no longer need (Inbox → *Delete old items…*): the website stores personal data, so keep it only as long as necessary.
- [ ] No CAPTCHA is installed (the forms use a hidden trap field and rate limits). If spam appears, the planned upgrade is the free Cloudflare Turnstile; ask before adding it.

---

## 14. Troubleshooting, and what to double-check in your hPanel

| Symptom | Likely cause and fix |
|---|---|
| Site shows an error / 502 / 503 right after starting | Run `acr && npm run doctor`; it names the problem. Also read the app's **Logs** in hPanel. Most often: environment variables missing, or `npm install` not run. |
| The app says `UPLOAD_DIR is not set` or `must be OUTSIDE the app folder` | Fix the paths (absolute, in `~/acr-data/…`) in the environment variables. |
| `JWT_SECRET must be at least 32 characters` | Use the long secret from Section 5. |
| `Missing required environment variable DATABASE_URL` (or another setting) | The settings file was not found. Check hPanel has `ENV_FILE=/home/<user>/acr-data/.env` with the right user name, and that the file exists (`ls -l ~/acr-data/.env`). The log also says `[config] ENV_FILE points to … but that file does not exist` in that case. |
| `Cannot connect to the database` | Wrong user/password/name; symbols in the password not URL-encoded; or user not assigned to the database in hPanel. |
| Login page works but you cannot log in / are logged out at once | `SITE_URL` is not `https://…`, or the site is opened over `http://`. Use the https address; turn on SSL/Force HTTPS. |
| Pictures upload but are not resized, doctor says "sharp could not be loaded" | Run `npm install --omit=dev` **on the server** (not copied from your PC). The site still works without it. |
| `npm install` fails or is killed | Retry; make sure Node 20/22 is selected; try `npm install --omit=dev --no-audit --no-fund --prefer-offline`; contact Hostinger support if processes are limited. |
| Uploaded pictures disappear after an update | They were stored inside the app folder. The app now refuses that setup; check `UPLOAD_DIR`. |
| No email arrives | `npm run mail:test` shows the exact error. Check `SMTP_*`, that the mailbox exists, and the spam folder. The messages are always saved in the Inbox regardless. |
| `mysqldump` not found when backing up | `which mysqldump` in SSH; set `MYSQLDUMP_PATH=/full/path/mysqldump` in `~/acr-data/.env`. |
| Google does not list the site | `NOINDEX_SITE` still set, or sitemap not submitted. Allow days to weeks. |

**Please verify in your own hPanel (I could not test inside Hostinger):**
1. That your plan's Node.js app accepts a **ZIP upload** and lets you set the **entry file** to `dist/main.js`. (If it only deploys from GitHub, tell me: the release then needs to be committed to a separate branch.)
2. Whether the panel runs `npm install` itself after the upload. If not, do it in SSH as in Section 7. If it **does** run it, that is fine, but it must **not** delete or move `~/acr-data`.
3. Whether the panel provides the `PORT` itself (normal). If the site does not answer, check Hostinger's note for your app type about the port.
4. How to **change the environment variables** and **restart** the app, and where the app's **Logs** are.
5. The command to see the right **Node.js 20/22 in SSH** (`node -v`). If SSH shows an old version, ask Hostinger chat: "How do I use Node 22 in SSH for my Node.js app?"
6. That **`mysqldump`** and **cron jobs** are available on your plan (they normally are).
7. The exact **path of the app folder** (use `find ~ -maxdepth 4 -name BUILD-INFO.txt`).
8. How to **attach the domain** to the Node.js app (and remove the old static site).

---

*Environment variables are all explained in `backend/.env.example`. The decisions behind the project are in `CLAUDE.md`.*
