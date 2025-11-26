# API 參考文件

本文件記錄所有認證相關的 API 端點。

---

## 目錄

- [OAuth 回調](#oauth-回調)
- [手機註冊](#手機註冊)
- [Email 登入](#email-登入)
- [手機登入](#手機登入)
- [Custom Token](#custom-token)
- [Provider 綁定](#provider-綁定)
- [Provider 解除綁定](#provider-解除綁定)
- [通用錯誤](#通用錯誤)

---

## OAuth 回調

**端點**：`POST /api/auth/oauth/callback`

**說明**：處理 OAuth 登入（Google/GitHub/Facebook）後的回調，創建或更新用戶資料

### 請求標頭

```
Authorization: Bearer <Firebase ID Token>
```

### 請求參數

```json
{
  "providerType": "google"
}
```

| 參數 | 類型 | 必填 | 可選值 |
|------|------|------|--------|
| `providerType` | string | ✅ | `google` / `github` / `facebook` / `line` |

### 成功回應 (200)

#### 已註冊用戶

```json
{
  "needsPhoneNumber": false,
  "needsPassword": false,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "displayName": "User Name"
  }
}
```

#### 需要綁定手機

```json
{
  "needsPhoneNumber": true,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com"
  }
}
```

#### 需要設定密碼

```json
{
  "needsPassword": true,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "phoneNumber": "+886912345678"
  }
}
```

---

## 手機註冊

**端點**：`POST /api/auth/register-phone`

**說明**：透過已驗證的手機號碼創建新帳號（需先完成 Firebase Phone Auth OTP 驗證）

### 請求參數

```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "phoneNumber": "+886912345678",
  "password": "securePassword123",
  "displayName": "User Name"
}
```

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `uid` | string | ✅ | Firebase UID（從 Phone Auth 取得） |
| `email` | string | ✅ | Email 地址 |
| `phoneNumber` | string | ✅ | 手機號碼（E.164 格式） |
| `password` | string | ✅ | 密碼（至少 6 字元） |
| `displayName` | string | ❌ | 顯示名稱 |

### 成功回應 (200)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "emailVerified": false,
    "phoneVerified": true
  }
}
```

### 錯誤回應

#### 400 - 缺少必填欄位

```json
{
  "success": false,
  "error": "所有欄位為必填（displayName 除外）"
}
```

#### 409 - Email 已被使用

```json
{
  "success": false,
  "error": "此 Email 已被註冊"
}
```

#### 409 - 手機號碼已被使用

```json
{
  "success": false,
  "error": "此手機號碼已被註冊"
}
```

---

## Email 登入

**端點**：`POST /api/auth/login-email`

**說明**：使用 Email + 密碼登入

### 請求參數

```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `email` | string | ✅ | Email 地址 |
| `password` | string | ✅ | 密碼 |

### 成功回應 (200)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "emailVerified": true,
    "phoneVerified": true
  }
}
```

### 錯誤回應

#### 400 - 帳號未設定密碼

```json
{
  "success": false,
  "error": "此帳號尚未設定密碼"
}
```

#### 401 - 驗證失敗

```json
{
  "success": false,
  "error": "Email 或密碼錯誤"
}
```

---

## 手機登入

**端點**：`POST /api/auth/login-phone`

**說明**：使用手機號碼 + 密碼登入

### 請求參數

```json
{
  "phoneNumber": "+886912345678",
  "password": "securePassword123"
}
```

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `phoneNumber` | string | ✅ | 手機號碼（E.164 格式） |
| `password` | string | ✅ | 密碼 |

### 成功回應 (200)

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "emailVerified": true,
    "phoneVerified": true
  }
}
```

### 錯誤回應

#### 401 - 驗證失敗

```json
{
  "success": false,
  "error": "手機號碼或密碼錯誤"
}
```

---

## Custom Token

**端點**：`POST /api/auth/create-custom-token`

**說明**：生成 Firebase Custom Token，用於密碼登入後建立 Firebase Session

### 請求標頭

```
Authorization: Bearer <JWT Token>
```

### 成功回應 (200)

```json
{
  "success": true,
  "customToken": "eyJhbGciOiJSUzI1NiIs..."
}
```

### 使用方式

```typescript
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase';

// 取得 Custom Token 後
const { customToken } = await response.json();

// 建立 Firebase Session
await signInWithCustomToken(auth, customToken);
```

---

## Provider 綁定

**端點**：`POST /api/auth/link-provider`

**說明**：將 OAuth Provider 綁定到現有帳號

### 請求標頭

```
Authorization: Bearer <Firebase ID Token>
```

### 請求參數

```json
{
  "provider": "google"
}
```

| 參數 | 類型 | 必填 | 可選值 |
|------|------|------|--------|
| `provider` | string | ✅ | `google` / `github` / `facebook` / `line` |

### 前置條件

前端必須先使用 `linkWithPopup()` 完成 Firebase OAuth 綁定：

```typescript
import { linkWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const provider = new GoogleAuthProvider();
await linkWithPopup(auth.currentUser, provider);

// 然後呼叫 API 更新 Prisma 記錄
```

### 成功回應 (200)

```json
{
  "success": true,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "googleId": "google-user-id",
    "facebookId": null,
    "lineId": null
  }
}
```

### 錯誤回應

#### 409 - Provider 已被其他用戶使用

```json
{
  "success": false,
  "error": "此 Google 帳號已被其他用戶綁定"
}
```

---

## Provider 解除綁定

**端點**：`POST /api/auth/unlink-provider`

**說明**：解除 OAuth Provider 綁定（需至少保留一種登入方式）

### 請求標頭

```
Authorization: Bearer <Firebase ID Token>
```

### 請求參數

```json
{
  "provider": "google"
}
```

### 成功回應 (200)

```json
{
  "success": true,
  "user": {
    "uid": "firebase-uid",
    "email": "user@example.com",
    "googleId": null,
    "facebookId": "facebook-user-id"
  }
}
```

### 錯誤回應

#### 400 - 無法解除綁定

```json
{
  "success": false,
  "error": "無法解除綁定：至少需保留一種登入方式",
  "hint": "建議先設定密碼後再解除 OAuth 綁定"
}
```

---

## 通用錯誤

### 401 - 未授權

```json
{
  "success": false,
  "error": "未提供認證資訊"
}
```

### 401 - Token 無效

```json
{
  "success": false,
  "error": "ID Token 無效或已過期"
}
```

### 404 - 用戶不存在

```json
{
  "success": false,
  "error": "用戶不存在"
}
```

### 500 - 伺服器錯誤

```json
{
  "success": false,
  "error": "伺服器錯誤，請稍後再試"
}
```

---

## 環境變數需求

所有 API 端點需要以下環境變數：

```bash
# Firebase Admin SDK（推薦）
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Database
DATABASE_URL="file:/absolute/path/to/dev.db"

# JWT Secret
JWT_SECRET="your-jwt-secret"
```

---

## 開發工具

### Prisma Studio

```bash
npx prisma studio  # http://localhost:5556
```

### 用戶管理介面

```
http://localhost:3000/dev/users
```

---

## 相關文件

- [快速開始](./QUICKSTART.md)
- [認證架構決策](./decisions/001-hybrid-auth-architecture.md)
- [Firebase 設定指南](./FIREBASE_SETUP_GUIDE.md)
- [常見問題](./TROUBLESHOOTING.md)

---

**最後更新**：2025-11-26
