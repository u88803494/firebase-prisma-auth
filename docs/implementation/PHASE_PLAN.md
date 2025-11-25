# 分階段實作計劃

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔提供 OAuth 認證系統的完整實作計劃，分為 **7 個階段**，從專案初始化到測試整合，預計總開發時間約 **7.5 小時**。

---

## 🎯 階段總覽

| 階段 | 名稱 | 預估時間 | 優先級 | 狀態 |
|------|------|---------|--------|------|
| Phase 1 | 專案初始化 | 30 分鐘 | ⭐⭐⭐ 必做 | ⏳ 待開始 |
| Phase 2 | Firebase 配置 | 30 分鐘 | ⭐⭐⭐ 必做 | ⏳ 待開始 |
| Phase 3 | 資料庫設定 | 30 分鐘 | ⭐⭐⭐ 必做 | ⏳ 待開始 |
| Phase 4 | OAuth 註冊核心 | 2.5 小時 | ⭐⭐⭐ 必做 | ⏳ 待開始 |
| Phase 5 | 手動註冊 | 1.5 小時 | ⭐⭐ 重要 | ⏳ 待開始 |
| Phase 6 | 忘記密碼 | 1 小時 | ⭐ 可選 | ⏳ 待開始 |
| Phase 7 | 測試與整合 | 1 小時 | ⭐⭐⭐ 必做 | ⏳ 待開始 |

**總計**：約 7.5 小時

---

## 📋 Phase 1: 專案初始化（30 分鐘）

### 🎯 目標
建立 Next.js 專案架構，安裝核心依賴，建立基本目錄結構。

### 📦 任務清單

#### 1.1 初始化 Next.js 專案

```bash
# 使用 pnpm 建立 Next.js 專案
pnpm create next-app@latest . --typescript --tailwind --app

# 選項說明：
# - TypeScript: Yes
# - Tailwind CSS: Yes
# - App Router: Yes
# - ESLint: Yes
# - src/ directory: Yes
# - Import alias: @/* (預設)
```

#### 1.2 安裝核心依賴

```bash
# Firebase（前端認證）
pnpm add firebase

# Firebase Admin SDK（後端驗證）
pnpm add firebase-admin

# Prisma ORM
pnpm add @prisma/client
pnpm add -D prisma

# 密碼處理
pnpm add bcryptjs
pnpm add -D @types/bcryptjs

# 表單驗證
pnpm add react-hook-form zod @hookform/resolvers

# 狀態管理
pnpm add zustand

# 手機號碼驗證
pnpm add libphonenumber-js

# HTTP 客戶端（可選）
pnpm add axios
```

#### 1.3 建立專案目錄結構

```bash
# 建立目錄
mkdir -p src/app/api/auth
mkdir -p src/app/login
mkdir -p src/app/register
mkdir -p src/app/forgot-password
mkdir -p src/components/auth
mkdir -p src/lib
mkdir -p src/types
mkdir -p src/utils
```

**預期結構**：
```
src/
├── app/
│   ├── api/
│   │   └── auth/          # 認證相關 API
│   ├── login/             # 登入頁面
│   ├── register/          # 註冊頁面
│   ├── forgot-password/   # 忘記密碼
│   └── layout.tsx
├── components/
│   └── auth/              # 認證相關組件
├── lib/
│   ├── firebase.ts        # Firebase Client SDK
│   ├── firebaseAdmin.ts   # Firebase Admin SDK
│   └── prisma.ts          # Prisma Client
├── types/
│   └── auth.types.ts      # 認證相關類型
└── utils/
    └── validators.ts      # 驗證工具
```

#### 1.4 初始化 Prisma

```bash
# 初始化 Prisma（會建立 prisma/schema.prisma）
npx prisma init
```

#### 1.5 建立環境變數範本

```bash
# 複製 .env.example（如果有的話）
cp .env.example .env.local
```

**`.env.local` 範本**：
```env
# Firebase Configuration (Frontend - Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (Backend - Secret)
FIREBASE_ADMIN_SDK_KEY=

# Database
DATABASE_URL="file:./prisma/dev.db"

# Environment
NODE_ENV=development
```

### ✅ 驗收標準

- [ ] Next.js 專案可啟動（`pnpm dev`）
- [ ] 所有依賴安裝成功（`pnpm install`）
- [ ] 目錄結構建立完成
- [ ] Prisma 初始化完成（`prisma/schema.prisma` 存在）
- [ ] `.env.local` 範本建立

### 🐛 常見問題

**問題**：`pnpm create next-app` 失敗
**解決**：確認 Node.js 版本 >= 18，升級 pnpm（`npm install -g pnpm@latest`）

---

