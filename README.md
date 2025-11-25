# Firebase + Prisma Hybrid Auth

> 🎓 **Personal Learning Project** - Exploring Firebase Authentication integration with custom database architecture

A proof-of-concept project demonstrating modern authentication system design with Firebase OAuth and Prisma ORM hybrid architecture, supporting multiple login methods and multi-account linking.

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11-orange)](https://firebase.google.com/)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io/)

---

## 📚 Learning Objectives

This project demonstrates the following technical capabilities:

- ✅ **Hybrid Authentication Architecture** - Firebase OAuth + Custom Password System
- ✅ **Multi-OAuth Provider Integration** - Google, Facebook, LINE Login
- ✅ **Phone OTP Verification** - Firebase Phone Authentication
- ✅ **Multi-Account Linking** - Allow users to link multiple login methods
- ✅ **Database Design** - Prisma ORM sync with Firebase
- ✅ **Custom Token Bridging** - Prisma password verification → Firebase Session
- ✅ **Next.js 15 App Router** - Server Components, API Routes
- ✅ **Type Safety** - TypeScript strict mode, Prisma generated types

---

## 🏗️ Hybrid Architecture Design

### Why Not Use Firebase Email/Password Auth?

This project uses **Firebase + Prisma Hybrid Architecture** instead of relying entirely on Firebase Authentication. Key reasons:

#### Problem Scenario
- **Requirement**: Allow OAuth users (e.g., Google login) to also use password login
- **Firebase Limitation**: Firebase Email/Password Auth cannot share accounts with OAuth
- **Solution**: Store passwords in custom database (Prisma), bridge with Custom Token

### Architecture Overview

```mermaid
graph TB
    subgraph "OAuth Login Flow"
        A[OAuth Provider<br/>Google/Facebook/LINE] --> B[Firebase OAuth]
        B --> C[Firebase UID]
        B --> D[Provider ID]
        C --> E[(Prisma Database)]
        D --> E
        E --> F[Store: UID, Provider ID, Password Hash]
    end

    subgraph "Password Login Flow"
        G[Phone + Password<br/>OR<br/>Email + Password] --> H[Prisma Verify Password<br/>bcrypt]
        H --> I{Valid?}
        I -->|Yes| J[Generate Custom Token<br/>Firebase Admin SDK]
        I -->|No| K[Login Failed]
        J --> L[signInWithCustomToken]
        L --> M[Firebase Session Created]
    end

    subgraph "Multi-Account Linking"
        N[User with Google] --> O[Link Facebook]
        O --> P[linkWithPopup]
        P --> Q[Update Prisma<br/>facebookId]
        Q --> R[Multiple Login Methods]
    end

    style E fill:#2D3748,stroke:#4299E1,color:#fff
    style J fill:#F6AD55,stroke:#DD6B20,color:#000
    style R fill:#48BB78,stroke:#2F855A,color:#fff
```

### Authentication Flow Comparison

```mermaid
sequenceDiagram
    autonumber

    participant U as User
    participant F as Frontend
    participant FB as Firebase Auth
    participant API as Backend API
    participant P as Prisma DB

    rect rgb(230, 240, 255)
    Note over U,P: OAuth Login (Google/Facebook/LINE)
    U->>F: Click OAuth Button
    F->>FB: signInWithPopup(provider)
    FB->>U: OAuth Consent Screen
    U->>FB: Approve
    FB->>F: Firebase User + ID Token
    F->>API: POST /api/auth/oauth/callback
    API->>FB: verifyIdToken(idToken)
    FB->>API: Decoded Token + Provider Data
    API->>P: Upsert User (UID, Provider ID)
    P->>API: Success
    API->>F: { success: true, token: JWT }
    F->>F: Save JWT, Navigate to Dashboard
    end

    rect rgb(255, 240, 230)
    Note over U,P: Password Login (Phone/Email)
    U->>F: Enter Phone + Password
    F->>API: POST /api/auth/create-custom-token
    API->>P: findUnique(phoneNumber)
    P->>API: User Data
    API->>API: bcrypt.compare(password, hash)
    API->>API: Generate Custom Token
    API->>F: { customToken }
    F->>FB: signInWithCustomToken(token)
    FB->>F: Firebase Session Created
    F->>F: Navigate to Dashboard
    end
```

### Multi-Account Linking Flow

```mermaid
graph LR
    A[User: Google Login] --> B[Settings Page]
    B --> C{Link New Provider?}
    C -->|Yes| D[Click Link Facebook]
    D --> E[linkWithPopup]
    E --> F[Firebase: Update providerData]
    F --> G[Get New ID Token]
    G --> H[API: /link-provider]
    H --> I[Prisma: Update facebookId]
    I --> J[User has 2 login methods]

    C -->|No| K{Unlink Existing?}
    K -->|Yes| L[Check: Has Other Methods?]
    L -->|Yes| M[API: /unlink-provider]
    M --> N[Prisma: Set NULL]
    N --> O[Firebase: unlink]

    L -->|No| P[Error: Cannot unlink last method]

    style J fill:#48BB78,stroke:#2F855A,color:#fff
    style P fill:#F56565,stroke:#C53030,color:#fff
```

---

## 🎯 Key Technical Decisions (ADRs)

### ADR-001: Password Storage in Prisma, Not Firebase
- **Decision**: Store all passwords in Prisma using bcrypt hash
- **Rationale**: Allow OAuth users to also set password login; unified password management
- **Consequences**: Must use Firebase Custom Token to create Firebase Auth Session
- **Implementation**: `/api/auth/create-custom-token` generates Custom Token

### ADR-002: Provider ID Storage & Uniqueness
- **Decision**: Store OAuth Provider IDs in Prisma (googleId, facebookId, lineId)
- **Rationale**: Support multi-account linking, prevent duplicate binding, enable reverse lookup
- **Consequences**: Need to sync Provider data between Firebase and Prisma
- **Implementation**: `@unique` constraints + API-level conflict checking

### ADR-003: Firebase Phone Auth for OTP
- **Decision**: Use Firebase Phone Authentication instead of custom OTP system
- **Rationale**: Firebase handles OTP generation, delivery, verification, abuse prevention
- **Consequences**: Simplified database structure, reduced maintenance
- **Implementation**: `signInWithPhoneNumber` + reCAPTCHA verification

---

## 🚀 Features

### Authentication Methods

| Login Method | Registration Flow | Technical Implementation |
|-------------|------------------|-------------------------|
| **Google OAuth** | Link phone + Set password | Firebase OAuth + Prisma |
| **Facebook OAuth** | Link phone + Set password | Firebase OAuth + Prisma |
| **LINE Login** | Link phone + Set password | Firebase OAuth + Prisma |
| **Phone + Password** | Enter Email, Phone OTP, Set Password | Firebase Phone Auth + Prisma |
| **Email + Password** | Same as phone registration | Prisma verification + Custom Token |

### Multi-Account Linking

```mermaid
graph TD
    A[User Account] --> B{Login Methods}
    B --> C[Google]
    B --> D[Facebook]
    B --> E[LINE]
    B --> F[Phone + Password]
    B --> G[Email + Password]

    H[Security Checks] --> I[Provider ID Uniqueness]
    H --> J[Prevent Duplicate Binding]
    H --> K[Last Method Protection]

    style A fill:#4299E1,stroke:#2B6CB0,color:#fff
    style H fill:#F6AD55,stroke:#DD6B20,color:#000
```

**Features**:
- Link multiple OAuth Providers to single account
- Unlink providers with safety checks
- **Security Mechanisms**:
  - Provider ID uniqueness check (prevent duplicate binding)
  - Last login method protection (must keep at least one method)
  - Firebase & Prisma dual verification

**Implementation**: `/settings` page, `/api/auth/link-provider`, `/api/auth/unlink-provider`

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router) + React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State Management**: Zustand

