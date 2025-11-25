# 🚀 實作指南

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔提供從零開始實作 Firebase Auth POC 的詳細步驟。

---

## 🎯 前置準備

### 必需的工具和帳號

#### 1️⃣ Node.js 環境
```bash
# 檢查版本（需要 v18+）
node --version
npm --version

# 推薦使用 pnpm（速度更快）
npm install -g pnpm
pnpm --version
```

#### 2️⃣ Firebase 專案
- 訪問 [Firebase Console](https://console.firebase.google.com/)
- 使用 Google 帳號登入
- 建立新專案（取名 `firebase-auth-poc`）

#### 3️⃣ 編輯器
- VS Code（推薦）
- 或其他 TypeScript IDE

#### 4️⃣ Git（版本控制）
```bash
git --version
```

---

## 🔧 第一步：專案初始化

### 1. 複製或建立專案目錄

```bash
# 選項 A：複製現有文檔
cd ~/work
git clone <你的項目 URL>
cd firebase-auth-poc

# 選項 B：從頭開始
mkdir firebase-auth-poc
cd firebase-auth-poc
```

### 2. 初始化 Next.js 專案

```bash
# 使用 pnpm create 建立 Next.js
pnpm create next-app@latest . --typescript --tailwind --app

# 或手動安裝依賴
pnpm install next@latest react@latest react-dom@latest
```

### 3. 安裝核心依賴

```bash
# Firebase (前端認證)
pnpm add firebase

# Firebase Admin SDK (後端驗證)
pnpm add firebase-admin

# Prisma (ORM)
pnpm add -D prisma
pnpm add @prisma/client

# 表單和驗證
pnpm add react-hook-form zod @hookform/resolvers

# 狀態管理
pnpm add zustand

# HTTP 客戶端
pnpm add axios

# 其他工具
pnpm add libphonenumber-js  # 手機號碼驗證
```

### 4. 初始化 Prisma

```bash
# 建立 prisma 配置
npx prisma init

# 此時會建立：
# - prisma/schema.prisma
# - .env
```

---

## 📋 第二步：配置 Firebase

### 1. Firebase Console 設定

#### 啟用 Authentication

1. Firebase Console → 選擇你的項目
2. 左側菜單 → Authentication
3. 點擊 "Get started"
4. 啟用以下登入方式：
   - ✅ Email/Password
   - ✅ Phone
   - ✅ Google
   - ✅ Facebook

#### 設定 Google OAuth

```
Firebase Console → Authentication → Sign-in method
→ Google → Enable
```

需要設定：
- Google Client ID（Firebase 自動產生）
- Authorized redirect URI（通常是 `https://your-domain/`）

#### 設定 Facebook OAuth

```
需要 Facebook App ID 和 App Secret

設定步驟：
1. 去 Facebook Developers
2. 建立 App
3. 複製 App ID 和 App Secret
4. 在 Firebase Console 中設定
```

#### 設定 LINE OAuth

```
需要 LINE Bot Channel ID 和 Channel Secret

設定步驟：
1. 去 LINE Developers (https://developers.line.biz/)
2. 建立 Provider 和 Bot Channel
3. 在 Bot Channel 中取得：
   - Channel ID（當作 Client ID）
   - Channel Secret（當作 Client Secret）

4. 在 Firebase Console 中設定：
   - Authentication → Sign-in method → Generic OAuth 2.0
   - Provider ID: oidc.line
   - Client ID: 你的 LINE Channel ID
   - Client Secret: 你的 LINE Channel Secret
   - Authorization URL: https://web.line.me/web/login
   - Token URL: https://api.line.me/oauth2/v2.1/token
   - User info URL: https://api.line.me/oauth2/v2.1/userinfo
```

### 2. 取得 Firebase 配置

Firebase Console → Project Settings → Your apps

```javascript
// 複製這個配置
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 3. 建立環境變數

```bash
# 複製 .env.example
cp .env.example .env.local

# 編輯 .env.local 並填入 Firebase 配置
# (見下一步)
```

### 4. 下載 Firebase Admin SDK 金鑰

Firebase Console → Project Settings → Service Accounts

```bash
# 點擊 "Generate New Private Key"
# 下載的 JSON 檔案內容（不是檔案本身）
# 複製到 .env.local 的 FIREBASE_ADMIN_SDK_KEY

# ⚠️ 重要：不要提交此檔案到 Git！
# 已加入 .gitignore，但要確保安全
```

---

## 💾 第三步：資料庫設定

### 1. 編寫 Prisma Schema

編輯 `prisma/schema.prisma`：

```typescript
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// （複製 DATABASE_SCHEMA.md 中的完整 schema）

model User {
  id              Int      @id @default(autoincrement())
  uid             String   @unique
  email           String   @unique
  phoneNumber     String?  @unique
  displayName     String?
  loginMethods    String   @default("[]")
  phoneVerified   Boolean  @default(false)
  emailVerified   Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  userAuth        UserAuth?
  phoneMap        PhoneToEmail?

  @@index([email])
  @@index([uid])
  @@map("users")
}

// ... 其他 models
```

### 2. 建立 SQLite 資料庫

```bash
# 建立初始遷移
pnpm prisma migrate dev --name init

# 此命令會：
# 1. 建立 prisma/dev.db
# 2. 執行 SQL 遷移
# 3. 生成 Prisma Client

# （過程中會提示，一路 Enter 就行）
```

### 3. 驗證資料庫

```bash
# 打開 Prisma Studio（可視化工具）
pnpm prisma studio

# 會打開 http://localhost:5555
# 可以看到各個表和資料
```

---

## 🔐 第四步：Firebase 初始化代碼

### 1. 建立 Firebase 初始化檔案

`src/lib/firebase.ts`：

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // 可選（未使用）

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 初始化 Auth
export const auth = getAuth(app);

// 初始化 Firestore（可選）
// export const db = getFirestore(app);

export default app;
```

### 2. 建立 Admin SDK 初始化

`src/lib/firebaseAdmin.ts`：

```typescript
import * as admin from 'firebase-admin';

// 初始化 Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_ADMIN_SDK_KEY || '{}'
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore(); // 可選

export default admin;
```

---

## 🛣️ 第五步：API Routes 實作

### 1. 登入 API

`src/app/api/auth/login/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { phone, password } = await request.json();

    // 驗證輸入
    if (!phone || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_INPUT' } },
        { status: 400 }
      );
    }

    // 查詢 phoneToEmail 映射
    const phoneMap = await prisma.phoneToEmail.findUnique({
      where: { phoneNumber: phone },
    });

    if (!phoneMap) {
      return NextResponse.json(
        { success: false, error: { code: 'PHONE_NOT_FOUND' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { email: phoneMap.email },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
```

### 2. Token 驗證 API

`src/app/api/auth/verify-token/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // 取得 Token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED' } },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    // 驗證 Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // 查詢或建立用戶
    let user = await prisma.user.findUnique({
      where: { uid },
    });

    if (!user) {
      // 建立新用戶
      user = await prisma.user.create({
        data: {
          uid,
          email: decodedToken.email || '',
          displayName: decodedToken.name,
          loginMethods: JSON.stringify(['email']),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN' } },
      { status: 401 }
    );
  }
}
```

---

## 🎨 第六步：前端 UI 實作

### 1. 登入表單組件

`src/components/LoginForm.tsx`：

```typescript
'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1. 呼叫後端取得 Email
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      });

      const { data } = await loginResponse.json();
      const { email } = data;

      // 2. 使用 Firebase 登入
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // 3. 驗證 Token
      const idToken = await userCredential.user.getIdToken();
      const verifyResponse = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });

      const { data: user } = await verifyResponse.json();

      // 4. 重定向
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || '登入失敗');
    }
  };

  return (
    <form onSubmit={handleLogin} className="max-w-md mx-auto p-4">
      <input
        type="tel"
        placeholder="手機號碼"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="w-full p-2 mb-4 border"
      />
      <input
        type="password"
        placeholder="密碼"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 mb-4 border"
      />
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <button
        type="submit"
        className="w-full p-2 bg-blue-500 text-white"
      >
        登入
      </button>
    </form>
  );
}
```

### 2. Google OAuth 按鈕

```typescript
'use client';

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const idToken = await result.user.getIdToken();

      // 呼叫 verify-token API
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: result.user.uid }),
      });

      if (response.ok) {
        // 登入成功，重定向
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Google 登入失敗:', error);
    }
  };

  return (
    <button onClick={handleGoogleLogin} className="p-2 bg-blue-500 text-white rounded">
      用 Google 登入
    </button>
  );
}
```

### 3. Facebook OAuth 按鈕

```typescript
'use client';

import { FacebookAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function FacebookLoginButton() {
  const handleFacebookLogin = async () => {
    try {
      const provider = new FacebookAuthProvider();
      const result = await signInWithPopup(auth, provider);

      const idToken = await result.user.getIdToken();

      // 呼叫 verify-token API
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: result.user.uid }),
      });

      if (response.ok) {
        // 登入成功，重定向
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Facebook 登入失敗:', error);
    }
  };

  return (
    <button onClick={handleFacebookLogin} className="p-2 bg-blue-700 text-white rounded">
      用 Facebook 登入
    </button>
  );
}
```

### 4. LINE OAuth 按鈕

```typescript
'use client';

import { OAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function LineLoginButton() {
  const handleLineLogin = async () => {
    try {
      const provider = new OAuthProvider('oidc.line');

      // 可選：設定 LINE 特定參數
      provider.setCustomParameters({
        prompt: 'consent',
      });

      const result = await signInWithPopup(auth, provider);

      const idToken = await result.user.getIdToken();

      // 呼叫 verify-token API
      const response = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid: result.user.uid }),
      });

      if (response.ok) {
        // 登入成功，重定向
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('LINE 登入失敗:', error);
    }
  };

  return (
    <button onClick={handleLineLogin} className="p-2 bg-green-500 text-white rounded">
      用 LINE 登入
    </button>
  );
}
```

---

## ✅ 完成檢查清單

### 開發環境

- [ ] Node.js v18+ 已安裝
- [ ] Firebase 專案已建立
- [ ] Firebase 認證方式已啟用
- [ ] 環境變數已配置 (.env.local)
- [ ] Prisma schema 已完成
- [ ] SQLite 資料庫已初始化

### 後端 API

- [ ] `/api/auth/login` 已實作
- [ ] `/api/auth/verify-token` 已實作
- [ ] `/api/auth/register` 已實作
- [ ] 錯誤處理已實現
- [ ] 資料庫操作已測試

### 前端

- [ ] Firebase 初始化已完成
- [ ] LoginForm 組件已完成
- [ ] OAuth 按鈕已完成
- [ ] 路由保護已實現
- [ ] UI/UX 已調整

### 測試

- [ ] 手機 + 密碼登入測試通過
- [ ] Email + 密碼登入測試通過
- [ ] Google OAuth 登入測試通過
- [ ] Facebook OAuth 登入測試通過
- [ ] LINE OAuth 登入測試通過
- [ ] Token 驗證測試通過
- [ ] 資料持久化測試通過

---

## 🚀 運行專案

### 開發環境啟動

```bash
# 安裝依賴
pnpm install

# 執行遷移
pnpm prisma migrate dev

# 啟動開發伺服器
pnpm dev

# 應該在 http://localhost:3000
```

### 常用命令

```bash
# 檢查 SQLite 資料
pnpm prisma studio

# 格式化 schema
pnpm prisma format

# 驗證 schema
pnpm prisma validate

# 重設資料庫（開發時）
pnpm prisma migrate reset
```

---

## 🐛 常見問題和解決方案

### 問題 1：Firebase 配置錯誤

```
Error: Invalid Firebase config
```

**解決**：
1. 檢查 .env.local 中的所有值
2. 確保沒有多餘的空格或引號
3. 重新啟動開發伺服器

### 問題 2：Prisma Client 錯誤

```
Error: Can't find module '@prisma/client'
```

**解決**：
```bash
pnpm install @prisma/client
npx prisma generate
```

### 問題 3：資料庫鎖定

```
Error: database is locked
```

**解決**：
1. 關閉所有 Prisma Studio 標籤頁
2. 刪除 `prisma/dev.db-journal` 檔案
3. 重試

### 問題 4：Firebase Admin SDK 初始化失敗

```
Error: Service account credential is required
```

**解決**：
1. 檢查 FIREBASE_ADMIN_SDK_KEY 是否有效 JSON
2. 確保金鑰包含所有必要欄位
3. 使用 JSON 驗證工具檢查格式

---

## 📚 相關文檔

- [需求規格](./REQUIREMENTS.md)
- [API 規格](./API_SPEC.md)
- [資料庫設計](./DATABASE_SCHEMA.md)
- [系統架構](./ARCHITECTURE.md)

---

## 🔗 外部資源

- [Next.js 官方文檔](https://nextjs.org/docs)
- [Firebase 官方文檔](https://firebase.google.com/docs)
- [Prisma 官方文檔](https://www.prisma.io/docs)
- [TypeScript 官方文檔](https://www.typescriptlang.org/docs)

---

_此文檔基於 2025-11-18 的討論_