## 🔥 Phase 2: Firebase 配置（30 分鐘）

### 🎯 目標
配置 Firebase 專案，啟用所需的 Authentication 方式，取得配置資訊。

### 📦 任務清單

#### 2.1 建立/使用 Firebase 專案

1. 訪問 [Firebase Console](https://console.firebase.google.com/)
2. 建立新專案或使用現有專案
3. 記下專案 ID

#### 2.2 啟用 Authentication 方式

**在 Firebase Console → Authentication → Sign-in method**

| 提供商 | 啟用步驟 |
|--------|---------|
| **Email/Password** | 直接啟用 |
| **Phone** | 啟用並設定測試號碼（避免 SMS 費用） |
| **Google** | 啟用（Firebase 自動配置） |
| **Facebook** | 需要 Facebook App ID 和 Secret |
| **LINE** | 使用 Generic OAuth Provider（詳見下方） |

#### 2.3 配置 LINE OAuth（進階）

**LINE OAuth 需使用 Generic OAuth Provider**：

1. Firebase Console → Authentication → Sign-in method → Add new provider
2. 選擇「Generic OAuth」
3. 填入以下資訊：

```
Provider ID: oidc.line
Client ID: [從 LINE Developers 取得]
Client Secret: [從 LINE Developers 取得]
Authorization URL: https://access.line.me/oauth2/v2.1/authorize
Token URL: https://api.line.me/oauth2/v2.1/token
User Info URL: https://api.line.me/oauth2/v2.1/userinfo
```

**LINE Developers 設定**：
1. 訪問 https://developers.line.biz/
2. 建立 Provider 和 Channel
3. 取得 Channel ID（Client ID）和 Channel Secret

#### 2.4 取得 Firebase 配置

**Firebase Console → Project Settings → Your apps**

複製配置物件：
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

#### 2.5 下載 Admin SDK 私鑰

**Firebase Console → Project Settings → Service Accounts**

1. 點擊「Generate New Private Key」
2. 下載 JSON 檔案
3. **複製 JSON 內容**到 `.env.local` 的 `FIREBASE_ADMIN_SDK_KEY`

**重要**：
- ⚠️ **絕對不要提交到 Git**
- ⚠️ 確認 `.gitignore` 包含 `.env.local`

#### 2.6 填入環境變數

編輯 `.env.local`：
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

FIREBASE_ADMIN_SDK_KEY={"type":"service_account","project_id":"..."}
```

### ✅ 驗收標準

- [ ] Firebase 專案建立完成
- [ ] Email/Password 認證啟用
- [ ] Phone 認證啟用
- [ ] Google OAuth 啟用
- [ ] Facebook OAuth 啟用（如需要）
- [ ] LINE OAuth 配置完成（如需要）
- [ ] Firebase Config 填入 `.env.local`
- [ ] Admin SDK 私鑰填入 `.env.local`

### 🐛 常見問題

**問題**：LINE OAuth 配置失敗
**解決**：確認 Redirect URI 設定正確（`https://your-project.firebaseapp.com/__/auth/handler`）

---

## 💾 Phase 3: 資料庫設定（30 分鐘）

### 🎯 目標
建立 Prisma Schema，執行遷移，建立 SQLite 資料庫。

### 📦 任務清單

#### 3.1 編寫 Prisma Schema

編輯 `prisma/schema.prisma`，複製 [資料庫設計文檔](../architecture/DATABASE_DESIGN.md) 中的完整 Schema。

**關鍵內容**：
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  // ... 完整欄位定義
}

model OTPVerification {
  // ... 完整欄位定義
}
```

#### 3.2 執行資料庫遷移

```bash
# 建立初始遷移（會建立 prisma/dev.db）
npx prisma migrate dev --name init

# 生成 Prisma Client
npx prisma generate
```

#### 3.3 建立 Prisma Client 工具

建立 `src/lib/prisma.ts`：
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

#### 3.4 測試資料庫連線

建立測試檔案 `scripts/test-db.ts`：
```typescript
import prisma from '../src/lib/prisma';

async function main() {
  console.log('📊 測試資料庫連線...');

  const userCount = await prisma.user.count();
  console.log(`✅ 連線成功！目前用戶數：${userCount}`);
}

main()
  .catch((e) => console.error('❌ 連線失敗：', e))
  .finally(() => prisma.$disconnect());
