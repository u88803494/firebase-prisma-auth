# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Firebase + Prisma Hybrid Authentication POC - A complete authentication solution integrating multiple login methods.

**Tech Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS + Firebase Auth + Prisma ORM + Zustand

**Core Features**:
- OAuth login (Google, Facebook, LINE)
- Phone registration & login (OTP verification)
- Email + password login
- Phone + password login
- Password reset (Email/Phone OTP)

## Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm type-check       # TypeScript check (run before committing)
pnpm lint             # ESLint
pnpm build            # Production build

# Database
npx prisma migrate dev --name "description"  # Create migration
npx prisma generate                           # Regenerate Prisma Client
npx prisma studio                             # Visual DB management (localhost:5556)
npx prisma migrate status                     # Check migration status
```

## Architecture: Hybrid Authentication

This project uses **Firebase + Prisma Hybrid Architecture**:

```
Password Storage: Prisma (bcrypt) ─NOT─> Firebase Email/Password Auth
Login Flow: Prisma password verify → Firebase Custom Token → Firebase Auth Session
```

### Why Hybrid?
- **Problem**: Firebase Email/Password Auth cannot share accounts with OAuth
- **Solution**: Store passwords in Prisma, use Custom Token to bridge to Firebase Auth Session
- **Benefit**: OAuth users (Google/Facebook/LINE) can also use password login

### Key Flows

1. **OAuth Users** → Firebase OAuth → Must bind phone (OTP) + set password → Can login via OAuth OR phone+password OR email+password

2. **Phone Registration Users** → Firebase Phone Auth (OTP) → Provide email + password → Can login via phone+password OR email+password

3. **Password Login** → Prisma verifies password → Generate Custom Token → `signInWithCustomToken()` → Firebase Session

## Key Design Decisions (ADRs)

| Decision | Rationale | Implementation |
|----------|-----------|----------------|
| Passwords in Prisma, not Firebase | Allow OAuth users to have password login | `api/auth/create-custom-token` generates Custom Token |
| Firebase Phone Auth for OTP | Firebase handles OTP lifecycle automatically | `signInWithPhoneNumber` + reCAPTCHA |
| Service Account Key over ADC | Service Account never expires; ADC expires in ~1 hour | Check `FIREBASE_SERVICE_ACCOUNT_KEY` env var first |

## Firebase Admin SDK Setup

**Recommended**: Service Account Key (never expires)
```bash
# .env.local - compress JSON to single line
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Alternative**: Application Default Credentials (expires ~1 hour)
```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

## Environment Variables

Required in `.env.local`:
```bash
# Firebase Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Firebase Admin (use one of these)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Database (use absolute path for SQLite)
DATABASE_URL="file:/absolute/path/to/project/prisma/dev.db"
```

## Key Files Reference

| Functionality | Frontend | API Route |
|--------------|----------|-----------|
| OAuth login | `components/auth/OAuthButtons.tsx` | `api/auth/oauth/callback` |
| Phone registration | `register/manual/page.tsx` | `api/auth/register-phone` |
| Password login | `login/page.tsx` | `api/auth/create-custom-token` |
| Multi-account linking | `settings/page.tsx` | `api/auth/link-provider`, `unlink-provider` |

**Core Libraries**:
- `src/lib/firebase.ts` - Frontend Firebase SDK
- `src/lib/firebaseAdmin.ts` - Backend Firebase Admin SDK (handles Service Account Key / ADC fallback)
- `src/lib/prisma.ts` - Prisma Client singleton

## Development Tools

- **User Management**: `http://localhost:3000/dev/users`
- **Prisma Studio**: `npx prisma studio` → `http://localhost:5556`

## Common Issues

**Firebase Admin SDK auth failed**: Check `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local`, or run `gcloud auth application-default login`

**Prisma Client version mismatch**: Run `npx prisma generate`

**Database is locked**: Close Prisma Studio or kill process using `lsof prisma/dev.db`

## Documentation

See `docs/` directory:
- `docs/AUTHENTICATION_STATUS.md` - Current implementation status
- `docs/00-INDEX.md` - Documentation index

## Known Limitations

1. Passwords only in Prisma, not Firebase (design decision)
2. Custom Token required for phone/email login to create Firebase Session
3. SQLite for dev, PostgreSQL for production
4. ADC credentials expire in ~1 hour (prefer Service Account Key)
