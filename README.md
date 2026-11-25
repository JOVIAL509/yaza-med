# YAZA MED

Yaza Med is a responsive learning platform for pre-medical students in Malawi. This repository contains a React/Vite client and an Express/Mongoose API, with role-based authentication and student learning tools.

## Architecture and product plan

### System architecture

```text
Browser (React + Vite + Tailwind + React Router)
  ├── Public landing, sign-in and registration
  ├── Student workspace: dashboard, subjects, lessons, notes, quizzes, revision, bookmarks
  └── Admin workspace: content, users and analytics
          │ Axios / JSON API (JWT bearer token)
          ▼
Express API ── validation ── auth/role middleware ── controllers/services
          │ Mongoose
          ▼
MongoDB
```

### User journeys

1. A visitor explores the six subjects and registers; a returning student signs in.
2. Dashboard recommendations link into a subject and then a learning section, keeping materials within three navigation steps.
3. Students read a 15-minute lesson, save a note, practice a quiz, and review feedback and progress.
4. Administrators create and preview draft content, publish it, and review student and platform activity.

### Data model

| Collection | Main fields and relationships |
| --- | --- |
| User | name, email (unique), passwordHash, role, active, createdAt |
| Subject | name, slug, description, icon, order, published |
| Topic | subject ref, parent ref (optional), title, slug, order |
| Note | subject/topic refs, title, body blocks, PDF URL, status, author ref |
| LearningMaterial | subject/topic refs, title, type, URL, size, status |
| QuickLesson | subject/topic refs, objectives, sections, duration, assessment, status |
| Question | subject/topic refs, prompt, options, answer, explanation, difficulty, type, source/year, status |
| QuizAttempt | student ref, question refs, responses, score, duration, mode, completedAt |
| StudentProgress | student ref, material ref/type, completion, score, updatedAt |
| Bookmark | unique student + material ref/type |
| Notification | user ref, title, body, readAt, createdAt |

Content collections use draft/published status, indexes for subject/topic/status, and pagination. Files should be stored in object storage in production; only metadata belongs in MongoDB.

### Folder structure

```text
client/   React pages, components, hooks, API services, styles
server/   Express config, models, controllers, routes, middleware, services
```

### UI design

Use a distinctive deep-teal and warm-lime Yaza Med palette, high contrast type, a calm editorial layout, compact subject color accents, rounded but restrained cards, and generous reading widths. Desktop uses a persistent sidebar with search and progress; mobile uses a bottom navigation bar. Light/dark themes, clear loading/error/empty states, and visible progress support low-friction study. Quick lessons are structured as objectives → explanation → visual/example → key facts → short assessment.

## Local setup

Requirements: Node.js 20+, MongoDB 7+ (local or hosted).

```sh
cp server/.env.example server/.env
npm install
npm run dev
```

On Windows PowerShell, replace the first command with `Copy-Item server/.env.example server/.env`.

The Vite client runs on `http://localhost:5173`; the API defaults to `http://localhost:4000` and automatically retries `4001`, `4002`, and `4003` if the default port is already in use. Set `MONGODB_URI` to your Atlas connection string (the API reads `MONGODB_URI`, not `MONGO_URI`), and set long random values for `JWT_SECRET` and `EMAIL_OTP_SECRET`. The signup page collects first and last name, optional WhatsApp number, gender, email, password and confirmation. It emails a six-digit verification code; codes expire after 10 minutes, resend is available after 60 seconds, and each code allows five attempts. An account and login session are created only after successful verification.

Email delivery requires SMTP settings in `server/.env`. For Gmail, use a Google App Password rather than your normal account password. Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER` to the sending Gmail address, `SMTP_PASS` to its App Password, and `EMAIL_FROM` to that sender. For other providers, use their SMTP host, port and TLS settings. Keep these secrets private. A missing or rejected SMTP configuration will stop signup at the email step and show an actionable error.

The first verified registrant is a student. Create the initial administrator by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` before startup; the server seeds that account if it does not already exist. Never commit `.env` or production secrets. This ZIP intentionally omits `server/.env` and `node_modules`; copy `server/.env.example` to `server/.env`, configure it, then run `npm install` from the project root.

Yaza Med AI quizzes require a server-side `GEMINI_API_KEY` (or `GOOGLE_API_KEY`); optionally set `GEMINI_MODEL` (defaults to `gemini-3.8-flash`, using medium reasoning for faster generation). Quiz generation uses Flash directly, and successful quizzes are cached. A generation timeout is reported separately from a network connection failure. Never add the key to a `VITE_*` variable or client file. If a key has been shared or exposed, revoke it and create a replacement before configuring the API host.

