# Firebase Setup Guide

> **Last Updated**: 2025-11-26
> **Purpose**: Document Firebase project setup, pricing plans, and GCP billing considerations

---

## Firebase Pricing Plans

### Plan Comparison

| | Spark (Free) | Blaze (Pay-as-you-go) |
|--|--------------|----------------------|
| Cost | Free | Free tier + usage-based |
| Credit Card Required | ❌ No | ✅ Yes |
| GCP Billing Linked | ❌ No | ✅ Yes |

### Feature Availability by Plan

| Feature | Spark | Blaze | Notes |
|---------|-------|-------|-------|
| **Email/Password Auth** | ✅ | ✅ | 50,000 MAU free |
| **Google OAuth** | ✅ | ✅ | 50,000 MAU free |
| **Facebook OAuth** | ✅ | ✅ | 50,000 MAU free |
| **Phone Auth (SMS OTP)** | ✅ | ✅ | Limited SMS quota |
| **OpenID Connect (OIDC)** | ❌ | ✅ | Requires Identity Platform |
| **SAML** | ❌ | ✅ | Requires Identity Platform |
| **Cloud Functions** | ❌ | ✅ | |
| **Cloud Storage** | ❌ | ✅ | Changed Oct 2024 |

### SMS Quotas for Phone Auth

| Plan | Daily Limit | Notes |
|------|-------------|-------|
| Spark | ~10-50 SMS/day | Sufficient for development |
| Blaze | 3,000 SMS/day | Higher limits |

**Important**: Use **test phone numbers** during development to avoid SMS costs.

---

## GCP Billing Relationship

### Key Points

1. **Spark Plan**: Completely separate from GCP billing
2. **Blaze Plan**: Shares the same GCP Billing Account

```
GCP Billing Account
├── GCP $300 Free Trial (90-day limit)
├── GCP Services (Compute Engine, etc.)
└── Firebase Blaze Charges ← Also deducted here
```

### GCP $300 Free Trial Considerations

| Scenario | Uses GCP $300? |
|----------|----------------|
| Stay on Spark plan | ❌ No |
| Upgrade to Blaze, stay within free tier | ❌ No |
| Upgrade to Blaze, exceed free tier | ✅ Yes |
| Send real SMS beyond free quota | ✅ Yes |

**Warning**: Upgrading to Blaze requires creating a Billing Account, which **starts the 90-day countdown** for GCP $300 free trial.

### Recommendation

If you want to preserve GCP $300 credits:
- Stay on **Spark plan** for development
- Use **test phone numbers** for Phone Auth
- LINE login (OIDC) will not be available until Blaze upgrade

---

## LINE Login Requirements

### Technical Background

LINE Login uses **OpenID Connect (OIDC)** protocol, which requires:
- Firebase **Identity Platform** upgrade
- **Blaze plan** (Pay-as-you-go)

### Implementation Status

✅ **LINE Login has been previously implemented and tested** in this project.

See: [`docs/LINE_LOGIN_INTEGRATION.md`](./LINE_LOGIN_INTEGRATION.md)

### Current Limitation

On Spark plan, LINE Login is **not available** because:
1. OIDC provider appears grayed out in Firebase Console
2. Identity Platform features require Blaze plan

### Workaround for Development

For POC/development without Blaze:
- ✅ Use Google OAuth (works on Spark)
- ✅ Use Facebook OAuth (works on Spark)
- ✅ Use Phone Auth with test numbers (works on Spark)
- ❌ LINE Login (requires Blaze)

---

## Setting Up Firebase Project

### 1. Create Project

```
Firebase Console → Add project
→ Project name: firebase-prisma-auth-dev
→ Disable Google Analytics (optional for POC)
→ Create project
```

### 2. Enable Authentication Providers

```
Build → Authentication → Sign-in method
→ Enable: Google
→ Enable: Phone
→ (Optional) Enable: Facebook
```

### 3. Add Test Phone Numbers

```
Authentication → Sign-in method → Phone
→ Phone numbers for testing
→ Add: +886900000000 / 123456
```

This allows development without sending real SMS.

### 4. Get Web App Configuration

```
Project Settings → General → Your apps → Add app → Web
→ Copy firebaseConfig to .env.local
```

### 5. Get Service Account Key (for Admin SDK)

```
Project Settings → Service accounts
→ Generate new private key
→ Compress JSON to single line
→ Add to FIREBASE_SERVICE_ACCOUNT_KEY in .env.local
```

---

## Environment Variables

```bash
# .env.local

# Firebase Frontend SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Database
DATABASE_URL="file:/absolute/path/to/prisma/dev.db"
```

---

## Budget Alerts (Recommended for Blaze)

If upgrading to Blaze, set up budget alerts:

```
GCP Console → Billing → Budgets & alerts
→ Create budget
→ Set amount: $1 (or any threshold)
→ Alert at: 50%, 90%, 100%
```

This provides early warning before any unexpected charges.

---

## Summary: Development Strategy

### For POC Development (Preserve GCP Credits)

| Feature | Available | Alternative |
|---------|-----------|-------------|
| Google OAuth | ✅ Yes | - |
| Facebook OAuth | ✅ Yes | - |
| Phone OTP | ✅ Yes | Use test phone numbers |
| LINE Login | ❌ No | Skip for now, upgrade later |
| Email+Password | ✅ Yes | Via Prisma + Custom Token |

### For Production (Full Features)

1. Upgrade to Blaze plan
2. Enable Identity Platform for OIDC
3. Configure LINE Login
4. Set up budget alerts
5. Monitor SMS usage

---

## Related Documentation

- [Authentication Status](./AUTHENTICATION_STATUS.md) - Current implementation status
- [LINE Login Integration](./LINE_LOGIN_INTEGRATION.md) - LINE OIDC setup guide
- [ADC Setup](./ADC_SETUP.md) - Application Default Credentials guide

---

_This document reflects the Firebase pricing and features as of November 2025._
