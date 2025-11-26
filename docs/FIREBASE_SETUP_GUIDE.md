# Firebase 設定指南

> **最後更新**：2025-11-26
> **用途**：記錄 Firebase 專案設定、方案價格、GCP 計費相關資訊
> **專案名稱**：`fir-prisma-auth-dev`（Spark 免費方案）

---

## 目前專案狀態

### 已啟用的 OAuth 提供商

| 提供商 | 狀態 | 備註 |
|--------|------|------|
| **Google** | ✅ 已啟用 | 主要 OAuth 提供商 |
| **GitHub** | ✅ 已啟用 | OAuth App 已設定 |
| **Facebook** | ✅ 已啟用 | App 為開發模式 |
| **手機 (OTP)** | ✅ 已啟用 | 測試號碼已設定 |
| **LINE (OIDC)** | ❌ 未啟用 | 需要 Blaze 方案 |

### 測試用電話號碼（僅限開發環境）

| 電話號碼 | OTP 驗證碼 | 備註 |
|----------|-----------|------|
| `+886900000001` | `111111` | 測試帳號 1 |
| `+886900000002` | `111111` | 測試帳號 2 |
| `+886900000003` | `111111` | 測試帳號 3 |

> **注意**：測試電話號碼只在 Firebase Console 測試環境有效。真實電話號碼會發送實際簡訊。

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
| **GitHub OAuth** | ✅ | ✅ | 50,000 MAU free |
| **Facebook OAuth** | ✅ | ✅ | 50,000 MAU free |
| **Phone Auth (SMS OTP)** | ✅ | ✅ | Limited SMS quota |
| **OpenID Connect (OIDC)** | ❌ | ✅ | Requires Identity Platform (LINE) |
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

### 開發替代方案

在不升級 Blaze 的情況下進行 POC/開發：
- ✅ 使用 Google OAuth（Spark 方案可用）
- ✅ 使用 GitHub OAuth（Spark 方案可用）
- ✅ 使用 Facebook OAuth（Spark 方案可用）
- ✅ 使用手機驗證搭配測試號碼（Spark 方案可用）
- ❌ LINE 登入（需要 Blaze 方案）

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

#### Google OAuth
```
Build → Authentication → Sign-in method → Google
→ 啟用
→ 支援電子郵件：your@email.com
→ 儲存
```

#### GitHub OAuth
```
1. 建立 GitHub OAuth App：
   GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   → Application name: Firebase Prisma Auth
   → Homepage URL: http://localhost:3000
   → Authorization callback URL: https://fir-prisma-auth-dev.firebaseapp.com/__/auth/handler
   → Register application
   → 複製 Client ID 和 Client Secret

2. 在 Firebase 設定：
   Build → Authentication → Sign-in method → GitHub
   → 啟用
   → 貼上 Client ID 和 Client Secret
   → 儲存
```

#### Facebook OAuth
```
1. 建立 Facebook App：
   https://developers.facebook.com → My Apps → Create App
   → 使用案例：透過 Facebook 登入進行驗證並要求使用者資料
   → App 名稱：Firebase Prisma Auth
   → 建立應用程式

2. 設定 Facebook Login：
   Facebook App → 使用案例 → 自訂 → 設定
   → 有效的 OAuth 重新導向 URI：https://fir-prisma-auth-dev.firebaseapp.com/__/auth/handler
   → 儲存變更

3. 取得 App 憑證：
   應用程式設定 → 基本資料
   → 複製 App ID 和 App Secret

4. 在 Firebase 設定：
   Build → Authentication → Sign-in method → Facebook
   → 啟用
   → 貼上 App ID 和 App Secret
   → 儲存
```

#### 手機 (OTP)
```
Build → Authentication → Sign-in method → Phone
→ 啟用
→ 儲存
```

### 3. 新增測試用電話號碼

```
Authentication → Sign-in method → Phone
→ 測試用電話號碼
→ 新增：+886900000001 / 111111
→ 新增：+886900000002 / 111111
→ 新增：+886900000003 / 111111
```

這樣可以在開發時不發送真實簡訊，避免產生費用。

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

### POC 開發策略（保留 GCP 免費額度）

| 功能 | 可用 | 替代方案 |
|------|------|----------|
| Google OAuth | ✅ 是 | - |
| GitHub OAuth | ✅ 是 | - |
| Facebook OAuth | ✅ 是 | - |
| 手機 OTP | ✅ 是 | 使用測試電話號碼 |
| LINE 登入 | ❌ 否 | 暫時跳過，之後再升級 |
| Email+密碼 | ✅ 是 | 透過 Prisma + Custom Token |

### 生產環境（完整功能）

1. 升級到 Blaze 方案
2. 啟用 Identity Platform 以支援 OIDC
3. 設定 LINE 登入
4. 設定預算警報
5. 監控簡訊用量

---

## Related Documentation

- [Authentication Status](./AUTHENTICATION_STATUS.md) - Current implementation status
- [LINE Login Integration](./LINE_LOGIN_INTEGRATION.md) - LINE OIDC setup guide
- [ADC Setup](./ADC_SETUP.md) - Application Default Credentials guide

---

_This document reflects the Firebase pricing and features as of November 2025._
