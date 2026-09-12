# Kaledo — Academia × Industry Collaboration Portal

A skill-mapping, internship, and placement portal connecting **students**, **industry
partners**, **academicians**, and **institutions** on one platform.

Built with **Astro**, **React**, **Three.js**, **GSAP** (+ Lenis smooth scroll), **Tailwind
CSS v4**, **Recharts**, and **Supabase** (Postgres + Auth + Storage + Edge Functions).

## Architecture: two layers, on purpose

This app is being built in phases, and right now
it deliberately has **two data layers that don't yet talk to each other**:

1. **Identity layer — real, Supabase-backed** (`src/lib/supabase.ts`, `src/lib/auth.ts`,
   `src/lib/auth-types.ts`, `supabase/`). Sign-up, sign-in (email/password + Google OAuth),
   roles, and institution verification are real: a Postgres database with Row-Level Security,
   `SECURITY DEFINER` RPCs for privileged writes, private Storage for ID documents, and two
   Edge Functions for OTP verification. Roles are **never** trusted from the client — every
   check is enforced server-side by RLS policies querying `user_roles`.

2. **Feature-data layer — still `localStorage`** (`src/lib/db.ts`, `src/lib/seed.ts`,
   `src/lib/skills.ts`). Opportunities, applications, learning programs, academic
   opportunities, and the skill-matching engine still live entirely in the browser, seeded on
   first load. This is the next thing to migrate to Postgres (see "What's next" below).

Both layers are keyed by the same id — the real Supabase `auth.uid()` — so once a user signs
up, verifies, and picks a role, `src/components/RoleGate.tsx` calls
`ensureFeatureProfile()` once to create a matching `localStorage` profile row, and every
existing Phase-2 dashboard keeps working against real identities without having been
rewritten.

## Identity & verification, concretely

- **Sign-up**: email/password (native Supabase Auth, sends a confirmation email) or Google
  OAuth (PKCE flow, fully client-side).
- **Roles**: `student`, `faculty`, `industry`, `recruiter`, `institution_admin`,
  `super_admin` — stored in `user_roles`. A new user can self-claim `student`/`faculty`/
  `industry` via the `claim_initial_role` RPC; `institution_admin`/`super_admin` are
  explicitly rejected by that function and must be granted directly in the database (see
  "Bootstrapping an admin" below).
- **Institution verification** (`student`/`faculty` only): search a small seeded directory
  of institutions (`institutions`/`institution_domains`) → if the institution has a known
  email domain, verify with a one-time code sent to that address (`send-institution-otp` /
  `verify-institution-otp` Edge Functions) → otherwise upload an ID card (private Storage
  bucket) or request manual review. An `institution_admin`/`super_admin` approves or rejects
  pending requests at `/admin/verification`; every decision is written to `audit_logs`.
- **RoleGate** (`src/components/RoleGate.tsx`) blocks every role-gated dashboard until the
  user is signed in, has claimed the matching role, and (for student/faculty) is verified —
  showing an honest status screen for "not started" / "pending" / "rejected" instead of a
  blank page or generic error.

## What it does (feature-data layer, unchanged from before)

- **Skill Assessment** — a 14-question self-assessment (8 technical + 6 soft skills) that
  builds a live skill profile.
- **Skill Mapping & Career Guidance** — a weighted-match recommendation engine
  (`src/lib/skills.ts`) scores your profile against a job-role library and every open
  opportunity, and surfaces the exact skill gaps to close.
- **Internships & Placements** — industries post internships/jobs/apprenticeships with
  required-skill weightings; students see them ranked by real match score and apply in one
  click; recruiters shortlist/interview/select applicants, and status changes flow straight
  back to the student's application tracker and portfolio.
- **Industry Learning Programs** — companies publish certifications, workshops, and
  mentorships; students enroll and mark them complete to earn portfolio credentials.
- **Academic Collaboration** — academicians browse FDPs, consultancy, industrial training,
  research collaborations, and guest-lecture slots posted by industry, and register
  interest.
- **Institution Analytics** — dashboards (Recharts) covering assessment completion,
  internship participation, average skill scores, in-demand skills, placement readiness, and
  recruitment-outcome breakdowns.
- **Digital Portfolio** — auto-populated from verified skills, completed programs, and
  selected offers, plus manually added projects.

## Design

Dark, glass-morphic UI with a cyan → violet → pink gradient system. The landing page hero
renders an animated Three.js particle network (students/industry/academia nodes) with
pointer-parallax; GSAP + ScrollTrigger drive scroll reveals and animated stat counters; Lenis
provides buttery inertial scrolling; Astro's `ClientRouter` gives soft page transitions.

## Project structure