### Backend
- **API**: Next.js API Routes
- **Authentication**: Firebase Authentication (OAuth, Phone Auth)
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma 6
- **Password Encryption**: bcrypt (10 rounds)

### Firebase Services
- **Authentication**: OAuth Provider (Google, Facebook, LINE), Phone Auth
- **Admin SDK**: Custom Token generation, Token verification

---

## 📦 Installation & Setup

### Prerequisites
- Node.js >= 18
- pnpm >= 8
- Firebase project (with Authentication enabled)
- Google Cloud CLI (optional, for ADC)

### 1. Clone Repository

```bash
git clone git@github.com:u88803494/firebase-prisma-auth.git
cd firebase-prisma-auth
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Firebase credentials:

#### 3.1 Firebase Frontend SDK Config
Get from [Firebase Console](https://console.firebase.google.com/) > Project Settings > General > Your Apps:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
# ... other Firebase config
```

#### 3.2 Firebase Admin SDK Authentication

**Method 1 (Recommended)**: Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/) > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Compress JSON to single line, set in `.env.local`:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...",...}'
```

**Method 2 (Alternative)**: Application Default Credentials (ADC)

```bash
gcloud auth application-default login
gcloud config set project your-project-id
```

> ⚠️ **Note**: ADC credentials expire in ~1 hour. Service Account Key never expires.

#### 3.3 Database Configuration

**Development** (SQLite):
```bash
DATABASE_URL="file:/absolute/path/to/firebase-prisma-auth/prisma/dev.db"
```

**Production** (PostgreSQL):
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
```

