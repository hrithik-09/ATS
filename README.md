# LetsTransport ATS v2

Internal talent acquisition suite: **Next.js + Firebase**, Google Sign-In on one URL, department-based **approval** before recruiting.


## Product flow

1. **Hiring Manager** raises a requisition for a **department**
2. Status = `PendingApproval` → routed to **Department Head(s)** of that department
3. Department Head approves or rejects
4. After **Approved**, **Admin** runs candidates, interviews, feedback, schedule
5. **Admin** sees the full process (including pending)

Out of scope for this release: Gemini/AI, Talent Pool, public Apply.

## Quick start

1. Create a Firebase project; enable **Authentication → Google**
2. Create a web app; copy config into `.env.local` as `NEXT_PUBLIC_FIREBASE_*`
3. Create a service account; set `FIREBASE_ADMIN_CREDENTIALS_PATH` (local) or `FIREBASE_ADMIN_*` (Vercel)
4. Add authorized domain in Firebase Auth
5. Run:

```bash
npm install
cp .env.example .env.local   # fill in Firebase values
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Continue with Google.

Assign **departments** on Hiring Managers and Department Heads in **Team**.

## Google Calendar invites

Set `GOOGLE_CALENDAR_ENABLED=1` and complete Workspace domain-wide delegation for the service account. Then scheduling emails panelists a Calendar invite with Meet.

## Scripts

- `npm run dev` — local development
- `npm run build` / `npm start` — production
- `npm run seed` — ensure Firestore seed users/org

## Deploy (Vercel)

1. Push repo to GitHub
2. Import in Vercel; set env vars from `.env.example`
3. Deploy — share the single URL with the team