```

執行測試：
```bash
npx tsx scripts/test-db.ts
```

#### 3.5 啟動 Prisma Studio（可視化工具）

```bash
# 開啟 Prisma Studio（http://localhost:5555）
npx prisma studio
```

### ✅ 驗收標準

- [ ] `prisma/schema.prisma` 編寫完成
- [ ] 資料庫遷移成功（`prisma/dev.db` 存在）
- [ ] Prisma Client 生成成功
- [ ] `src/lib/prisma.ts` 建立完成
- [ ] 資料庫連線測試通過
- [ ] Prisma Studio 可正常開啟

### 🐛 常見問題

**問題**：`database is locked`
**解決**：關閉 Prisma Studio 或其他資料庫連線

---

## 🔐 Phase 4: OAuth 註冊核心（2.5 小時）

### 🎯 目標
實作 OAuth 登入/註冊的完整流程，包含首次綁定手機、OTP 驗證、已註冊用戶直接登入。

### 📦 任務清單

#### 4.1 Firebase 初始化（前端）

建立 `src/lib/firebase.ts`：
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 避免重複初始化
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
```

#### 4.2 Firebase Admin 初始化（後端）

建立 `src/lib/firebaseAdmin.ts`：
```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_ADMIN_SDK_KEY || '{}'
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth = admin.auth();
export default admin;
```

#### 4.3 OAuth 按鈕組件

建立 `src/components/auth/OAuthButtons.tsx`：
```typescript
'use client';

import { GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function OAuthButtons() {
  const router = useRouter();

  const handleOAuthLogin = async (providerType: 'google' | 'facebook' | 'line') => {
    try {
      let provider;

      switch (providerType) {
        case 'google':
          provider = new GoogleAuthProvider();
          break;
        case 'facebook':
          provider = new FacebookAuthProvider();
          break;
        case 'line':
          provider = new OAuthProvider('oidc.line');
          break;
      }

      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      // 檢查是否已註冊
      const response = await fetch('/api/auth/oauth/callback', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ providerType }),
      });

      const data = await response.json();

      if (data.needsRegistration) {
        // 未註冊 → 導向完成註冊頁
        router.push('/register/complete');
      } else {
        // 已註冊 → 導向首頁
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('OAuth 登入失敗:', error);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => handleOAuthLogin('google')}
        className="w-full p-3 border rounded-lg hover:bg-gray-50"
      >
        用 Google 登入
      </button>
      <button
        onClick={() => handleOAuthLogin('facebook')}
        className="w-full p-3 border rounded-lg hover:bg-gray-50"
      >
        用 Facebook 登入
      </button>
      <button
        onClick={() => handleOAuthLogin('line')}
        className="w-full p-3 border rounded-lg hover:bg-gray-50"
      >
        用 LINE 登入
      </button>
    </div>
  );
}
```

#### 4.4 OAuth 回調 API