#### 3.4 OAuth Provider Configuration

Get credentials from each provider's developer console:

- **Google**: [Google Cloud Console](https://console.cloud.google.com/)
- **Facebook**: [Facebook Developers](https://developers.facebook.com/)
- **LINE**: [LINE Developers](https://developers.line.biz/)

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
LINE_CHANNEL_ID=your_line_channel_id
LINE_CHANNEL_SECRET=your_line_channel_secret
```

### 4. Initialize Database

```bash
# Run migrations (create tables)
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate
```

### 5. Start Development Server

```bash
pnpm dev
```

Open browser: [http://localhost:3000](http://localhost:3000)

---

## 📂 Project Structure

```
firebase-prisma-auth/
├── prisma/
│   ├── schema.prisma         # Database schema definition
│   └── migrations/           # Database migration history
├── src/
│   ├── app/
│   │   ├── api/auth/         # Authentication APIs
│   │   │   ├── oauth/callback/        # OAuth login handler
│   │   │   ├── register-phone/        # Phone registration
│   │   │   ├── update-phone/          # Link phone + password
│   │   │   ├── create-custom-token/   # Generate Custom Token
│   │   │   ├── login-email/           # Email + password login
│   │   │   ├── link-provider/         # Link OAuth Provider
│   │   │   ├── unlink-provider/       # Unlink OAuth Provider
│   │   │   ├── me/                    # Get user complete data
│   │   │   └── forgot-password/       # Password reset
│   │   ├── register/
│   │   │   ├── manual/                # Phone registration page
│   │   │   └── complete/              # OAuth completion page
│   │   ├── login/                     # Login page
│   │   ├── dashboard/                 # Dashboard (protected)
│   │   ├── settings/                  # Account settings (multi-linking)
│   │   └── dev/users/                 # Dev tool: User management
│   ├── components/
│   │   └── auth/
│   │       └── OAuthButtons.tsx       # OAuth login buttons
│   ├── lib/
│   │   ├── firebase.ts                # Firebase SDK init
│   │   ├── firebaseAdmin.ts           # Firebase Admin SDK init
│   │   ├── firebaseAuth.ts            # Token verification utilities
│   │   ├── firebasePhoneAuth.ts       # Phone Auth helpers
│   │   └── prisma.ts                  # Prisma Client init
│   └── types/                         # TypeScript type definitions
├── docs/                              # Project documentation
├── .env.example                       # Environment variables template
└── README.md                          # Project documentation
```

---

## 🔑 Key Implementation Details

### 1. Custom Token Login Flow

**Problem**: After Prisma verifies password, how to create Firebase Auth Session?

**Solution**: Bridge with Firebase Custom Token

```typescript
// 1. Backend verifies password (Prisma)
const user = await prisma.user.findUnique({ where: { phoneNumber } });
const isPasswordValid = await bcrypt.compare(password, user.password);

// 2. Generate Custom Token (Firebase Admin SDK)
const customToken = await adminAuth.createCustomToken(user.uid);

// 3. Frontend uses Custom Token to login
await signInWithCustomToken(auth, customToken);

// 4. Firebase Auth Session created
```

**File**: `src/app/api/auth/create-custom-token/route.ts`

### 2. Firebase Phone Auth Flow

```typescript
// 1. Frontend setup reCAPTCHA
const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible',
});

// 2. Send OTP
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);

