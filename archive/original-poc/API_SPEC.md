# 🔌 API 規格書

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔定義 Firebase Auth POC 的所有 API 端點、請求/回應格式和錯誤處理。

### 基礎資訊

- **基礎 URL**：`http://localhost:3000/api` (開發環境)
- **認證方式**：Firebase ID Token (通過 Authorization header)
- **Content-Type**：`application/json`

---

## 🔐 認證方式

### Bearer Token

所有需要認證的端點都需要在請求 header 中帶入 Firebase ID Token：

```
Authorization: Bearer <firebase_id_token>
```

### Token 獲取

使用 Firebase Client SDK：

```typescript
const user = auth.currentUser;
const token = await user.getIdToken();
// 在 API 請求時使用此 token
```

---

## 📚 API 端點清單

| 方法 | 端點 | 認證 | 說明 |
|------|------|------|------|
| POST | `/auth/login` | ❌ | 手機→Email 轉換 |
| POST | `/auth/register` | ❌ | 用戶註冊 |
| POST | `/auth/verify-token` | ✅ | 驗證並取得用戶資料 |
| POST | `/auth/logout` | ✅ | 登出 |
| GET | `/auth/me` | ✅ | 取得當前用戶資料 |
| POST | `/auth/check-phone` | ❌ | 檢查手機是否已註冊 |
| POST | `/auth/check-email` | ❌ | 檢查 Email 是否已註冊 |

---

## 1️⃣ 手機登入 API

### POST `/api/auth/login`

**說明**：將手機號碼轉換為 Email，用於 Firebase 登入

#### 請求

```typescript
POST /api/auth/login
Content-Type: application/json

{
  "phone": "0912345678",        // 台灣手機號碼（10位數字或E.164格式）
  "password": "SecurePass123!"  // 密碼
}
```

#### 回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "uid": "firebase-uid-123",
    "phoneNumber": "0912345678"
  }
}
```

#### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "PHONE_NOT_FOUND",
    "message": "此手機號碼未註冊"
  }
}
```

| 錯誤碼 | HTTP | 說明 |
|--------|------|------|
| PHONE_NOT_FOUND | 404 | 手機號碼未在系統中找到 |
| INVALID_PHONE_FORMAT | 400 | 手機號碼格式不正確 |
| INVALID_PASSWORD | 401 | 密碼錯誤 |
| INTERNAL_ERROR | 500 | 伺服器錯誤 |

#### 流程說明

```
1. Backend 接收 phone + password
2. 查詢 Firestore 找到對應的 email
3. 回傳 email 給 Frontend
4. Frontend 使用 email + password 登入 Firebase
```

---

## 2️⃣ Email 登入 (Frontend only)

使用 Firebase Client SDK 直接登入，不需要 Backend API：

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth';

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();
// 然後呼叫 verify-token 驗證
```

---

## 3️⃣ 驗證 Token API

### POST `/api/auth/verify-token`

**說明**：驗證 Firebase ID Token 並取得或建立用戶資料

#### 請求

```typescript
POST /api/auth/verify-token
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "uid": "firebase-uid-123"  // Firebase UID（可選，會從 token 解析）
}
```

#### 回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid-123",
    "email": "user@example.com",
    "phoneNumber": "0912345678",
    "displayName": "User Name",
    "loginMethods": ["phone", "email"],
    "phoneVerified": true,
    "emailVerified": false,
    "createdAt": "2025-11-18T10:00:00Z",
    "updatedAt": "2025-11-18T10:00:00Z"
  }
}
```

#### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "無效的 Token"
  }
}
```

| 錯誤碼 | HTTP | 說明 |
|--------|------|------|
| INVALID_TOKEN | 401 | Token 無效或過期 |
| USER_NOT_FOUND | 404 | 用戶在 Firestore 中不存在 |
| UNAUTHORIZED | 401 | 未提供認證 token |
| INTERNAL_ERROR | 500 | 伺服器錯誤 |

---

## 4️⃣ 用戶註冊 API

### POST `/api/auth/register`

**說明**：建立新用戶並存儲到 Firestore

#### 請求

```typescript
POST /api/auth/register
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

{
  "uid": "firebase-uid-123",
  "email": "user@example.com",
  "phoneNumber": "0912345678",        // 可選
  "displayName": "User Name",
  "loginMethod": "phone"               // 'phone' | 'email' | 'google' | 'facebook'
}
```

#### 回應 (201 Created)

```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid-123",
    "email": "user@example.com",
    "phoneNumber": "0912345678",
    "displayName": "User Name",
    "createdAt": "2025-11-18T10:00:00Z"
  }
}
```

#### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "EMAIL_EXISTS",
    "message": "此 Email 已被使用"
  }
}
```

| 錯誤碼 | HTTP | 說明 |
|--------|------|------|
| EMAIL_EXISTS | 409 | Email 已存在 |
| PHONE_EXISTS | 409 | 手機號碼已存在 |
| INVALID_INPUT | 400 | 輸入資料無效 |
| UNAUTHORIZED | 401 | 未提供認證 token |
| INTERNAL_ERROR | 500 | 伺服器錯誤 |

---

## 5️⃣ 取得當前用戶 API

### GET `/api/auth/me`

**說明**：取得當前登入用戶的資料

#### 請求

```typescript
GET /api/auth/me
Authorization: Bearer <firebase_id_token>
```

#### 回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "uid": "firebase-uid-123",
    "email": "user@example.com",
    "phoneNumber": "0912345678",
    "displayName": "User Name",
    "loginMethods": ["phone", "email"],
    "createdAt": "2025-11-18T10:00:00Z",
    "updatedAt": "2025-11-18T10:00:00Z"
  }
}
```

#### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未提供認證 token"
  }
}
```

