# OAuth 認證整合指南

本文檔詳細說明 Firebase OAuth 認證（Google、Facebook、LINE）的完整流程，包括註冊、登入、多帳號綁定與解綁。

---

## 目錄

1. [架構概覽](#架構概覽)
2. [OAuth 註冊流程](#oauth-註冊流程)
3. [OAuth 登入流程](#oauth-登入流程)
4. [多帳號綁定流程](#多帳號綁定流程)
5. [解除綁定流程](#解除綁定流程)
6. [API 端點說明](#api-端點說明)
7. [資料庫結構](#資料庫結構)
8. [前端整合](#前端整合)
9. [錯誤處理](#錯誤處理)
10. [安全機制](#安全機制)

---

## 架構概覽

### 系統架構圖

```
┌─────────────┐
│   用戶      │
└──────┬──────┘
       │ 點擊 OAuth 按鈕
       ▼
┌─────────────────────────────────────────┐
│   前端 (Next.js Client Component)       │
│  ─────────────────────────────────────  │
│  • signInWithPopup()                    │
│  • linkWithPopup()                      │
│  • unlink()                             │
└──────┬──────────────────────────────────┘
       │ ID Token
       ▼
┌─────────────────────────────────────────┐
│   Firebase Authentication               │
│  ─────────────────────────────────────  │
│  • OAuth Provider 管理                  │
│  • ID Token 生成                        │
│  • providerData 儲存                    │
└──────┬──────────────────────────────────┘
       │ ID Token + providerData
       ▼
┌─────────────────────────────────────────┐
│   後端 API (Next.js API Routes)         │
│  ─────────────────────────────────────  │
│  • verifyIdToken()                      │
│  • Provider ID 衝突檢查                 │
│  • 安全驗證                             │
└──────┬──────────────────────────────────┘
       │ Provider ID
       ▼
┌─────────────────────────────────────────┐
│   Prisma Database                       │
│  ─────────────────────────────────────  │
│  • 儲存 Provider ID (googleId, etc.)    │
│  • @unique 約束                         │
│  • 用戶資料管理                         │
└─────────────────────────────────────────┘
```

### 關鍵設計決策

1. **雙層資料儲存**：Firebase 處理 OAuth，Prisma 儲存 Provider ID
2. **Provider ID 唯一性**：防止同一個 OAuth 帳號綁定到多個用戶
3. **最後登入方式保護**：至少保留一種登入方式（密碼或 OAuth）
4. **雙重驗證**：Firebase ID Token + Prisma 資料庫檢查

---

## OAuth 註冊流程

### 流程圖

```
用戶點擊「使用 Google/Facebook/LINE 登入」
    ↓
[前端] signInWithPopup(auth, provider)
    ↓
Firebase OAuth 授權頁面（Popup）
    ↓ (用戶授權)
Firebase 建立 User（uid, email, providerData）
    ↓
[前端] 取得 ID Token
    ↓
[前端] POST /api/auth/oauth/verify-token
    ├─ Body: { idToken }
    └─ 包含 providerData (providerId, email, name, picture)
    ↓
[後端] adminAuth.verifyIdToken(idToken)
    ↓
[後端] 檢查 Provider ID 是否已被其他用戶使用
    ├─ 已使用 → 回傳 409 錯誤
    └─ 未使用 → 繼續
    ↓
[後端] Prisma 檢查用戶是否存在（by uid）
    ├─ 不存在 → 建立新用戶
    └─ 存在 → 更新用戶資料
    ↓
[後端] 儲存 Provider ID 到對應欄位
    ├─ Google → googleId
    ├─ Facebook → facebookId
    └─ LINE → lineId
    ↓
[後端] 回傳 { token, user, isNewUser }
    ↓
[前端] 判斷 isNewUser
    ├─ true → 導向 /register/complete（綁定手機）
    └─ false → 導向 /dashboard
```

### 前端代碼範例

```typescript
// components/auth/OAuthButtons.tsx
const handleOAuthLogin = async (providerType: 'google' | 'facebook' | 'line') => {
  try {
    // 1. 選擇 Provider
    let provider;
    if (providerType === 'google') {
      provider = new GoogleAuthProvider();
    } else if (providerType === 'facebook') {
      provider = new FacebookAuthProvider();
    } else {
      provider = new OAuthProvider('oidc.line');
    }

    // 2. Firebase OAuth Popup
    const result = await signInWithPopup(auth, provider);

    // 3. 取得 ID Token
    const idToken = await result.user.getIdToken();

    // 4. 呼叫後端驗證 API
    const response = await fetch('/api/auth/oauth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    // 5. 導向對應頁面
    if (data.isNewUser) {
      router.push('/register/complete'); // 新用戶需綁定手機
    } else {
      router.push('/dashboard'); // 現有用戶直接登入
    }
  } catch (error) {
    console.error('OAuth 登入失敗:', error);
  }
};
```

### 後端 API 處理

```typescript
// src/app/api/auth/oauth/verify-token/route.ts
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  // 1. 驗證 Firebase ID Token
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const { uid, email, name, picture, firebase } = decodedToken;
  const providerType = firebase.sign_in_provider;
  const providerId = firebase.identities?.[providerType]?.[0];

  // 2. 檢查 Provider ID 衝突
  const existingUser = await prisma.user.findUnique({
    where:
      providerType === 'google.com' ? { googleId: providerId } :
      providerType === 'facebook.com' ? { facebookId: providerId } :
      { lineId: providerId }
  });

  if (existingUser && existingUser.uid !== uid) {
    return NextResponse.json({
      success: false,
      error: `此 ${providerType} 帳號已被其他用戶綁定`
    }, { status: 409 });
  }

  // 3. 建立或更新用戶
  const user = await prisma.user.upsert({
    where: { uid },
    create: {
      uid,
      email,
      displayName: name,
      photoURL: picture,
      googleId: providerType === 'google.com' ? providerId : null,
      facebookId: providerType === 'facebook.com' ? providerId : null,
      lineId: providerType === 'oidc.line' ? providerId : null,
      emailVerified: !!email,
      phoneVerified: false,
    },
    update: {
      email,
      displayName: name,
      photoURL: picture,
      lastLoginAt: new Date(),
    }
  });

  // 4. 回傳結果
  return NextResponse.json({
    token: generateToken(user),
    user,
    isNewUser: !user.phoneNumber // 沒有手機號碼視為新用戶
  });
}
```

### 資料庫變更

```sql
-- 新用戶建立時
INSERT INTO users (
  uid, email, displayName, photoURL,
  googleId, emailVerified, phoneVerified,
  createdAt, updatedAt
) VALUES (
  'firebase_uid',
  'user@example.com',
  'User Name',
  'https://photo.url',
  '115466136227865435529', -- Google Provider ID
  true,
  false,
  NOW(),
  NOW()
);
```

---

## OAuth 登入流程

### 流程圖

```
用戶點擊「使用 Google/Facebook/LINE 登入」
    ↓
[前端] signInWithPopup(auth, provider)
    ↓
Firebase OAuth 授權（已授權過會快速完成）
    ↓
Firebase 回傳現有 User
    ↓
[前端] 取得 ID Token
    ↓
[前端] POST /api/auth/oauth/verify-token
    ↓
[後端] verifyIdToken + 檢查 Provider ID
    ↓
[後端] 找到現有用戶（by uid）
    ↓
[後端] 更新 lastLoginAt
    ↓
[後端] 回傳 { token, user, isNewUser: false }
    ↓
[前端] 導向 /dashboard
```

### 與註冊流程的差異

| 項目 | 註冊流程 | 登入流程 |
|------|---------|---------|
| Firebase User | 新建立 | 已存在 |
| Prisma 用戶 | 建立 (INSERT) | 更新 (UPDATE) |
| isNewUser | true | false |
| 導向頁面 | /register/complete | /dashboard |
| 需要綁定手機 | ✅ 是 | ❌ 否 |

### 快速登入判斷邏輯

```typescript
// 判斷是否為新用戶
const isNewUser = !user.phoneNumber || !user.phoneVerified;

// 新用戶需完成註冊
if (isNewUser) {
  router.push('/register/complete');
} else {
  router.push('/dashboard');
}
```

---

## 多帳號綁定流程

### 使用場景

用戶已經用 Google 登入，現在想綁定 Facebook 帳號，讓兩種方式都能登入。

### 流程圖

```
用戶在 /settings 頁面點擊「綁定 Facebook」
    ↓
[前端] linkWithPopup(auth.currentUser, facebookProvider)
    ↓
Firebase 彈出 Facebook OAuth 授權頁面
    ↓ (用戶授權)
Firebase 將 Facebook 綁定到當前用戶
    ↓
[前端] 取得新的 ID Token (forceRefresh)
    ↓
[前端] POST /api/auth/link-provider
    ├─ Headers: { Authorization: "Bearer {idToken}" }
    └─ Body: { provider: "facebook" }
    ↓
[後端] verifyIdToken(idToken)
    ↓
[後端] 從 Firebase Admin SDK 獲取 providerData
    ↓
[後端] 檢查 Provider ID 是否已被其他用戶使用
    ├─ 已使用 → 回傳 409 錯誤
    └─ 未使用 → 繼續
    ↓
[後端] UPDATE users SET facebookId = ? WHERE uid = ?
    ↓
[後端] 回傳更新後的用戶資料
    ↓
[前端] 刷新用戶資料，UI 顯示已綁定
```

### 前端代碼

```typescript
// src/app/settings/page.tsx
const handleLink = async (provider: 'google' | 'facebook' | 'line') => {
  try {
    // 1. 選擇 Provider
    let authProvider;
    if (provider === 'google') {
      authProvider = new GoogleAuthProvider();
    } else if (provider === 'facebook') {
      authProvider = new FacebookAuthProvider();
    } else {
      authProvider = new OAuthProvider('oidc.line');
    }

    // 2. Firebase 端綁定
    const result = await linkWithPopup(auth.currentUser!, authProvider);

    // 3. 取得新的 ID Token（包含更新的 providerData）
    const idToken = await result.user.getIdToken(true); // forceRefresh

    // 4. 呼叫後端同步 Prisma
    const response = await fetch('/api/auth/link-provider', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error);
    }

    // 5. 刷新用戶資料
    await fetchUserData();
    setSuccess(`成功綁定 ${provider.toUpperCase()}！`);
  } catch (err: any) {
    // 錯誤處理（見錯誤處理章節）
    if (err.code === 'auth/popup-closed-by-user') {
      return; // 靜默處理
    }
    setError(err.message);
  }
};
```

### 後端 API

```typescript
// src/app/api/auth/link-provider/route.ts
export async function POST(req: NextRequest) {
  // 1. 驗證 Authorization Header
  const authHeader = req.headers.get('Authorization');
  const idToken = authHeader?.split('Bearer ')[1];

  // 2. 驗證 Firebase ID Token
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const { uid } = decodedToken;

  // 3. 解析請求
  const { provider } = await req.json();

  // 4. 從 Firebase Admin SDK 獲取最新 providerData
  const firebaseUser = await adminAuth.getUser(uid);
  const providerIdMap = {
    google: 'google.com',
    facebook: 'facebook.com',
    line: 'oidc.line'
  };

  const firebaseProviderId = providerIdMap[provider];
  const providerInfo = firebaseUser.providerData.find(
    p => p.providerId === firebaseProviderId
  );

  if (!providerInfo) {
    return NextResponse.json({
      success: false,
      error: 'Firebase 中未找到綁定資料'
    }, { status: 400 });
  }

  const providerId = providerInfo.uid;

  // 5. 檢查 Provider ID 衝突
  const existingUser = await prisma.user.findUnique({
    where:
      provider === 'google' ? { googleId: providerId } :
      provider === 'facebook' ? { facebookId: providerId } :
      { lineId: providerId }
  });

  if (existingUser && existingUser.uid !== uid) {
    return NextResponse.json({
      success: false,
      error: `此 ${provider.toUpperCase()} 帳號已被其他用戶綁定`
    }, { status: 409 });
  }

  // 6. 更新 Prisma 資料庫
  const providerKey = `${provider}Id`;
  const updatedUser = await prisma.user.update({
    where: { uid },
    data: { [providerKey]: providerId }
  });

  return NextResponse.json({
    success: true,
    user: updatedUser
  });
}
```

### 資料庫變更

```sql
-- 綁定前
SELECT uid, googleId, facebookId, lineId FROM users WHERE uid = 'xxx';
-- 結果: googleId = '123...', facebookId = NULL, lineId = NULL

-- 執行綁定
UPDATE users
SET facebookId = '456...', updatedAt = NOW()
WHERE uid = 'xxx';

-- 綁定後
SELECT uid, googleId, facebookId, lineId FROM users WHERE uid = 'xxx';
-- 結果: googleId = '123...', facebookId = '456...', lineId = NULL
```

---

## 解除綁定流程

### 流程圖

```
用戶在 /settings 頁面點擊「解除綁定 Facebook」
    ↓
[前端] 發送確認對話框
    ↓ (用戶確認)
[前端] POST /api/auth/unlink-provider
    ├─ Headers: { Authorization: "Bearer {idToken}" }
    └─ Body: { provider: "facebook" }
    ↓
[後端] verifyIdToken(idToken)
    ↓
[後端] 查詢用戶資料（包含 password, googleId, facebookId, lineId）
    ↓
[後端] 檢查是否至少保留一種登入方式
    ├─ 計算：hasPassword || otherProviders > 0
    ├─ 不滿足 → 回傳 400 錯誤（無法解除綁定）
    └─ 滿足 → 繼續
    ↓
[後端] UPDATE users SET facebookId = NULL WHERE uid = ?
    ↓
[後端] 回傳成功
    ↓
[前端] unlink(auth.currentUser, 'facebook.com')
    ↓
Firebase 解除 Provider 綁定
    ↓
[前端] 刷新用戶資料，UI 更新
```

### 安全檢查邏輯

```typescript
// 後端檢查邏輯
const hasPassword = user.password !== null;
const otherProviders = [
  user.googleId !== null && provider !== 'google',
  user.facebookId !== null && provider !== 'facebook',
  user.lineId !== null && provider !== 'line'
].filter(Boolean).length;

// 必須滿足：密碼 OR 其他 Provider
if (!hasPassword && otherProviders === 0) {
  return NextResponse.json({
    success: false,
    error: '無法解除綁定：至少需保留一種登入方式',
    hint: '建議先設定密碼後再解除 OAuth 綁定'
  }, { status: 400 });
}
```

### 前端代碼

```typescript
// src/app/settings/page.tsx
const handleUnlink = async (provider: 'google' | 'facebook' | 'line') => {
  try {
    // 1. 二次確認
    const confirmed = confirm(
      `確定要解除 ${provider.toUpperCase()} 綁定？\n\n` +
      `解除後將無法使用此方式登入。`
    );
    if (!confirmed) return;

    // 2. 呼叫後端 API（會檢查是否能解綁）
    const idToken = await auth.currentUser!.getIdToken();
    const response = await fetch('/api/auth/unlink-provider', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ provider })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error);
    }

    // 3. Firebase 端解綁
    const providerIdMap = {
      google: 'google.com',
      facebook: 'facebook.com',
      line: 'oidc.line'
    };
    await unlink(auth.currentUser!, providerIdMap[provider]);

    // 4. 刷新用戶資料
    await fetchUserData();
    setSuccess(`成功解除 ${provider.toUpperCase()} 綁定`);
  } catch (err: any) {
    setError(err.message);
  }
};
```

### 後端 API

```typescript
// src/app/api/auth/unlink-provider/route.ts
export async function POST(req: NextRequest) {
  // 1. 驗證用戶身份
  const authHeader = req.headers.get('Authorization');
  const idToken = authHeader?.split('Bearer ')[1];
  const decodedToken = await adminAuth.verifyIdToken(idToken);
  const { uid } = decodedToken;

  // 2. 解析請求
  const { provider } = await req.json();

  // 3. 查詢用戶資料
  const user = await prisma.user.findUnique({
    where: { uid },
    select: {
      uid: true,
      password: true,
      googleId: true,
      facebookId: true,
      lineId: true
    }
  });

  // 4. 檢查是否至少保留一種登入方式
  const hasPassword = user.password !== null;
  const otherProviders = [
    user.googleId !== null && provider !== 'google',
    user.facebookId !== null && provider !== 'facebook',
    user.lineId !== null && provider !== 'line'
  ].filter(Boolean).length;

  if (!hasPassword && otherProviders === 0) {
    return NextResponse.json({
      success: false,
      error: '無法解除綁定：至少需保留一種登入方式',
      hint: '建議先設定密碼後再解除 OAuth 綁定'
    }, { status: 400 });
  }

  // 5. 更新資料庫
  const providerKey = `${provider}Id`;
  const updatedUser = await prisma.user.update({
    where: { uid },
    data: { [providerKey]: null }
  });

  return NextResponse.json({
    success: true,
    user: updatedUser
  });
}
```

---

## API 端點說明

### 1. OAuth 登入/註冊

**端點**：`POST /api/auth/oauth/verify-token`

**描述**：驗證 Firebase ID Token，建立或更新用戶，處理 OAuth 登入/註冊

**請求**：
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**回應**（成功）：
```json
{
  "token": "backend_jwt_token",
  "user": {
    "uid": "firebase_uid",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "emailVerified": true,
    "phoneVerified": true,
    "displayName": "User Name",
    "photoURL": "https://...",
    "googleId": "115466...",
    "facebookId": null,
    "lineId": null
  },
  "isNewUser": false
}
```

**回應**（Provider ID 衝突）：
```json
{
  "success": false,
  "error": "此 google.com 帳號已被其他用戶綁定"
}
```
**狀態碼**：409

---

### 2. 綁定 Provider

**端點**：`POST /api/auth/link-provider`

**描述**：將 OAuth Provider 綁定到現有帳號

**請求**：
```json
Headers: {
  "Authorization": "Bearer {firebase_id_token}"
}

Body: {
  "provider": "google" | "facebook" | "line"
}
```

**回應**（成功）：
```json
{
  "success": true,
  "user": {
    "uid": "...",
    "googleId": "115466...",
    "facebookId": "122096...",
    "lineId": null
  }
}
```

**回應**（衝突）：
```json
{
  "success": false,
  "error": "此 FACEBOOK 帳號已被其他用戶綁定"
}
```
**狀態碼**：409

**回應**（Firebase 未綁定）：
```json
{
  "success": false,
  "error": "Firebase 中未找到 google 綁定資料，請確認已完成 Firebase linkWithPopup"
}
```
**狀態碼**：400

---

### 3. 解除綁定

**端點**：`POST /api/auth/unlink-provider`

**描述**：解除 OAuth Provider 綁定

**請求**：
```json
Headers: {
  "Authorization": "Bearer {firebase_id_token}"
}

Body: {
  "provider": "google" | "facebook" | "line"
}
```

**回應**（成功）：
```json
{
  "success": true,
  "user": {
    "uid": "...",
    "googleId": null,
    "facebookId": "122096...",
    "lineId": null
  }
}
```

**回應**（無法解除）：
```json
{
  "success": false,
  "error": "無法解除綁定：至少需保留一種登入方式",
  "hint": "建議先設定密碼後再解除 OAuth 綁定"
}
```
**狀態碼**：400

---

### 4. 取得用戶資料

**端點**：`GET /api/auth/me`

**描述**：取得當前用戶完整資料

**請求**：
```json
Headers: {
  "Authorization": "Bearer {firebase_id_token}"
}
```

**回應**：
```json
{
  "success": true,
  "user": {
    "uid": "...",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "displayName": "User Name",
    "photoURL": "https://...",
    "emailVerified": true,
    "phoneVerified": true,
    "googleId": "115466...",
    "facebookId": "122096...",
    "lineId": null,
    "hasPassword": true
  }
}
```

---

## 資料庫結構

### User Model

```prisma
model User {
  id              Int       @id @default(autoincrement())
  uid             String    @unique       // Firebase UID
  email           String?   @unique       // Email 地址
  phoneNumber     String?   @unique       // 手機號碼（國際格式）
  password        String?                 // bcrypt hash（OAuth 用戶為 null）

  // OAuth Provider IDs
  googleId        String?   @unique       // Google Provider ID
  facebookId      String?   @unique       // Facebook Provider ID
  lineId          String?   @unique       // LINE Provider ID

  // 基本資訊
  displayName     String?                 // 顯示名稱
  photoURL        String?                 // 頭像 URL

  // 驗證狀態
  emailVerified   Boolean   @default(false)
  phoneVerified   Boolean   @default(false)

  // 時間戳記
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLoginAt     DateTime?

  @@index([email])
  @@index([phoneNumber])
  @@index([uid])
}
```

### 重要欄位說明

| 欄位 | 說明 | 範例值 |
|------|------|--------|
| `uid` | Firebase UID，全域唯一 | `IeBHcjoRGsQPW0jqHzw0voW8vRI3` |
| `googleId` | Google Provider ID，@unique 約束 | `115466136227865435529` |
| `facebookId` | Facebook Provider ID，@unique 約束 | `122096772393130884` |
| `lineId` | LINE Provider ID，@unique 約束 | `Ub47bb1eba7f7336a65733fca42258bc7` |
| `password` | bcrypt hash，OAuth 用戶為 null | `$2b$10$...` 或 `null` |

### 索引策略

```sql
-- 主鍵索引
CREATE UNIQUE INDEX users_id_key ON users(id);

-- 唯一索引（防止重複）
CREATE UNIQUE INDEX users_uid_key ON users(uid);
CREATE UNIQUE INDEX users_email_key ON users(email);
CREATE UNIQUE INDEX users_phoneNumber_key ON users(phoneNumber);
CREATE UNIQUE INDEX users_googleId_key ON users(googleId);
CREATE UNIQUE INDEX users_facebookId_key ON users(facebookId);
CREATE UNIQUE INDEX users_lineId_key ON users(lineId);

-- 查詢優化索引
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX users_phoneNumber_idx ON users(phoneNumber);
CREATE INDEX users_uid_idx ON users(uid);
```

---

## 前端整合

### 1. OAuth 登入按鈕元件

**檔案**：`src/components/auth/OAuthButtons.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function OAuthButtons() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = async (
    providerType: 'google' | 'facebook' | 'line'
  ) => {
    setLoading(providerType);
    setError(null);

    try {
      // 選擇 Provider
      let provider;
      if (providerType === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerType === 'facebook') {
        provider = new FacebookAuthProvider();
      } else {
        provider = new OAuthProvider('oidc.line');
      }

      // Firebase OAuth
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // 呼叫後端 API
      const response = await fetch('/api/auth/oauth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登入失敗');
      }

      // 導向對應頁面
      if (data.isNewUser) {
        router.push('/register/complete');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('OAuth 登入失敗:', err);
      setError(err.message || '登入失敗，請稍後再試');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Google */}
      <button
        onClick={() => handleOAuthLogin('google')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        {loading === 'google' ? '處理中...' : '使用 Google 繼續'}
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleOAuthLogin('facebook')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading === 'facebook' ? '處理中...' : '使用 Facebook 繼續'}
      </button>

      {/* LINE */}
      <button
        onClick={() => handleOAuthLogin('line')}
        disabled={loading !== null}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
      >
        {loading === 'line' ? '處理中...' : '使用 LINE 繼續'}
      </button>

      {/* 錯誤訊息 */}
      {error && (
        <div className="text-sm text-red-600 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
```

### 2. 設定頁面

**檔案**：`src/app/settings/page.tsx`

**關鍵功能**：
- 顯示已綁定的 Providers
- 顯示可綁定的 Providers
- 綁定/解綁按鈕
- 錯誤處理

**使用方式**：
1. 用戶登入後，從 Dashboard 導航到 `/settings`
2. 查看當前綁定狀態
3. 點擊「綁定」按鈕綁定新 Provider
4. 點擊「解除綁定」按鈕解除現有 Provider

---

## 錯誤處理

### Firebase OAuth 錯誤

#### 1. `auth/popup-closed-by-user`
**原因**：用戶關閉了 OAuth popup 視窗

**處理**：靜默處理，不顯示錯誤訊息
```typescript
if (err.code === 'auth/popup-closed-by-user') {
  console.log('用戶取消操作');
  return; // 靜默返回
}
```

#### 2. `auth/cancelled-popup-request`
**原因**：快速點擊多次導致多個 popup 請求

**處理**：靜默處理
```typescript
if (err.code === 'auth/cancelled-popup-request') {
  console.log('取消前一個 popup 請求');
  return;
}
```

#### 3. `auth/popup-blocked`
**原因**：瀏覽器阻擋了彈出視窗

**處理**：提示用戶允許彈出視窗
```typescript
if (err.code === 'auth/popup-blocked') {
  setError('瀏覽器阻擋了彈出視窗，請允許彈出視窗後再試');
  return;
}
```

#### 4. `auth/account-exists-with-different-credential`
**原因**：Email 已被其他登入方式使用

**處理**：提示用戶先解除原有綁定
```typescript
if (err.code === 'auth/account-exists-with-different-credential') {
  setError('此 Email 已被其他登入方式使用，請先解除原有綁定');
  return;
}
```

### 後端 API 錯誤

#### 1. Provider ID 衝突（409）
**回應**：
```json
{
  "success": false,
  "error": "此 google.com 帳號已被其他用戶綁定"
}
```

**前端處理**：
```typescript
if (response.status === 409) {
  setError('此 OAuth 帳號已被其他用戶使用');
}
```

#### 2. 無法解除綁定（400）
**回應**：
```json
{
  "success": false,
  "error": "無法解除綁定：至少需保留一種登入方式",
  "hint": "建議先設定密碼後再解除 OAuth 綁定"
}
```

**前端處理**：
```typescript
if (response.status === 400) {
  const data = await response.json();
  setError(data.error);
  if (data.hint) {
    console.log('提示:', data.hint);
  }
}
```

#### 3. 認證失敗（401）
**回應**：
```json
{
  "success": false,
  "error": "ID Token 無效或已過期"
}
```

**前端處理**：
```typescript
if (response.status === 401) {
  // 導向登入頁面
  router.push('/login');
}
```

---

## 安全機制

### 1. Provider ID 唯一性

**資料庫層級**：
```prisma
googleId  String? @unique
facebookId String? @unique
lineId    String? @unique
```

**應用層級**：
```typescript
// 檢查 Provider ID 是否已被使用
const existingUser = await prisma.user.findUnique({
  where: { googleId: providerId }
});

if (existingUser && existingUser.uid !== uid) {
  throw new Error('Provider ID 已被其他用戶使用');
}
```

### 2. 最後登入方式保護

**邏輯**：
```typescript
const hasPassword = user.password !== null;
const hasOtherProviders =
  (user.googleId !== null && provider !== 'google') ||
  (user.facebookId !== null && provider !== 'facebook') ||
  (user.lineId !== null && provider !== 'line');

// 必須滿足：密碼 OR 其他 Provider
if (!hasPassword && !hasOtherProviders) {
  throw new Error('無法解除最後一種登入方式');
}
```

### 3. Firebase ID Token 驗證

**每個 API 都驗證 Token**：
```typescript
const decodedToken = await adminAuth.verifyIdToken(idToken);
const { uid } = decodedToken;

// 確保操作的是當前用戶
const user = await prisma.user.findUnique({ where: { uid } });
```

### 4. 雙重驗證

**Firebase 層級**：
- OAuth Provider 綁定
- providerData 儲存

**Prisma 層級**：
- Provider ID 儲存
- @unique 約束
- 資料一致性檢查

### 5. CORS 與 CSRF 保護

**Next.js API Routes 預設保護**：
- Same-Origin Policy
- CSRF Token（Next.js 自動處理）

**額外檢查**：
```typescript
// 檢查 Referer Header
const referer = req.headers.get('referer');
if (!referer?.startsWith(process.env.NEXT_PUBLIC_APP_URL)) {
  return NextResponse.json({ error: '無效的請求來源' }, { status: 403 });
}
```

---

## 常見問題 (FAQ)

### Q1: 為什麼要同時儲存在 Firebase 和 Prisma？

**A**: 雙層架構的優勢：
- **Firebase**：處理 OAuth 流程和 token 驗證
- **Prisma**：支援反向查詢（用 Provider ID 找用戶）
- **一致性**：兩邊資料保持同步

### Q2: 如何處理 Email 衝突？

**A**: Firebase 處理 Email 衝突：
- 同一個 Email 只能有一個 Firebase User
- 不同 Provider 同樣 Email 會觸發 `account-exists-with-different-credential` 錯誤
- 需要用戶手動解除原有綁定

### Q3: 用戶忘記用哪個方式註冊怎麼辦？

**A**: 提供「忘記登入方式」功能：
- 輸入 Email
- 系統查詢該 Email 綁定的 Providers
- 顯示可用的登入方式

### Q4: 如何測試多帳號綁定？

**A**: 測試步驟：
1. 建立測試用 Google/Facebook/LINE 帳號
2. 用第一個帳號登入
3. 前往 `/settings` 頁面
4. 綁定其他帳號
5. 登出後嘗試用不同方式登入

### Q5: 為什麼解綁需要保留一種登入方式？

**A**: 安全考量：
- 防止用戶鎖定自己的帳號
- 至少保留：密碼 OR 一個 OAuth Provider
- 建議先設定密碼再解綁 OAuth

---

## 版本記錄

| 版本 | 日期 | 變更內容 |
|------|------|---------|
| 1.0 | 2025-11-25 | 初版：完整 OAuth 整合指南 |

---

## 參考資源

- [Firebase Authentication 官方文檔](https://firebase.google.com/docs/auth)
- [Firebase OAuth Providers](https://firebase.google.com/docs/auth/web/google-signin)
- [Prisma 官方文檔](https://www.prisma.io/docs)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

---

**文檔維護者**：開發團隊
**最後更新**：2025-11-25