```text
src/
├── components/
│   ├── auth/                 # SignIn, SignUp, ForgotPassword, ResetPassword, Callback
│   ├── admin/                 # VerificationQueue (institution_admin / super_admin)
│   ├── student/                # Dashboard, Assessment, Opportunities, Learning, Portfolio
│   ├── industry/                 # Dashboard (Postings / Applicants / Learning Programs)
│   ├── academician/               # Dashboard (browse + register)
│   ├── institution/                # Dashboard (analytics)
│   ├── Onboarding.tsx               # multi-step: role → profile → institution → verify
│   ├── VerificationStatus.tsx        # student/faculty self-service status + retry
│   ├── AccountSettings.tsx            # password, sessions, verification status
│   ├── RoleGate.tsx                    # real auth+role+verification guard
│   ├── Hero3D.tsx                       # Three.js landing hero
│   └── SmoothScroll.tsx                  # Lenis + GSAP ticker wiring
├── lib/
│   ├── supabase.ts            # browser Supabase client (anon key only)
│   ├── auth.ts                 # real auth/verification functions (calls RPCs + Edge Fns)
│   ├── auth-types.ts            # identity-layer types
│   ├── useSession.ts             # real-session hook, adapted onto the old User shape
│   ├── db.ts                      # localStorage feature-data layer + Phase-1/2 seam
│   ├── seed.ts                     # seed companies / opportunities / programs
│   ├── skills.ts                    # skill taxonomy, job-role library, matching engine
│   └── types.ts                      # feature-data-layer types
├── layouts/Layout.astro       # shell: nav, smooth scroll, footer, view transitions
└── pages/                      # one route per screen (incl. auth/, admin/, verification/)

supabase/
├── functions/
│   ├── send-institution-otp/   # generates + (if configured) emails a verification code
│   ├── verify-institution-otp/ # validates the code, flips status to verified
│   ├── ai-gateway/              # AIProvider scaffold — disabled, no live calls yet
│   └── _shared/cors.ts
```

## Environment setup

```bash
cp .env.example .env
# fill in PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY from your Supabase project
```

Both are client-safe by design (real security is Postgres RLS, not a hidden key).
Everything else — `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`,
`RESEND_API_KEY` — is a **Supabase Edge Function secret**, never a repo `.env` value:

```bash
supabase secrets set RESEND_API_KEY=... --project-ref <ref>
```

### Google OAuth

Configured and live (`GOOGLE_OAUTH_ENABLED = true` in `src/lib/auth.ts`). The Google Cloud
OAuth client's redirect URI is registered as
`https://tcjxdimjckuuequrctdr.supabase.co/auth/v1/callback`. If you rotate credentials or
add a new environment, re-register that exact URI under **Authorized redirect URIs** (not
"Authorized JavaScript origins" — a common mix-up) in Google Cloud Console → APIs & Services
→ Credentials, or you'll hit `redirect_uri_mismatch`.

### Email delivery for OTP codes

`send-institution-otp` only sends real email once `RESEND_API_KEY` (and optionally
`VERIFICATION_EMAIL_FROM`) is set as an Edge Function secret. Without it, the function is
honest about not sending anything — it logs the code server-side and returns
`{ dev_mode: true }` instead of pretending delivery happened. Check the code via:

```sql
-- Supabase SQL editor, or the query_logs tool
select event_message from logs where source = 'function_logs' order by timestamp desc limit 10;
```

### Bootstrapping the first admin

`institution_admin` and `super_admin` can't be self-assigned (by design — see
`claim_initial_role` in migration `002_functions`). To grant one, run in the Supabase SQL
editor once you know the target user's `auth.users.id`:

```sql
insert into public.user_roles (user_id, role, granted_by)
values ('<user-id>', 'super_admin', '<user-id>');
```

## Commands

| Command                | Action                                    |
| :---------------------- | :------------------------------------------ |
| `npm install`             | Install dependencies                       |
| `npm run dev`                | Start the dev server at `localhost:4321`    |
| `npm run build`                | Build the production site to `./dist/`       |
| `npm run preview`                | Preview the production build locally          |
| `npx astro check`                 | Type-check the project                       |

## Try it

1. `npm run dev`, then `/auth/sign-up` → create an account → confirm the email Supabase sends
   you.
2. You'll land on `/onboarding`: pick **Student**, fill in the profile step, search for e.g.
   **Indian Institute of Technology Bombay**, and verify with a `@iitb.ac.in` address (any
   local-part works against the seeded domain) — if no email provider is configured, read the
   generated code from the Edge Function logs (see above) instead of your inbox.
3. You land on `/student/dashboard`, fully unlocked. Take the skill assessment, then visit
   `/student/opportunities` to see opportunities ranked by your live match score, and apply.
4. Sign out, sign up again as **Industry** (industry has no institution-verification step) to
   see the applicant show up under the **Applicants** tab and change their status.
5. Grant yourself `super_admin` (see above) to review pending ID-upload/manual verification
   requests at `/admin/verification`.

## What's next (not built yet)

- Migrate opportunities/applications/skills/matching off `localStorage` into Postgres
  (closes the Phase-1/2 seam described above).
- Wire the `ai-gateway` Edge Function to live Gemini/Groq calls once you've rotated and set
  those API keys as Supabase secrets — **never** paste them into chat, `.env`, or client code.
- MFA enrollment UI (Supabase supports it; not built yet).
- A real national institution dataset instead of the small curated seed.