## API outline

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/subjects`, `GET /api/content?type=&subject=&topic=&page=`
- `GET /api/questions?subject=&topic=&limit=`, `POST /api/attempts`
- `POST /api/ai-quiz/generate`, `POST /api/ai-quiz/submit` (signed-in students)
- `GET/POST/DELETE /api/bookmarks`
- `/api/admin/content`, `/api/admin/questions`, `/api/admin/users`, `/api/admin/analytics` (administrator role)

## Production notes

### Public monolith deployment

The frontend and API can be deployed as one public Node service. Set `VITE_API_URL=/api`
at build time, then build and start the root project:

```sh
npm install
npm run build
npm start
```

In production, set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`,
`EMAIL_OTP_SECRET`, and the SMTP/Supabase/Gemini secrets from
`server/.env.example` on the hosting provider. MongoDB is required when
`NODE_ENV=production`; the local MongoDB fallback is development-only.

The repository includes a Dockerfile for Azure App Service or another container
host. It listens on port `8080` and serves the React build for SPA routes while
keeping `/api/*` requests on Express:

```sh
docker build -t yaza-med .
docker run --rm -p 8080:8080 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="long-random-secret" \
  -e EMAIL_OTP_SECRET="another-long-random-secret" \
  yaza-med
```

Serve the client from a CDN/static host and the API behind TLS. Configure a strict CORS origin, durable MongoDB backups, object storage with signed upload/download URLs, centralized logs/alerts, database indexes, and a managed secret store. Add pagination to every list endpoint and cache public published subject/content reads. Run dependency auditing and integration/security checks as part of CI before deployment.

### Deploying so other devices can sign up

`localhost` always means the device making the request. The development API URL works on your computer only; another person's browser would try to contact an API running on *their* device. Deploy the Express server to a public Node hosting service and the React client to a public static hosting service, or put both behind a reverse proxy.

For a separately hosted API and frontend:

1. Deploy the API. Set its environment variables from `server/.env.example` on the host, including `MONGODB_URI` (your Atlas URL), `JWT_SECRET`, `EMAIL_OTP_SECRET`, and SMTP settings. Use the hosting provider's `PORT` value. Set `CLIENT_ORIGINS` to the exact public frontend origin, for example `https://yazait.com,https://www.yazait.com` (no trailing slash). Keep credentials in the host's secret settings, not in source files.
2. Confirm `https://YOUR-API-HOST/api/health` returns `{"status":"ok"}`. Make sure Atlas permits connections from the API host's outbound IP addresses.
3. In the frontend host's build environment, set `VITE_API_URL=https://YOUR-API-HOST/api`, then rebuild and redeploy the client. Vite bakes this value into the frontend at build time, so changing it requires a new build. Keep the `client/.env.example` localhost URL for development only.

Signup uses `POST /api/auth/register`. If signup shows a 404, check the browser's Network panel and confirm the request URL points to the API host and ends in `/api/auth/register`. A 404 from the frontend host usually means the backend was not deployed/proxied at that host, or `VITE_API_URL` was missing or pointed to the wrong host. A 404 from the API host means the running backend is old or does not include the `/api/auth` routes. Rebuild and redeploy the client after changing `VITE_API_URL`, and redeploy the server after changing API routes.

If both services share a domain behind a reverse proxy that forwards `/api` to Express, set the frontend build variable to `VITE_API_URL=/api` instead. The API CORS allowlist accepts localhost development origins plus the comma-separated origins configured in `CLIENT_ORIGIN` and `CLIENT_ORIGINS`.

For temporary testing from a phone on the same Wi-Fi, set `VITE_API_URL=http://YOUR-COMPUTER-LAN-IP:4000/api` in `client/.env.local` and include `http://YOUR-COMPUTER-LAN-IP:5173` in the server's `CLIENT_ORIGINS`. Allow the ports through the computer's firewall. This is LAN testing; it does not replace deploying a public API for users on other networks.

## Nyani past-paper library

## Notes library backed by Supabase Storage