建立 `src/app/api/auth/oauth/callback/route.ts`：
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 取得 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { providerType } = await request.json();

    // 驗證 Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 取得 OAuth Provider ID
    const providerData = decodedToken.firebase.sign_in_provider;
    const providerId = decodedToken.firebase.identities?.[providerData]?.[0];

    // 檢查用戶是否已註冊
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { uid },
          { googleId: providerType === 'google' ? providerId : undefined },
          { facebookId: providerType === 'facebook' ? providerId : undefined },
          { lineId: providerType === 'line' ? providerId : undefined },
        ],
      },
    });

    if (existingUser) {
      // 已註冊 → 直接登入
      return NextResponse.json({
        needsRegistration: false,
        user: existingUser,
      });
    } else {
      // 未註冊 → 需要完成綁定
      return NextResponse.json({
        needsRegistration: true,
        oauthData: {
          uid,
          email: decodedToken.email,
          displayName: decodedToken.name,
          photoURL: decodedToken.picture,
          providerId,
          providerType,
        },
      });
    }
  } catch (error) {
    console.error('OAuth 回調錯誤:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

#### 4.5 完成註冊頁面（綁定手機 + Email）

建立 `src/app/register/complete/page.tsx`：
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CompleteRegistrationPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 發送 OTP
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });

    if (response.ok) {
      // 導向 OTP 驗證頁
      router.push(`/register/verify-otp?phone=${phoneNumber}&email=${email}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">完成註冊</h1>

      <input
        type="tel"
        placeholder="手機號碼"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 border rounded mb-4"
        required
      />

      <button
        type="submit"
        className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        發送驗證碼
      </button>
    </form>
  );
}
```

#### 4.6 OTP 發送 API

建立 `src/app/api/auth/send-otp/route.ts`：
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// 生成 6 位數 OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    // 生成 OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分鐘後

    // 存入資料庫
    await prisma.oTPVerification.create({
      data: {
        phoneNumber,
        code,
        expiresAt,
      },
    });

    // TODO: 使用 Firebase Phone Auth 發送 SMS
    // 目前先返回成功（測試時可在 console 查看 OTP）
    console.log(`📱 OTP for ${phoneNumber}: ${code}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('發送 OTP 失敗:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}
```

#### 4.7 OTP 驗證 API

建立 `src/app/api/auth/verify-otp/route.ts`：
```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code, oauthData } = await request.json();

    // 查詢最新未驗證的 OTP
    const otpRecord = await prisma.oTPVerification.findFirst({
      where: {
        phoneNumber,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || otpRecord.code !== code) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    // 標記為已驗證
    await prisma.oTPVerification.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // 建立用戶記錄
    const user = await prisma.user.create({
      data: {
        uid: oauthData.uid,
        email: oauthData.email,
        phoneNumber,
        displayName: oauthData.displayName,
        photoURL: oauthData.photoURL,
        googleId: oauthData.providerType === 'google' ? oauthData.providerId : null,
        facebookId: oauthData.providerType === 'facebook' ? oauthData.providerId : null,
        lineId: oauthData.providerType === 'line' ? oauthData.providerId : null,
        phoneVerified: true,
        emailVerified: oauthData.email ? true : false,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('驗證 OTP 失敗:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
```

### ✅ 驗收標準

- [ ] Firebase Client SDK 初始化成功
- [ ] Firebase Admin SDK 初始化成功
- [ ] OAuth 按鈕組件可正常點擊
- [ ] Google OAuth 登入流程完整
- [ ] 首次 OAuth 登入導向完成註冊頁
- [ ] 已註冊 OAuth 用戶直接登入
- [ ] OTP 發送成功（console 可見）
- [ ] OTP 驗證成功並建立用戶記錄

---

## 👤 Phase 5: 手動註冊（1.5 小時）

### 🎯 目標
實作手機 + Email + 密碼的手動註冊流程。

### 📦 任務清單

#### 5.1 註冊頁面

建立 `src/app/register/page.tsx`（類似 Phase 4 的完成註冊頁）

#### 5.2 設定密碼頁面

建立 `src/app/register/set-password/page.tsx`

#### 5.3 註冊 API

建立 `src/app/api/auth/register/route.ts`（包含 bcrypt hash）

### ✅ 驗收標準

- [ ] 手動註冊流程完整
- [ ] 密碼正確 hash 存儲
- [ ] 可用手機/Email + 密碼登入

---

## 🔑 Phase 6: 忘記密碼（1 小時）

### 🎯 目標
實作 Email 和 OTP 兩種密碼重設路徑。

### 📦 任務清單

#### 6.1 忘記密碼選擇頁

建立 `src/app/forgot-password/page.tsx`

#### 6.2 Email 重設 API

建立 `src/app/api/auth/forgot-password/email/route.ts`

#### 6.3 OTP 重設 API

建立 `src/app/api/auth/forgot-password/otp/route.ts`

### ✅ 驗收標準

- [ ] Email 重設密碼成功
- [ ] OTP 重設密碼成功

---

## ✅ Phase 7: 測試與整合（1 小時）

### 🎯 目標
完整測試所有流程，確保功能正常運作。

### 📦 測試檢查清單

#### OAuth 流程
- [ ] Google OAuth 首次註冊
- [ ] Google OAuth 已註冊登入
- [ ] Facebook OAuth 完整流程
- [ ] LINE OAuth 完整流程

#### 手動註冊
- [ ] 手動註冊流程
- [ ] 密碼登入

#### 忘記密碼
- [ ] Email 重設密碼
- [ ] OTP 重設密碼

#### 資料驗證
- [ ] 用戶資料正確存入 SQLite
- [ ] OAuth ID 正確綁定
- [ ] 密碼正確 hash

### ✅ 驗收標準

- [ ] 所有測試項目通過
- [ ] 無 console 錯誤
- [ ] 資料庫資料正確

---

## 📊 開發進度追蹤

### 進度表

| 階段 | 開始時間 | 完成時間 | 實際耗時 | 狀態 |
|------|---------|---------|---------|------|
| Phase 1 | - | - | - | ⏳ |
| Phase 2 | - | - | - | ⏳ |
| Phase 3 | - | - | - | ⏳ |
| Phase 4 | - | - | - | ⏳ |
| Phase 5 | - | - | - | ⏳ |
| Phase 6 | - | - | - | ⏳ |
| Phase 7 | - | - | - | ⏳ |

---

## 🔗 相關文檔

- [功能需求](../requirements/FUNCTIONAL_REQUIREMENTS.md)
- [用戶流程](../requirements/USER_FLOWS.md)
- [資料庫設計](../architecture/DATABASE_DESIGN.md)
- [文檔總索引](../00-INDEX.md)

---

_此計劃會隨實作進度持續更新_