// 3. Verify OTP (user enters code)
const userCredential = await confirmationResult.confirm(verificationCode);

// 4. Get Firebase User
const firebaseUser = userCredential.user;
```

**File**: `src/app/register/manual/page.tsx`

### 3. Multi-Account Linking Flow

**Link Flow**:
```typescript
// 1. Firebase side linking
const result = await linkWithPopup(auth.currentUser, authProvider);

// 2. Get new ID Token
const idToken = await result.user.getIdToken(true); // forceRefresh

// 3. Call backend to sync Prisma
await fetch('/api/auth/link-provider', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${idToken}` }
});
```

**Files**: `src/app/settings/page.tsx`, `src/app/api/auth/link-provider/route.ts`

---

## 🗄️ Database Schema

```prisma
model User {
  uid             String   @unique       // Firebase UID
  email           String   @unique       // Email address
  phoneNumber     String   @unique       // Phone (international format)
  password        String?                // bcrypt hash
  displayName     String?
  photoURL        String?

  // OAuth Provider IDs
  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique

  // Verification status
  emailVerified   Boolean  @default(false)
  phoneVerified   Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([email])
  @@index([phoneNumber])
  @@index([uid])
}
```

---

## 🧪 Development Tools

### TypeScript Type Checking

```bash
pnpm type-check
```

### Linting

```bash
pnpm lint
```

### Build Project

```bash
pnpm build
```

### Prisma Studio (Visual Database Management)

```bash
npx prisma studio
```

Visit: [http://localhost:5556](http://localhost:5556)

### User Management Interface (Dev)

Visit: [http://localhost:3000/dev/users](http://localhost:3000/dev/users)

---

## 📖 Documentation

Detailed documentation in `docs/` directory:

- **OAuth Integration Guide**: `docs/OAUTH_INTEGRATION_GUIDE.md`
- **Multi-Account Linking Test Report**: `docs/MULTI_ACCOUNT_LINKING_TEST.md`
- **Authentication Status**: `docs/AUTHENTICATION_STATUS.md`
- **Database Management Guide**: `docs/DATABASE_GUIDE.md`

---

## 🚨 Known Limitations

1. **SQLite Limitations**: Development uses SQLite, production needs PostgreSQL migration
2. **Firebase Admin SDK Auth**:
   - Recommended: Service Account Key (never expires, stable)
   - Alternative: ADC (expires in ~1 hour)
3. **Password Storage Design**: Passwords only in Prisma, not in Firebase (architectural decision)
4. **reCAPTCHA Limitations**: Phone Auth requires reCAPTCHA v2 verification
5. **Organizational Policies**: Some organizations may restrict Service Account Key downloads

---

## 🤝 Contributing

This is a personal learning project. Issues and Pull Requests are welcome!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 👤 Author

**u88803494**

- GitHub: [@u88803494](https://github.com/u88803494)

---

## 🙏 Acknowledgments

- Firebase Authentication documentation and community
- Prisma team for excellent ORM tooling
- Next.js team for continuous frontend innovation

---

_Last Updated: 2025-11-25_
