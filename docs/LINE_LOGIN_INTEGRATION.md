# LINE Login 整合指南

## 📋 目錄

- [概述](#概述)
- [技術架構](#技術架構)
- [完整流程說明](#完整流程說明)
- [實作步驟](#實作步驟)
- [安全性考量](#安全性考量)
- [測試指南](#測試指南)
- [常見問題](#常見問題)
- [參考資源](#參考資源)

---

## 概述

### 架構選擇：Firebase OIDC Provider

本專案採用 **Firebase OIDC (OpenID Connect) Provider** 整合 LINE Login，這是與 Google/Facebook OAuth 完全統一的架構。

**關鍵優勢**：

1. ✅ **統一架構**：所有 OAuth 提供商使用相同的 `verify-token` API
2. ✅ **維護簡單**：不需要 LINE 專屬的 callback route 或 Custom Token 邏輯
3. ✅ **安全性高**：Firebase 自動處理 OIDC 驗證和 token 管理
4. ✅ **用戶體驗一致**：所有 OAuth 用戶都經過相同的註冊流程

### LINE Login 特殊處理

**Email 不可用問題**：
- LINE 預設不提供 email address
- Email 權限需要向 LINE 正式申請（需提供隱私權政策、同意畫面截圖等）
- 審核時間：數天到數週

**解決方案**：
- Google/Facebook 用戶：使用 OAuth 提供的 email（預填且禁用編輯）
- LINE 用戶：在註冊完成頁手動輸入 email（可編輯）
- 所有用戶：都需綁定手機號碼並通過 OTP 驗證

### 技術規範

- **LINE OIDC Provider**: Firebase OIDC with provider ID `oidc.line`
- **Frontend**: React 19 + Next.js 15 + Firebase SDK v11
- **Backend**: Next.js API Routes + Firebase Admin SDK
- **Database**: Prisma ORM + SQLite (dev) / PostgreSQL (prod)
- **Authentication Flow**: Firebase Authentication with OIDC

---

## 技術架構

### 認證流程圖

```
┌────────────────────────┐
│  用戶點擊 LINE 登入按鈕  │
│  (OAuthButtons.tsx)    │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Firebase OAuthProvider                 │
│ new OAuthProvider('oidc.line')         │
│ scopes: profile, openid, email         │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Firebase signInWithPopup()             │
│ 自動處理 LINE OAuth 授權流程            │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ 用戶在 LINE 登入並授權                  │
│ (LINE 授權頁面)                         │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ Firebase 取得 ID Token                  │
│ const idToken = await user.getIdToken()│
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ 前端呼叫統一 verify-token API          │
│ POST /api/auth/oauth/verify-token     │
│ { idToken }                           │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ 後端驗證 Firebase ID Token             │
│ adminAuth.verifyIdToken(idToken)      │
│                                       │
│ 解析結果：                             │
│ - uid: Firebase UID                   │
│ - name: 用戶名稱                       │
│ - picture: 大頭照 URL                  │
│ - email: null (LINE 不提供)            │
│ - providerType: 'oidc.line'           │
│ - lineId: LINE User ID                │
└───────────┬────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│ 檢查資料庫是否已註冊                    │
│ prisma.user.findUnique({ where: { uid }})│
└───────────┬────────────────────────────┘
            │
            ├──────► 已註冊
            │        │
            │        ▼
            │   ┌──────────────────────────┐
            │   │ 更新最後登入時間          │
            │   │ 生成 Backend JWT         │
            │   └────┬─────────────────────┘
            │        │
            │        ▼
            │   ┌──────────────────────────┐
            │   │ 回傳 JWT + 用戶資訊       │
            │   │ isNewUser: false         │
            │   └────┬─────────────────────┘
            │        │
            │        ▼
            │   ┌──────────────────────────┐
            │   │ 前端導向 Dashboard        │
            │   │ router.push('/dashboard')│
            │   └──────────────────────────┘
            │
            └──────► 新用戶
                     │
                     ▼
                ┌──────────────────────────┐
                │ 建立新用戶記錄             │
                │ email: null               │
                │ phoneNumber: null         │
                │ lineId: LINE User ID      │
                │ isNewUser: true           │
                └────┬─────────────────────┘
                     │
                     ▼
                ┌──────────────────────────┐
                │ 前端導向註冊完成頁         │
                │ router.push(             │
                │   '/register/complete'   │
                │ )                        │
                └────┬─────────────────────┘
                     │
                     ▼
         ┌───────────────────────────┐
         │ 註冊完成頁面               │
         │ /register/complete        │
         └────┬──────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 1. Email 輸入                     │
         │    - LINE 用戶：空白可編輯         │
         │    - Google/Facebook：預填禁用     │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 2. 手機號碼輸入                    │
         │    - 格式：+886912345678          │
         │    - 檢查唯一性                    │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 3. 發送 OTP                       │
         │    - Firebase Phone Auth          │
         │    - linkWithPhoneNumber()        │
         │    - reCAPTCHA 驗證               │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 4. 驗證 OTP                       │
         │    - confirmationResult.confirm() │
         │    - 取得 Firebase User           │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 5. 取得最新 Firebase ID Token     │
         │    - user.getIdToken(true)        │
         │    - 包含已驗證的手機號碼          │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 6. 呼叫 update-phone API          │
         │    POST /api/auth/update-phone   │
         │    {                             │
         │      uid, phoneNumber, email     │
         │    }                             │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 後端更新 Prisma 資料庫             │
         │ upsert User:                     │
         │   - email (新增)                  │
         │   - phoneNumber (新增)            │
         │   - phoneVerified: true          │
         │   - lineId (已存在)               │
         └────┬─────────────────────────────┘
              │
              ▼
         ┌──────────────────────────────────┐
         │ 註冊完成                          │
         │ router.push('/dashboard')        │
         └──────────────────────────────────┘
```

### 資料庫 Schema 設計

```prisma
model User {
  uid             String   @unique       // Firebase UID
  email           String?  @unique       // LINE 用戶初始為 null
  phoneNumber     String?  @unique       // OAuth 用戶完成註冊前為 null
  password        String?                // OAuth 用戶為 null

  // OAuth Provider IDs
  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique       // LINE User ID

  // 用戶資料
  displayName     String?
  photoURL        String?

  // 驗證狀態
  emailVerified   Boolean  @default(false)  // LINE 手動輸入不驗證
  phoneVerified   Boolean  @default(false)  // OTP 驗證後為 true

  // 時間戳記
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastLoginAt     DateTime?

  @@index([email])
  @@index([phoneNumber])
  @@index([uid])
  @@index([lineId])
  @@map("users")
}
```

### 與現有架構的整合

| 登入方式 | Email 來源 | PhoneNumber 來源 | 最終結果 |
|---------|-----------|-----------------|---------|
| **LINE OIDC** | 手動輸入 | 手動輸入 + OTP 驗證 | Firebase Auth Session + Prisma 記錄 |
| **Google OAuth** | OAuth 提供（預填） | 手動輸入 + OTP 驗證 | Firebase Auth Session + Prisma 記錄 |
| **Facebook OAuth** | OAuth 提供（預填） | 手動輸入 + OTP 驗證 | Firebase Auth Session + Prisma 記錄 |

**關鍵設計決策**：

1. **統一 OAuth 流程**：所有 OAuth 提供商都使用 `verify-token` API
2. **Email 彈性處理**：根據 OAuth 提供商決定 email 欄位行為
3. **手機號碼必填**：所有 OAuth 用戶都必須綁定手機號碼
4. **資料庫欄位可選**：email 和 phoneNumber 都是 nullable，支援分階段註冊

---

## 完整流程說明

### 階段 1：LINE Login 授權

**觸發點**：用戶點擊「使用 LINE 繼續」按鈕

**前端處理**：
```typescript
// src/components/auth/OAuthButtons.tsx
const handleLineLogin = async () => {
  setLoadingProvider('line');

  // 1. 建立 Firebase OIDC Provider
  const { OAuthProvider } = await import('firebase/auth');
  const provider = new OAuthProvider('oidc.line'); // ✅ Provider ID

  // 2. 設定 OIDC scopes（即使 email 無法取得，仍可設定）
  provider.addScope('profile');  // 取得 name, picture
  provider.addScope('openid');   // 啟用 OIDC
  provider.addScope('email');    // 要求 email（LINE 可能不提供）

  // 3. Firebase 自動處理 OAuth 流程
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // 4. 取得 Firebase ID Token
  const idToken = await user.getIdToken();

  // 5. 呼叫統一 verify-token API
  verifyToken({ idToken }, {
    onSuccess: (data) => {
      if (!data.user.phoneNumber) {
        router.push('/register/complete'); // 新用戶
      } else {
        router.push('/dashboard'); // 已註冊用戶
      }
    }
  });
};
```

**Firebase 自動處理**：
- LINE OAuth 授權頁面重導
- 用戶授權後取得 authorization code
- 換取 ID Token 和 Access Token
- 返回前端

### 階段 2：後端驗證與用戶建立

**API Endpoint**：`POST /api/auth/oauth/verify-token`

**後端處理**：
```typescript
// src/app/api/auth/oauth/verify-token/route.ts
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  // 1. 驗證 Firebase ID Token
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  // 2. 解析 LINE 用戶資訊
  const {
    uid,              // Firebase UID (自動生成)
    name,             // LINE 顯示名稱
    picture,          // LINE 大頭照 URL
    email,            // ⚠️ LINE 不提供，為 undefined
    firebase: {
      sign_in_provider: providerType,  // 'oidc.line'
      identities                       // { 'oidc.line': ['U1234...'] }
    }
  } = decodedToken;

  // 3. 取得 LINE User ID
  const lineId = identities['oidc.line']?.[0];

  // 4. 檢查用戶是否已註冊
  let user = await prisma.user.findUnique({ where: { uid } });

  if (!user) {
    // 5. 建立新用戶（email 和 phoneNumber 為 null）
    user = await prisma.user.create({
      data: {
        uid,
        email: null,           // ✅ LINE 不提供 email
        phoneNumber: null,     // ✅ 尚未綁定手機
        displayName: name,
        photoURL: picture,
        lineId,                // ✅ LINE User ID
        emailVerified: false,
        phoneVerified: false,
      }
    });
    isNewUser = true;
  }

  // 6. 生成 Backend JWT
  const token = generateToken({
    uid: user.uid,
    email: user.email,           // null for LINE users
    phoneNumber: user.phoneNumber, // null for new users
    lineId: user.lineId,
    // ...
  });

  return NextResponse.json({ token, user, isNewUser });
}
```

### 階段 3：註冊完成（僅新用戶）

**頁面**：`/register/complete`

**UI 組成**：

1. **Email 輸入欄位**
   - LINE 用戶：空白，可編輯，必填
   - Google/Facebook 用戶：預填 OAuth email，禁用編輯

2. **手機號碼輸入欄位**
   - 所有用戶：空白，可編輯，必填
   - 格式：`+886912345678`

3. **發送驗證碼按鈕**
   - 檢查手機號碼格式
   - 檢查手機號碼是否已被使用
   - 觸發 Firebase Phone Auth

**前端處理**：
```typescript
// src/app/register/complete/page.tsx
const [email, setEmail] = useState('');
const [phoneNumber, setPhoneNumber] = useState('');
const [verificationCode, setVerificationCode] = useState('');

// 初始化 email（Google/Facebook 用戶有值，LINE 用戶為空）
useEffect(() => {
  if (firebaseUser?.email) {
    setEmail(firebaseUser.email);
  }
}, [firebaseUser]);

// 發送 OTP
const handleSendOTP = async () => {
  // 1. 設置 reCAPTCHA
  const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible'
  });

  // 2. 綁定手機號碼到 Firebase User
  const confirmationResult = await linkWithPhoneNumber(
    auth.currentUser!,
    phoneNumber,
    appVerifier
  );

  setConfirmationResult(confirmationResult);
  setOtpSent(true);
};

// 驗證 OTP 並完成註冊
const handleVerifyOTP = async () => {
  // 1. 驗證 OTP
  const credential = await confirmationResult.confirm(verificationCode);
  const verifiedUser = credential.user;

  // 2. 取得最新的 Firebase ID Token（包含已驗證的手機號碼）
  const idToken = await verifiedUser.getIdToken(true);

  // 3. 呼叫 update-phone API
  const response = await fetch('/api/auth/update-phone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({
      uid: verifiedUser.uid,
      phoneNumber: verifiedUser.phoneNumber, // Firebase 已驗證
      email: email, // ✅ 包含 LINE 用戶手動輸入的 email
    })
  });

  // 4. 註冊完成，導向 Dashboard
  if (response.ok) {
    router.push('/dashboard');
  }
};
```

### 階段 4：更新資料庫

**API Endpoint**：`POST /api/auth/update-phone`

**後端處理**：
```typescript
// src/app/api/auth/update-phone/route.ts
export async function POST(request: NextRequest) {
  // 1. 驗證 Firebase ID Token
  const authHeader = request.headers.get('Authorization');
  const idToken = authHeader.split('Bearer ')[1];
  const tokenResult = await verifyFirebaseToken(idToken);

  // 2. 解析請求資料
  const { uid, phoneNumber, email } = await request.json();

  // 3. 驗證 Email 格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Email 格式不正確' },
      { status: 400 }
    );
  }

  // 4. 檢查 Email 唯一性
  const existingEmailUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingEmailUser && existingEmailUser.uid !== uid) {
    return NextResponse.json(
      { error: '此 Email 已被其他帳號使用' },
      { status: 409 }
    );
  }

  // 5. 更新用戶記錄
  const user = await prisma.user.upsert({
    where: { uid },
    update: {
      phoneNumber,
      phoneVerified: true,  // Firebase 已驗證
      email,                // ✅ 更新 email
      emailVerified: false, // LINE 用戶手動輸入不驗證
    },
    create: {
      uid,
      email,
      phoneNumber,
      emailVerified: false,
      phoneVerified: true,
      // lineId 已在 verify-token 時建立
    }
  });

  return NextResponse.json({ success: true, user });
}
```

---

## 實作步驟

### 步驟 1：Firebase Console 設定

#### 1.1 啟用 OIDC Provider

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 → **Authentication** → **Sign-in method**
3. 點擊 **Add new provider**
4. 選擇 **OpenID Connect**

#### 1.2 設定 LINE OIDC Provider

**Provider ID**：
```
oidc.line
```

**Issuer (token issuer)**：
```
https://access.line.me
```

**Client ID**：
- 從 [LINE Developers Console](https://developers.line.biz/) 取得
- Channel ID（例如：`1234567890`）

**Client Secret**：
- 從 LINE Developers Console 的 Channel settings → Basic settings
- Channel Secret

**OAuth redirect URIs** (Firebase 自動生成，需複製到 LINE Console)：
```
https://[YOUR_PROJECT_ID].firebaseapp.com/__/auth/handler
```

#### 1.3 在 LINE Developers Console 設定 Callback URL

1. 前往 [LINE Developers Console](https://developers.line.biz/)
2. 選擇 Channel → **LINE Login** 分頁
3. 在 **Callback URL** 欄位新增：
   ```
   https://[YOUR_PROJECT_ID].firebaseapp.com/__/auth/handler
   ```

⚠️ **重要**：URL 必須完全一致，包含 `https://` 和結尾的 `/handler`

---

### 步驟 2：環境變數設定

編輯 `.env.local`：

```bash
# Firebase 前端設定
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... 其他 Firebase 設定

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# 資料庫
DATABASE_URL="file:/absolute/path/to/project/prisma/dev.db"
```

**注意**：不需要 LINE Channel ID/Secret 環境變數，Firebase 已在 Console 設定。

---

### 步驟 3：Prisma Schema 調整

#### 3.1 確認 Schema 包含 LINE 支援

```prisma
model User {
  id              Int      @id @default(autoincrement())
  uid             String   @unique
  email           String?  @unique       // ✅ 可選（LINE 用戶初始為 null）
  phoneNumber     String?  @unique       // ✅ 可選（註冊前為 null）
  password        String?

  displayName     String?
  photoURL        String?

  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique       // ✅ LINE User ID

  emailVerified   Boolean  @default(false)
  phoneVerified   Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastLoginAt     DateTime?

  @@index([email])
  @@index([phoneNumber])
  @@index([uid])
  @@index([lineId])      // ✅ LINE 索引

  @@map("users")
}
```

#### 3.2 執行 Migration

```bash
# 如果 schema 已正確，只需重新生成 Prisma Client
npx prisma generate

# 如果有修改 schema，需要建立 migration
npx prisma migrate dev --name "add_line_support"

# 重啟 dev server
pnpm dev
```

---

### 步驟 4：前端實作

#### 4.1 OAuthButtons 元件

確認 `src/components/auth/OAuthButtons.tsx` 包含 LINE 登入按鈕：

```typescript
const handleLineLogin = async () => {
  setLoadingProvider('line');
  setError(null);

  try {
    // 使用 Firebase OAuthProvider（OIDC）
    const { OAuthProvider } = await import('firebase/auth');
    const provider = new OAuthProvider('oidc.line'); // ✅ Provider ID

    // 設定 OIDC scopes
    provider.addScope('profile');
    provider.addScope('openid');
    provider.addScope('email'); // 需要在 LINE Console 申請權限

    // Firebase OIDC 登入
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // 取得 Firebase ID Token
    const idToken = await user.getIdToken();

    // 呼叫統一 verify-token API
    verifyToken(
      { idToken },
      {
        onSuccess: (data) => {
          if (!data.user.phoneNumber) {
            router.push('/register/complete'); // 新用戶
          } else {
            router.push('/dashboard'); // 已註冊
          }
        }
      }
    );
  } catch (err: any) {
    console.error('LINE login error:', err);
    setError(err.message || 'LINE 登入失敗');
  }
};
```

#### 4.2 註冊完成頁面

確認 `src/app/register/complete/page.tsx` 包含 email 輸入欄位：

```typescript
// 1. 初始化 email state
const [email, setEmail] = useState('');

// 2. 從 Firebase User 取得 email（Google/Facebook 有值，LINE 為空）
useEffect(() => {
  if (firebaseUser?.email) {
    setEmail(firebaseUser.email);
  }
}, [firebaseUser]);

// 3. Email 輸入欄位
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    disabled={!!firebaseUser?.email} // Google/Facebook 用戶禁用
    required
  />
  {!!firebaseUser?.email ? (
    <p>此 Email 來自您的 OAuth 帳號，無法修改</p>
  ) : (
    <p>請輸入您的 Email 地址</p>
  )}
</div>

// 4. 驗證 OTP 時傳送 email
const handleVerifyOTP = async () => {
  // ... 驗證 OTP 邏輯

  const response = await fetch('/api/auth/update-phone', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uid: verifiedUser.uid,
      phoneNumber: verifiedUser.phoneNumber,
      email: email, // ✅ 包含 LINE 用戶輸入的 email
    })
  });
};
```

---

### 步驟 5：後端 API 實作

#### 5.1 verify-token API

確認 `src/app/api/auth/oauth/verify-token/route.ts` 支援 LINE：

```typescript
export async function POST(req: NextRequest) {
  const { idToken } = await req.json();

  // 驗證 Firebase ID Token
  const decodedToken = await adminAuth.verifyIdToken(idToken);

  const {
    uid,
    email,      // LINE 用戶為 undefined
    name,
    picture,
    firebase: { sign_in_provider: providerType, identities }
  } = decodedToken;

  // 取得 Provider ID
  let providerId: string | undefined;
  if (identities && providerType) {
    providerId = identities[providerType]?.[0];
  }

  // 準備用戶資料
  const userDataToUpdate: any = {
    email: email || null,          // ✅ LINE 用戶為 null
    emailVerified: !!email,        // 只有有 email 才驗證
    displayName: name || null,
    photoURL: picture || null,
    lastLoginAt: new Date(),
  };

  // 根據 providerType 設置對應的 providerId
  if (providerType === 'oidc.line') { // ✅ LINE OIDC
    userDataToUpdate.lineId = providerId;
  }

  // 建立或更新用戶
  let user = await prisma.user.findUnique({ where: { uid } });
  let isNewUser = false;

  if (!user) {
    user = await prisma.user.create({
      data: {
        uid,
        password: null, // OAuth 用戶無密碼
        ...userDataToUpdate,
      }
    });
    isNewUser = true;
  }

  // 生成 Backend JWT
  const token = generateToken({
    uid: user.uid,
    email: user.email,           // LINE 用戶為 null
    phoneNumber: user.phoneNumber, // 新用戶為 null
    lineId: user.lineId,
    // ...
  });

  return NextResponse.json({ token, user, isNewUser });
}
```

#### 5.2 update-phone API

確認 `src/app/api/auth/update-phone/route.ts` 接收並驗證 email：

```typescript
export async function POST(request: NextRequest) {
  // 1. 驗證 Firebase Token
  const authHeader = request.headers.get('Authorization');
  const idToken = authHeader.split('Bearer ')[1];
  const tokenResult = await verifyFirebaseToken(idToken);

  // 2. 解析資料
  const { uid, phoneNumber, email } = await request.json();

  // 3. 驗證 Email
  if (!email) {
    return NextResponse.json(
      { error: '缺少 Email' },
      { status: 400 }
    );
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { error: 'Email 格式不正確' },
      { status: 400 }
    );
  }

  // 4. 檢查 Email 唯一性
  const existingEmailUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingEmailUser && existingEmailUser.uid !== uid) {
    return NextResponse.json(
      { error: '此 Email 已被其他帳號使用' },
      { status: 409 }
    );
  }

  // 5. 更新用戶
  const user = await prisma.user.upsert({
    where: { uid },
    update: {
      phoneNumber,
      phoneVerified: true,
      email,                    // ✅ 更新 email
      emailVerified: false,     // LINE 用戶手動輸入不驗證
    },
    create: {
      uid,
      email,
      phoneNumber,
      phoneVerified: true,
      emailVerified: false,
      // lineId 已在 verify-token 時建立
    }
  });

  return NextResponse.json({ success: true, user });
}
```

---

## 安全性考量

### 1. Firebase OIDC Provider 安全性

**優勢**：
- Firebase 自動處理 CSRF protection (state parameter)
- Token 驗證由 Firebase Admin SDK 執行（伺服器端）
- 不需要前端儲存 Channel Secret

**驗證流程**：
```typescript
// 後端驗證 ID Token
const decodedToken = await adminAuth.verifyIdToken(idToken);

// Firebase 已驗證：
// ✅ Token 簽名有效
// ✅ Token 未過期
// ✅ Issuer 正確 (https://access.line.me)
// ✅ Audience 正確 (你的 Firebase Project ID)
```

### 2. Email 唯一性檢查

**問題**：LINE 用戶手動輸入 email，可能與其他用戶重複

**解決方案**：
```typescript
// update-phone API 中檢查
const existingEmailUser = await prisma.user.findUnique({
  where: { email }
});

if (existingEmailUser && existingEmailUser.uid !== uid) {
  return NextResponse.json(
    { error: '此 Email 已被其他帳號使用' },
    { status: 409 }
  );
}
```

### 3. Phone Number 唯一性檢查

**Firebase Phone Auth 自動處理**：
- 一個手機號碼只能綁定到一個 Firebase User
- `linkWithPhoneNumber` 如果號碼已被使用會拋出錯誤

**額外資料庫檢查**：
```typescript
const existingPhoneUser = await prisma.user.findUnique({
  where: { phoneNumber }
});

if (existingPhoneUser && existingPhoneUser.uid !== uid) {
  return NextResponse.json(
    { error: '此電話號碼已被其他帳號使用' },
    { status: 409 }
  );
}
```

### 4. reCAPTCHA 保護

**Firebase Phone Auth 強制要求 reCAPTCHA**：
```typescript
const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible', // 或 'normal'
  callback: (response) => {
    console.log('reCAPTCHA solved');
  }
});

await linkWithPhoneNumber(auth.currentUser, phoneNumber, appVerifier);
```

---

## 測試指南

### 測試環境設定

#### Firebase Console 設定檢查

1. **Authentication → Sign-in method**
   - ✅ OpenID Connect provider enabled
   - ✅ Provider ID: `oidc.line`
   - ✅ Client ID 和 Client Secret 已設定

2. **LINE Developers Console 設定檢查**
   - ✅ Callback URL 包含 Firebase redirect URI
   - ✅ Channel 狀態為 Published

### 測試案例

#### 測試 1：LINE 新用戶完整註冊流程

**步驟**：

1. 開啟 `http://localhost:3000/login`
2. 點擊「使用 LINE 繼續」按鈕
3. 在 LINE OAuth 頁面登入並授權
4. 應自動導向 `/register/complete`
5. **Email 欄位**：應該是空白且可編輯
6. 輸入 Email（例如：`test@example.com`）
7. 輸入手機號碼（例如：`+886912345678`）
8. 點擊「發送驗證碼」
9. 輸入收到的 OTP 驗證碼
10. 點擊「驗證並完成註冊」
11. 應導向 `/dashboard`

**預期結果**：

- ✅ Firebase Authentication 建立 LINE OIDC 用戶
- ✅ Prisma 資料庫建立用戶記錄：
  - `lineId`: LINE User ID
  - `email`: 手動輸入的 email
  - `phoneNumber`: 驗證過的手機號碼
  - `emailVerified`: false
  - `phoneVerified`: true

**驗證方法**：

```bash
# 查詢資料庫
sqlite3 prisma/dev.db "SELECT uid, email, phoneNumber, lineId FROM users WHERE lineId IS NOT NULL;"
```

#### 測試 2：LINE 已註冊用戶登入

**步驟**：

1. 登出（如果已登入）
2. 點擊「使用 LINE 繼續」
3. 在 LINE OAuth 頁面登入（使用已註冊的 LINE 帳號）
4. 授權應用程式

**預期結果**：

- ✅ 自動登入，直接導向 `/dashboard`
- ✅ 不需要重新註冊
- ✅ `lastLoginAt` 更新為當前時間

#### 測試 3：Email 唯一性驗證

**步驟**：

1. 使用第一個 LINE 帳號完成註冊（email: `test@example.com`）
2. 登出
3. 使用第二個 LINE 帳號登入
4. 在註冊完成頁面輸入相同的 email（`test@example.com`）
5. 完成 OTP 驗證
6. 提交註冊

**預期結果**：

- ❌ 顯示錯誤：「此 Email 已被其他帳號使用」
- ✅ 不允許註冊
- ✅ 用戶需要輸入不同的 email

#### 測試 4：手機號碼唯一性驗證

**步驟**：

1. 使用第一個 LINE 帳號完成註冊（phone: `+886912345678`）
2. 登出
3. 使用第二個 LINE 帳號登入
4. 在註冊完成頁面輸入相同的手機號碼
5. 點擊「發送驗證碼」

**預期結果**：

- ❌ API 回應錯誤：「此電話號碼已被其他帳號使用」
- ✅ 不允許發送 OTP
- ✅ 用戶需要輸入不同的手機號碼

### 除錯工具

#### 1. Chrome DevTools

**Console 分頁**：
```javascript
// 檢查 Firebase User
firebase.auth().currentUser

// 檢查 ID Token
firebase.auth().currentUser.getIdToken().then(console.log)
```

**Network 分頁**：
- 檢查 `/api/auth/oauth/verify-token` 請求
- 檢查 `/api/auth/update-phone` 請求
- 查看請求/回應的 payload

#### 2. 後端 Logs

```bash
# 啟動 dev server 並查看 logs
pnpm dev

# 應顯示：
# 🔍 完整 decodedToken: { name: "...", picture: "...", ... }
# 🔍 解析結果: { uid: "...", providerType: "oidc.line", lineId: "U..." }
# ✅ 建立新 OAuth 用戶: (LINE: xRt3a9...)
```

#### 3. Prisma Studio

```bash
# 啟動 Prisma Studio
npx prisma studio

# 開啟 http://localhost:5556
# 檢查 User 表格
```

#### 4. Firebase Console

**Authentication → Users**：
- 檢查用戶的 Provider（應顯示 `oidc.line`）
- 檢查 Phone Number（OTP 驗證後應有值）
- 檢查 UID（與 Prisma 資料庫一致）

---

## 常見問題

### Q1: LINE Login 按鈕點擊後沒有反應？

**可能原因**：
1. Firebase OIDC Provider 未正確設定
2. Provider ID 不是 `oidc.line`

**解決方法**：

```typescript
// 檢查前端 Provider ID
const provider = new OAuthProvider('oidc.line'); // ✅ 必須是 'oidc.line'

// 檢查 Firebase Console
// Authentication → Sign-in method → OpenID Connect
// Provider ID 必須是: oidc.line
```

### Q2: LINE 授權後顯示錯誤？

**可能原因**：
1. LINE Developers Console 的 Callback URL 設定錯誤
2. Firebase OIDC Provider 的 Client ID/Secret 錯誤

**解決方法**：

```bash
# 檢查 LINE Developers Console
# Callback URL 必須是：
https://[YOUR_PROJECT_ID].firebaseapp.com/__/auth/handler

# 檢查 Firebase Console
# Client ID 應該是 LINE Channel ID
# Client Secret 應該是 LINE Channel Secret
```

### Q3: verify-token API 回應 500 錯誤？

**可能原因**：
1. Firebase Admin SDK 未正確初始化
2. ID Token 無效或過期

**解決方法**：

```typescript
// 檢查 Firebase Admin SDK
import { adminAuth } from '@/lib/firebaseAdmin';
console.log('Admin Auth:', !!adminAuth); // 應該是 true

// 檢查 ID Token 是否有效
const decodedToken = await adminAuth.verifyIdToken(idToken);
console.log('Decoded Token:', decodedToken);
```

### Q4: Email 欄位無法編輯（LINE 用戶）？

**可能原因**：
1. 前端邏輯錯誤，誤判 LINE 用戶有 OAuth email
2. `firebaseUser.email` 有值

**解決方法**：

```typescript
// 檢查 Firebase User
console.log('Firebase User Email:', firebaseUser?.email); // LINE 用戶應該是 undefined

// 確認 disabled 邏輯
disabled={!!firebaseUser?.email} // LINE 用戶應該是 false（可編輯）
```

### Q5: OTP 驗證失敗？

**可能原因**：
1. reCAPTCHA 未正確初始化
2. 手機號碼格式錯誤
3. Firebase Phone Auth quota 超過

**解決方法**：

```typescript
// 檢查 reCAPTCHA
const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible'
});
console.log('reCAPTCHA:', !!appVerifier); // 應該是 true

// 檢查手機號碼格式
console.log('Phone Number:', phoneNumber); // 應該是 +886912345678

// 檢查 Firebase Console
// Authentication → Sign-in method → Phone
// 確認未超過 quota
```

### Q6: Prisma 資料庫沒有 lineId 欄位？

**可能原因**：
1. Migration 未執行
2. Prisma Client 未重新生成

**解決方法**：

```bash
# 檢查 migration 狀態
npx prisma migrate status

# 執行 migration
npx prisma migrate dev

# 重新生成 Prisma Client
npx prisma generate

# 重啟 dev server
pnpm dev
```

---

## 參考資源

### 官方文件

- [Firebase OIDC Provider Documentation](https://firebase.google.com/docs/auth/web/openid-connect)
- [LINE Login v2.1 Documentation](https://developers.line.biz/en/docs/line-login/)
- [Firebase Phone Authentication](https://firebase.google.com/docs/auth/web/phone-auth)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

### LINE Developers

- [LINE Developers Console](https://developers.line.biz/)
- [LINE Login Channel Settings](https://developers.line.biz/console/)
- [LINE Login API Reference](https://developers.line.biz/en/reference/line-login/)

### Firebase Console

- [Firebase Authentication](https://console.firebase.google.com/project/_/authentication/providers)
- [Firebase Project Settings](https://console.firebase.google.com/project/_/settings/general)

### 相關專案文檔

- [AUTHENTICATION_STATUS.md](./AUTHENTICATION_STATUS.md) - 認證系統現況
- [DATABASE_GUIDE.md](./DATABASE_GUIDE.md) - 資料庫管理指南
- [CLAUDE.md](../CLAUDE.md) - 專案開發指南

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|-----|------|---------|
| 2.0.0 | 2025-11-24 | 完全重寫，改用 Firebase OIDC Provider 架構 |
| | | - 移除 Custom Token 邏輯，改用 Firebase OIDC |
| | | - 統一所有 OAuth 提供商流程 |
| | | - 新增 Email 手動輸入支援（LINE 用戶） |
| | | - 更新所有程式碼範例和流程圖 |
| 1.0.0 | 2025-11-24 | 初版（舊架構，已廢棄） |

---

_此文檔最後更新：2025-11-24_
