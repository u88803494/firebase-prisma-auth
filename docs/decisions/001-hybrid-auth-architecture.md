# ADR 001: Firebase + Prisma 混合認證架構

## 狀態

✅ **已採納** - 2025-11-18

---

## 背景

### 問題陳述

我們需要建構一個支援多種登入方式的認證系統：

- OAuth 登入（Google、GitHub、Facebook、LINE）
- 手機號碼註冊與登入（OTP 驗證）
- Email + 密碼登入
- 手機號碼 + 密碼登入

### 技術挑戰

**Firebase 的限制**：

Firebase Email/Password Auth 無法與 OAuth 帳號共用同一帳戶，導致：

1. OAuth 用戶無法設定密碼登入
2. 同一個 Email 無法同時使用 OAuth 和密碼登入
3. 帳號綁定功能受限

**架構圖 - 原始方案（有限制）**：

```
                    ┌─────────────────┐
                    │  Firebase Auth  │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                 │
    ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
    │ OAuth User  │   │ Email/Pass  │   │ Phone Auth  │
    │ (Google...)│   │    User     │   │    User     │
    └─────────────┘   └─────────────┘   └─────────────┘
           ↑                 ↑
           └─────── ✗ ───────┘
              無法共用帳戶
```

---

## 決策

### 採用 Firebase + Prisma 混合認證架構

將密碼儲存於 Prisma，透過 Custom Token 橋接 Firebase Auth Session。

**架構圖 - 混合方案**：

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend                             │
│  Firebase Auth SDK (Session 管理)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
    ┌────▼────┐   ┌────▼────┐   ┌────▼────┐
    │  OAuth  │   │ Password│   │  Phone  │
    │  Login  │   │  Login  │   │  Auth   │
    └────┬────┘   └────┬────┘   └────┬────┘
         │             │             │
         │        ┌────▼────┐        │
         │        │ Prisma  │        │
         │        │ 密碼驗證 │        │
         │        └────┬────┘        │
         │             │             │
         │        ┌────▼────┐        │
         │        │ Custom  │        │
         │        │ Token   │        │
         │        └────┬────┘        │
         │             │             │
         └─────────────┼─────────────┘
                       │
              ┌────────▼────────┐
              │  Firebase Auth  │
              │    Session      │
              └─────────────────┘
```

### 核心決策

#### 1. 密碼儲存：Prisma（非 Firebase Email/Password Auth）

```typescript
// Prisma Schema
model User {
  id              Int      @id @default(autoincrement())
  uid             String   @unique  // Firebase UID
  email           String   @unique
  phoneNumber     String?  @unique
  password        String?  // bcrypt hashed - 儲存在 Prisma
  // ...
}
```

#### 2. 登入流程：Prisma 驗證 → Custom Token → Firebase Session

```
1. 用戶提交 Email + 密碼
2. API 驗證密碼（bcrypt.compare）
3. 生成 Firebase Custom Token
4. 前端呼叫 signInWithCustomToken()
5. Firebase Session 建立完成
```

#### 3. 手機 OTP：使用 Firebase Phone Auth

不自行實作 OTP，原因：
- Firebase 自動處理 OTP 發送與驗證
- 內建 reCAPTCHA 防濫用
- 自動管理 SMS 配額與計費

#### 4. Firebase Admin SDK：優先使用 Service Account Key

| 方式 | 有效期 | 適用場景 |
|------|--------|----------|
| Service Account Key | 永不過期 | 生產環境（推薦） |
| ADC | ~1 小時 | 快速開發測試 |

---

## 理由

### 為何選擇混合架構？

1. **統一帳號系統**：OAuth 用戶可以設定密碼登入
2. **彈性密碼管理**：完全控制密碼雜湊與重設邏輯
3. **保留 Firebase 優勢**：Session 管理、前端 SDK、Phone Auth
4. **降低開發成本**：OTP 由 Firebase 處理，無需自建簡訊服務

### 為何不使用純 Firebase？

Firebase Email/Password Auth 的限制：
- 無法與 OAuth Provider 共用帳戶
- 帳號綁定機制受限
- 密碼重設流程不夠彈性

### 為何不完全自建？

自建認證系統的成本：
- 需要實作 OTP 發送（SMS 服務、費用、防濫用）
- 需要處理 OAuth 整合（各提供商 SDK）
- 需要管理 Session（Token 刷新、安全性）

---

## 後果

### 優勢 (Positive)

1. ✅ OAuth 用戶可以設定密碼登入
2. ✅ 支援 5+ 種登入方式（Google、GitHub、Facebook、Email+密碼、手機+密碼）
3. ✅ 完全控制密碼驗證邏輯
4. ✅ Firebase Session 管理仍然可用
5. ✅ OTP 由 Firebase 處理，減少開發成本

### 劣勢 (Negative)

1. ⚠️ 複雜度增加：需維護 Prisma + Firebase 雙層系統
2. ⚠️ Custom Token 依賴：密碼登入需要額外生成 Token
3. ⚠️ 資料同步：Prisma 與 Firebase 用戶資料需保持一致

### 技術限制

1. Service Account Key 需妥善保管（不可提交至版控）
2. SQLite 僅適用開發環境，生產需遷移至 PostgreSQL
3. ADC 約 1 小時過期，需定期重新登入

---

## 實作細節

### 關鍵 API 端點

| 端點 | 說明 |
|------|------|
| `/api/auth/register-phone` | 手機註冊（Firebase Phone Auth 後建立 Prisma 記錄） |
| `/api/auth/login-email` | Email 登入（Prisma 驗證密碼） |
| `/api/auth/login-phone` | 手機登入（Prisma 驗證密碼） |
| `/api/auth/create-custom-token` | 生成 Custom Token |
| `/api/auth/oauth/callback` | OAuth 登入回調 |

### 關鍵檔案

| 檔案 | 說明 |
|------|------|
| `src/lib/firebase.ts` | Frontend Firebase SDK |
| `src/lib/firebaseAdmin.ts` | Backend Firebase Admin SDK |
| `src/lib/prisma.ts` | Prisma Client |
| `prisma/schema.prisma` | 資料庫 Schema |

---

## 相關文件

- [快速開始](../QUICKSTART.md)
- [Firebase 設定指南](../FIREBASE_SETUP_GUIDE.md)
- [API 參考](../API_REFERENCE.md)
- [常見問題](../TROUBLESHOOTING.md)

---

## 決策者

- Henry Lee

## 最後更新

2025-11-26