---

## 6️⃣ 檢查手機是否已註冊 API

### POST `/api/auth/check-phone`

**說明**：檢查手機號碼是否已在系統中註冊

#### 請求

```typescript
POST /api/auth/check-phone
Content-Type: application/json

{
  "phoneNumber": "0912345678"
}
```

#### 回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "exists": true,
    "phoneNumber": "0912345678"
  }
}
```

#### 錯誤回應

```json
{
  "success": false,
  "error": {
    "code": "INVALID_PHONE_FORMAT",
    "message": "手機號碼格式不正確"
  }
}
```

---

## 7️⃣ 檢查 Email 是否已註冊 API

### POST `/api/auth/check-email`

**說明**：檢查 Email 是否已在系統中註冊

#### 請求

```typescript
POST /api/auth/check-email
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 回應 (200 OK)

```json
{
  "success": true,
  "data": {
    "exists": true,
    "email": "user@example.com"
  }
}
```

---

## 8️⃣ 登出 API

### POST `/api/auth/logout`

**說明**：伺服器端登出邏輯（大部分在 Frontend 進行）

#### 請求

```typescript
POST /api/auth/logout
Authorization: Bearer <firebase_id_token>
```

#### 回應 (200 OK)

```json
{
  "success": true,
  "message": "已成功登出"
}
```

---

## 🔄 OAuth 登入流程

### Google/Facebook/LINE OAuth（Frontend only）

使用 Firebase Client SDK：

#### Google 登入

```typescript
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const idToken = await result.user.getIdToken();

// 然後呼叫 verify-token
const response = await fetch('/api/auth/verify-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ uid: result.user.uid })
});
```

#### Facebook 登入

```typescript
import { signInWithPopup, FacebookAuthProvider } from 'firebase/auth';

const provider = new FacebookAuthProvider();
const result = await signInWithPopup(auth, provider);
const idToken = await result.user.getIdToken();

// 呼叫 verify-token（同上）
```

#### LINE 登入（Generic OAuth Provider）

```typescript
import { signInWithPopup, OAuthProvider } from 'firebase/auth';

// 在 Firebase Console 設定 Generic OAuth Provider: oidc.line
const provider = new OAuthProvider('oidc.line');

// 可選：設定 LINE 特定參數
provider.setCustomParameters({
  prompt: 'consent',
});

const result = await signInWithPopup(auth, provider);
const idToken = await result.user.getIdToken();

// 呼叫 verify-token（同上）
```

**LINE OAuth 配置需求**：
1. Firebase Console → Authentication → Sign-in method
2. 啟用 "Generic OAuth 2.0 Provider"
3. 配置：
   - Provider ID: `oidc.line`
   - Client ID: 你的 LINE Bot Channel ID
   - Client Secret: 你的 LINE Bot Channel Secret
   - Authorization URL: `https://web.line.me/web/login`
   - Token URL: `https://api.line.me/oauth2/v2.1/token`

---

## 📊 通用回應格式

### 成功回應

```json
{
  "success": true,
  "data": {
    // 實際資料
  }
}
```

### 失敗回應

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "人類可讀的錯誤訊息"
  }
}
```

---

## 🚨 錯誤代碼清單

### 驗證錯誤 (4xx)

| 代碼 | HTTP | 說明 |
|------|------|------|
| INVALID_INPUT | 400 | 輸入格式不正確 |
| INVALID_PHONE_FORMAT | 400 | 手機號碼格式不正確 |
| INVALID_EMAIL_FORMAT | 400 | Email 格式不正確 |
| UNAUTHORIZED | 401 | 缺少或無效的認證 |
| INVALID_TOKEN | 401 | Token 無效或過期 |
| FORBIDDEN | 403 | 無權訪問資源 |
| NOT_FOUND | 404 | 資源不存在 |
| CONFLICT | 409 | 資源衝突（如重複的 Email） |

### 伺服器錯誤 (5xx)

| 代碼 | HTTP | 說明 |
|------|------|------|
| INTERNAL_ERROR | 500 | 伺服器內部錯誤 |
| SERVICE_UNAVAILABLE | 503 | 服務暫時不可用 |

---

## 🔒 安全指南

### Token 處理

1. 始終通過 HTTPS 傳輸 Token
2. 不要在 URL 或 localStorage 中存儲 Token（使用 httpOnly cookie）
3. Token 過期時（1 小時），自動刷新

### 密碼要求

- 最少 6 字元（Firebase 最小要求）
- 建議：至少 8 字元、大小寫混合、數字和特殊符號

### 數據驗證

- Frontend：基本格式驗證
- Backend：完整的輸入驗證和 SQL/XSS 防護

---

## 📝 範例實作

### 完整登入流程（手機 + 密碼）

```typescript
// 1. 輸入手機和密碼
const phone = '0912345678';
const password = 'SecurePass123!';

// 2. 呼叫後端 API 轉換手機為 Email
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone, password })
});

const { data: { email } } = await loginResponse.json();

// 3. 使用 Firebase 登入
import { signInWithEmailAndPassword } from 'firebase/auth';
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// 4. 取得 Token
const idToken = await userCredential.user.getIdToken();

// 5. 驗證 Token 並取得用戶資料
const verifyResponse = await fetch('/api/auth/verify-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ uid: userCredential.user.uid })
});

const { data: user } = await verifyResponse.json();

// 6. 登入完成
console.log('User logged in:', user);
```

---

## 📚 相關文檔

- [需求規格](./REQUIREMENTS.md)
- [架構設計](./ARCHITECTURE.md)
- [Firestore 結構](./FIRESTORE_SCHEMA.md)

---

_此文檔基於 2025-11-18 的討論_