The student Notes screen reads files from the Supabase Storage bucket named by `SUPABASE_STORAGE_BUCKET` or the existing `SUPABASE_BUCKET` variable (defaults to `notes`). Store files beneath subject folders named to match a published subject, for example `Physics/Mechanics/Forces and motion.pdf` or `Chemistry/Organic Chemistry/Alkanes.pdf`. Subject folders can be at the bucket root or inside parent folders. The API returns notes under each subject and orders matching topic folders by the subject's `Topic.order` values; numbered folder names and file names provide a natural-order fallback for topics that have not been added to the course outline. Create the course outline topics in MongoDB through the existing `/api/admin/topics` endpoint, passing `title`, the subject ID, and a zero-based `order` in syllabus sequence. Omit `order` to append a topic after its existing siblings.

Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`), and optionally `SUPABASE_STORAGE_BUCKET` in **server/.env** and in the API hosting provider's secret settings. Use a Supabase secret or legacy service-role key for a private bucket; a publishable/anon key only works when Storage policies explicitly grant the required list and signed-URL permissions. The key remains on the API, whose notes routes require a signed-in Yaza Med account. Private buckets are supported: the API creates short-lived signed links when a student chooses View or Download. The browser opens View links in a new tab so PDFs and other supported formats use the device/browser's normal reader; Download uses a signed link with an attachment filename. Do not put a Supabase secret/service-role key in `client/.env`, a `VITE_*` variable, or a file served to browsers. Public notes files and the course outline must use matching subject/topic folder names for automatic ordering.

The Nyani section is at `/nyani` (linked from the dashboard). Its files are static assets in `client/public/nyani`, so they ship with the Netlify frontend and do not require the API or Supabase to serve. It currently includes 163 files from the provided archive, organized into Biology, Chemistry, ICT, Language, Mathematics and Physics, with Midsem and End sem selectors. Empty subject/semester combinations show an empty state. Images fit the screen and open in a full-screen mobile-friendly viewer. Each image has a View answer button; it lists matching included answer/solution/key documents for that subject and semester, and says when the archive did not contain a separate answer. PDFs open in a browser tab. Word and PowerPoint files use Microsoft's online viewer, which can fetch them after deployment; download remains available locally and online.

To replace or add papers next time, put the source ZIP somewhere on your computer, then from the project root run this in PowerShell:

```powershell
.\scripts\import-nyani.ps1 -ZipPath "$env:USERPROFILE\OneDrive\Documentos\NYANI PREMED.zip"
npm run build
```

The import script recognizes a top-level archive folder, maps the subject folders (including the source spelling `LAUNGAUGE` to Language), preserves MIDSEM/ENDSEM sections, safely renames files for web URLs, and regenerates `client/public/nyani/manifest.json`. It replaces the generated Nyani assets each time, so the manifest and deployed files stay in sync. If you add an answer file, include a name containing `answer`, `solution`, `soln` or `key` to make it appear in the image's View answer list. To add a new subject, update the subject map in `scripts/import-nyani.ps1` and the selector list in `client/src/Nyani.jsx`.

After building, redeploy the contents of `client/dist` to the same Netlify site (drag and drop the new build, or deploy through the connected Git repository). A new deploy to the same site keeps the production site URL. Refresh a direct `/nyani` link after deploy to confirm it loads. The client includes a Netlify SPA redirect so refreshing that route serves the React app.

Keep `server/.env` out of source control and deployment artifacts; the API reads the Supabase URL, secret key and bucket from server environment variables. Never put an `sb_secret_` key in frontend environment variables or files shipped to browsers. The Nyani papers remain static frontend assets, while the Notes library uses the server-side Storage integration described above.

## Yaza Med AI quiz

Students can open **Yaza Med AI quiz** from the learning dashboard and upload one study file at a time (15 MB maximum). Supported formats are PDF, DOC/DOCX, PPT/PPTX, XLS/XLSX, OpenDocument (ODT/ODP/ODS/ODG), EPUB, RTF, TXT, Markdown, CSV, JSON, XML, HTML, and PNG/JPG/WEBP/GIF images. A quiz contains 30 four-option MCQs and 3 structured short-answer questions, each with a 10-mark model answer and marking guide. The examiner-style generation targets a 40/50/10 balance of knowledge, application, and integration, and uses the upload as its only source. MCQs are scored automatically; short answers are self-reviewed against the marking guide.

The API stores generated questions in MongoDB using a hash of the exact file bytes, model and prompt version. Re-uploading identical bytes reuses the saved questions without another Gemini generation call. Uploaded files are processed in memory and are not retained; generated questions and answer keys remain in the cache. Generation is rate-limited per client IP. The API returns answer keys only after a signed-in student submits the quiz.
#   y a z a - m e d  
 #   y a z a - m e d  
 