# 專案認證系統現況報告

> **最後更新**：2025-11-24
> **專案階段**：Phase 4 完成（OAuth 註冊流程）+ Phase 5 部分完成（手機號碼註冊）
> **目的**：完整記錄認證系統實際狀況，避免架構理解偏差

---

## 📋 一、已實作功能

### 1.1 手機號碼註冊（✅ 完成）

**註冊流程**：
```
1. Step 1: 輸入手機號碼
   ↓
2. Step 2: 發送並驗證 OTP（Firebase Phone Auth）
   ↓
3. Step 3: 填寫詳細資料
   - Email（必填）
   - 密碼（必填）
   - 顯示名稱（選填）
   ↓
4. 後端處理（/api/auth/register-phone）：
   - 驗證資料
   - 建立 Prisma User 記錄
   - 生成 Custom Token
   ↓
5. 前端使用 Custom Token 登入 Firebase
   ↓
6. 導向 /dashboard
```

**最終用戶資料**：
```typescript
{
  uid: "firebase-uid",
  email: "user@example.com",
  phoneNumber: "+886912345678",
  password: "bcrypt-hash",
  displayName: "User Name" | null,
  googleId: null,
  facebookId: null,
  lineId: null,
  emailVerified: false,
  phoneVerified: true
}
```

**相關檔案**：
- 前端頁面：`/src/app/register/manual/page.tsx`
- 後端 API：`/src/app/api/auth/register-phone/route.ts`
- Custom Token API：`/src/app/api/auth/create-custom-token/route.ts`

---

### 1.2 OAuth 註冊流程（✅ 完成）

**支援的 OAuth Provider**：
- Google
- Facebook
- LINE

**完整註冊流程**：
```
1. 用戶點擊 OAuth 按鈕（Google/Facebook/LINE）
   ↓
2. Firebase OAuth Popup 認證
   ↓
3. 前端發送 idToken 到 /api/auth/oauth/callback
   ↓
4. 後端驗證 Token + 檢查用戶狀態：

   情況 A：全新用戶（資料庫無記錄 + Firebase 無手機）
   → needsPhoneNumber: true
   → 導向 /register/complete（完整流程）

   情況 B：中途離開用戶（資料庫無記錄 + Firebase 有手機）
   → needsPassword: true
   → 導向 /register/complete（僅密碼設定）

   情況 C：已註冊用戶（資料庫有記錄）
   → 直接導向 /dashboard
   ↓
5. /register/complete 頁面處理：
   - Step 1: 輸入手機號碼
   - Step 2: 驗證 OTP（Firebase Phone Auth 自動發送）
   - Step 3: 設定密碼
   ↓
6. 發送到 /api/auth/update-phone
   - 更新 Prisma User（phoneNumber + password hash）
   ↓
7. 完成註冊，導向 /dashboard
```

**最終用戶資料結構**：
```typescript
{
  uid: "firebase-uid",
  email: "user@gmail.com",
  phoneNumber: "+886912345678",
  password: "bcrypt-hash", // ⚠️ 密碼存在 Prisma，不在 Firebase
  googleId/facebookId/lineId: "oauth-provider-id",
  emailVerified: true, // 來自 OAuth
  phoneVerified: true, // OTP 驗證通過
  displayName: "User Name",
  photoURL: "https://..."
}
```

**相關檔案**：
- 前端：`/src/components/auth/OAuthButtons.tsx`
- API：`/src/app/api/auth/oauth/callback/route.ts`
- 完成頁：`/src/app/register/complete/page.tsx`
- 更新 API：`/src/app/api/auth/update-phone/route.ts`

---

### 1.3 認證狀態管理（✅ 完成）

**使用方式**：
```typescript
// Dashboard: /src/app/dashboard/page.tsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      router.push('/login');
    }
    setLoading(false);
  });
  return () => unsubscribe();
}, [router]);
```

**檢查機制**：
- 使用 Firebase Auth 的 `onAuthStateChanged`
- 只要有 Firebase User，就視為已登入
- 適用於所有透過 Firebase Auth 登入的用戶

**登出功能**：
- 使用 Firebase `signOut()`
- 清除 Firebase Session

**相關檔案**：
- Dashboard：`/src/app/dashboard/page.tsx`
- Firebase 配置：`/src/lib/firebase.ts`

---

### 1.4 資料庫結構（✅ 完成）

**Prisma Schema**：
```prisma
model User {
  id              Int      @id @default(autoincrement())
  uid             String   @unique       // Firebase UID
  email           String   @unique       // Email 地址
  phoneNumber     String   @unique       // 手機號碼
  password        String?                // 密碼 Hash（bcrypt）
  displayName     String?
  photoURL        String?
  googleId        String?  @unique       // Google OAuth ID
  facebookId      String?  @unique       // Facebook OAuth ID
  lineId          String?  @unique       // LINE OAuth ID
  emailVerified   Boolean  @default(false)
  phoneVerified   Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([email])
  @@index([phoneNumber])
  @@index([uid])
  @@map("users")
}
```

**重要變更**：
- ✅ 已移除 `OTPVerification` Model（改用 Firebase Phone Auth）
- ⚠️ `DATABASE_DESIGN.md` 文檔尚未更新此變更

**相關檔案**：
- Schema：`/prisma/schema.prisma`
- Prisma Client：`/src/lib/prisma.ts`

---

## ❌ 二、未實作功能

### 2.1 手機+密碼登入（❌ 未實作）

**功能說明**：
- 允許已註冊用戶用「手機 + 密碼」登入
- 適用於所有用戶（包括 OAuth 用戶）

**規劃流程**：
```
1. 用戶輸入手機+密碼
   ↓
2. 後端 API 驗證：
   - 查詢 Prisma User（by phoneNumber）
   - 驗證 bcrypt 密碼
   ↓
3. 創建 Firebase Custom Token:
   await admin.auth().createCustomToken(user.uid)
   ↓
4. 前端使用 Custom Token 登入:
   await signInWithCustomToken(auth, customToken)
   ↓
5. Firebase Auth 狀態改變
   ↓
6. onAuthStateChanged 觸發 → 導向 Dashboard
```

**技術可行性**：
- ✅ Firebase Admin SDK 已設定完成
- ✅ Custom Token 生成已可用
- ✅ Prisma 密碼驗證邏輯已完整

**狀態**：技術準備完成，待實作

---

### 2.2 Email+密碼登入（🚫 不需實作）

**決策**：使用者確認此功能不需要實作

**理由**：
- 手機號碼登入已足夠
- 簡化登入方式，避免過多選項
- 減少維護成本

---

### 2.3 密碼重設（❌ 未實作）

**需求**：
- Email OTP 路徑
- 手機 OTP 路徑

**狀態**：計劃於 Phase 6 實作

---

## 👥 三、用戶類型與登入方式

### 3.1 用戶類型分析

**⚠️ 重要發現：目前所有用戶都有密碼**

| 用戶類型 | OAuth ID | Password | Email | PhoneNumber | 創建方式 |
|---------|---------|----------|-------|-------------|---------|
| OAuth 用戶 | ✅ 有 | ✅ 有 | ✅ 有 | ✅ 有 | OAuth 註冊 + 綁定手機 + 設定密碼 |
| 手機用戶（未實作） | ❌ 無 | ✅ 有 | ✅ 有 | ✅ 有 | 手機註冊 |

**差異點**：
- OAuth 用戶：有 `googleId` / `facebookId` / `lineId`
- 手機用戶：上述三個欄位皆為 `null`

---

### 3.2 登入方式實作狀態

| 登入方式 | 實作狀態 | 適用對象 | 備註 |
|---------|---------|---------|------|
| OAuth 登入 | ✅ 完成 | OAuth 用戶 | Google/Facebook/LINE |
| 手機+密碼 | ❌ 未實作 | 所有用戶 | Admin SDK 已就緒，待實作 |
| Email+密碼 | 🚫 不需實作 | - | 使用者決策：簡化登入方式 |

**已規劃的登入組合**：

所有已註冊用戶（包括 OAuth 用戶）可用以下方式登入：
1. **OAuth 登入**（OAuth 用戶專屬）- ✅ Firebase 自動處理
2. **手機+密碼登入**（所有用戶通用）- ❌ 待實作（技術已就緒）

---

## 🏗️ 四、架構設計

### 4.1 Firebase Auth 的角色

Firebase Auth 在本專案中負責：
- ✅ OAuth 認證處理（Google/Facebook/LINE）
- ✅ Phone Auth（OTP 發送和驗證）
- ✅ Session 管理（登入狀態）
- ✅ Token 驗證（ID Token）

Firebase Auth **不負責**：
- ❌ 密碼儲存（密碼存在 Prisma）
- ❌ Email/Password 認證（因密碼不在 Firebase）

---

### 4.2 Prisma 的角色

Prisma 在本專案中負責：
- ✅ 用戶資料儲存
- ✅ 密碼 Hash 儲存（bcrypt，10 rounds）
- ✅ 用戶查詢（by email / phoneNumber / uid）

**密碼儲存位置**：
```typescript
// ✅ 密碼存在 Prisma
await prisma.user.update({
  where: { uid },
  data: {
    password: await bcrypt.hash(password, 10)
  }
});

// ❌ 密碼不存在 Firebase Auth
// Firebase 只知道這個 UID 對應的用戶存在
```

---

### 4.3 認證流程對比

#### OAuth 登入（✅ 已實作）
```
OAuth Provider → Firebase Auth → Session 建立 → Dashboard
```

#### 手機號碼註冊（✅ 已實作）
```
Phone Auth (OTP) → 填寫 Email/密碼 → Prisma 建立用戶 → Custom Token → Firebase Session → Dashboard
```

#### 手機+密碼登入（❌ 待實作）
```
Prisma 驗證密碼 → 創建 Custom Token → Firebase Auth Session → Dashboard
                  ✅ Admin SDK 已就緒
```

**技術狀態**：✅ Firebase Admin SDK 已設定完成，Custom Token 可正常生成

---

## ⚠️ 五、已知問題

### 5.1 密碼同步疑慮

**用戶疑問**：
> "為什麼這樣就會變成單一來源，因為後端有一份，firebase 也有一份？"

**實際狀況**：
- ✅ 密碼存在：**Prisma 資料庫**（bcrypt hash）
- ❌ 密碼不在：**Firebase Auth**
- Firebase Auth 只管理登入 Session，不儲存密碼

**正確理解**：
1. OAuth 用戶設定密碼的目的：未來可以用「手機+密碼」或「Email+密碼」登入
2. 密碼只存在我們的資料庫（Prisma），不會同步到 Firebase
3. 登入時需要透過 **Custom Token** 橋接 Prisma 驗證和 Firebase Session

**密碼流向圖**：
```
用戶設定密碼
    ↓
存入 Prisma（bcrypt hash）
    ↓
❌ 不會同步到 Firebase
    ↓
登入時：Prisma 驗證 → Custom Token → Firebase Session
```

---

### 5.2 密碼設定但無法使用（待解決）

**問題**：
- 所有用戶（包括 OAuth 用戶）在註冊時都設定了密碼
- 但目前沒有實作「手機+密碼登入」功能
- 導致密碼「設定了但用不到」

**影響**：
- 用戶體驗不佳（設定密碼後無法用密碼登入）
- 註冊流程顯得多餘（為什麼要設密碼？）

**計劃解決方案**：
- ✅ 技術準備完成（Admin SDK 已就緒）
- ⏳ 實作 Phase 5：手機+密碼登入功能
- 📋 需實作項目：
  - 登入 API (`/api/auth/login-phone`)
  - 登入頁面更新
  - 錯誤處理

---

### 5.3 Firebase Admin SDK 設定（✅ 已完成）

**狀態**：Service Account Key 已設定完成

**已啟用功能**：
- ✅ 手機+密碼登入（使用 Custom Token）
- ✅ 手機號碼註冊（創建 Firebase 用戶）
- ✅ Admin SDK Token 驗證
- ✅ Custom Token 生成

**設定方式**：
- 使用 Service Account JSON Key
- 設定於 `.env.local` 的 `FIREBASE_SERVICE_ACCOUNT_KEY` 環境變數
- Firebase Admin SDK 可正常初始化

**相關檔案**：
- Admin SDK 初始化：`/src/lib/firebaseAdmin.ts`
- Custom Token API：`/src/app/api/auth/create-custom-token/route.ts`

---

### 5.4 文檔不一致

**問題**：
- `docs/architecture/DATABASE_DESIGN.md` 仍包含已移除的 `OTPVerification` Model
- 實際 Prisma Schema 已改用 Firebase Phone Auth

**建議**：
- 更新 `DATABASE_DESIGN.md`，移除 OTP Model 說明
- 註明改用 Firebase Phone Authentication

---

## 🎯 六、下一步計劃

### Phase 5: 手機+密碼登入

**實作方式：Custom Token（Firebase Admin SDK）**
- ✅ Firebase Admin SDK 已設定完成
- ✅ Custom Token 生成功能已可用
- ✅ 保持 Firebase Auth 單一認證來源
- ✅ 符合 Firebase POC 展示目的

**待實作項目**：
- [ ] 建立 `/api/auth/login-phone` API
  - 驗證手機號碼和密碼
  - 生成 Custom Token
  - 回傳 Token 給前端
- [ ] 更新登入頁面
  - 新增手機+密碼登入表單
  - 處理 Custom Token 登入
- [ ] 錯誤處理
  - 手機號碼不存在
  - 密碼錯誤
  - Token 生成失敗

---

### Phase 6: 密碼重設

**功能**：
- [ ] Email OTP 路徑
- [ ] 手機 OTP 路徑
- [ ] 密碼強度驗證

---

## 📁 七、參考檔案清單

### 前端檔案
| 檔案 | 功能 |
|-----|------|
| `/src/components/auth/OAuthButtons.tsx` | OAuth 登入按鈕 |
| `/src/app/login/page.tsx` | 登入頁面 |
| `/src/app/register/complete/page.tsx` | OAuth 註冊完成頁（手機綁定+密碼設定） |
| `/src/app/dashboard/page.tsx` | Dashboard（認證保護） |

### 後端 API
| 檔案 | 功能 |
|-----|------|
| `/src/app/api/auth/oauth/callback/route.ts` | OAuth 登入 Callback |
| `/src/app/api/auth/update-phone/route.ts` | 更新手機和密碼 |
| `/src/app/api/dev/delete-user/route.ts` | 開發用：刪除用戶 |

### 函式庫
| 檔案 | 功能 |
|-----|------|
| `/src/lib/firebase.ts` | Firebase 初始化（前端） |
| `/src/lib/firebaseAuth.ts` | Firebase Token 驗證 |
| `/src/lib/firebasePhoneAuth.ts` | Phone Auth 函式 |
| `/src/lib/firebaseAdmin.ts` | Firebase Admin SDK（⚠️ 無法初始化） |
| `/src/lib/prisma.ts` | Prisma Client |

### 資料庫
| 檔案 | 功能 |
|-----|------|
| `/prisma/schema.prisma` | User Model 定義 |
| `/prisma/dev.db` | SQLite 開發資料庫 |

### 文檔
| 檔案 | 狀態 |
|-----|------|
| `/docs/ISSUES.md` | 已知問題記錄 |
| `/docs/architecture/DATABASE_DESIGN.md` | ⚠️ 需更新（移除 OTP Model） |
| `/docs/CLOUD_FUNCTIONS_SETUP.md` | Cloud Functions 設定（⚠️ 無法使用） |
| `/docs/AUTHENTICATION_STATUS.md` | 本文檔 |

---

## 📝 附錄：關鍵程式碼片段

### A. OAuth 註冊流程

**OAuth Callback API** (`/src/app/api/auth/oauth/callback/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const { idToken } = await request.json();

  // 驗證 Firebase ID Token
  const decodedToken = await verifyIdToken(idToken);

  // 檢查 Prisma 是否已有記錄
  const existingUser = await prisma.user.findUnique({
    where: { uid: decodedToken.uid }
  });

  if (existingUser) {
    // 已註冊用戶
    return NextResponse.json({
      needsPhoneNumber: false,
      needsPassword: false,
      user: existingUser
    });
  }

  // 檢查 Firebase 是否已有手機號碼
  const firebaseUser = await auth.currentUser;
  const phoneNumber = firebaseUser?.phoneNumber;

  if (!phoneNumber) {
    // 需要手機綁定
    return NextResponse.json({
      needsPhoneNumber: true,
      needsPassword: false
    });
  }

  // 有手機但無密碼
  return NextResponse.json({
    needsPhoneNumber: false,
    needsPassword: true
  });
}
```

### B. 密碼儲存

**更新手機和密碼 API** (`/src/app/api/auth/update-phone/route.ts`):
```typescript
export async function POST(request: NextRequest) {
  const { phoneNumber, password, displayName } = await request.json();

  // 密碼 Hash（bcrypt，10 rounds）
  const hashedPassword = await bcrypt.hash(password, 10);

  // 儲存到 Prisma（⚠️ 不會儲存到 Firebase）
  const user = await prisma.user.upsert({
    where: { uid: decodedToken.uid },
    update: {
      phoneNumber,
      password: hashedPassword, // 只在 Prisma
      displayName,
      phoneVerified: true
    },
    create: {
      uid: decodedToken.uid,
      email: decodedToken.email!,
      phoneNumber,
      password: hashedPassword, // 只在 Prisma
      displayName,
      phoneVerified: true,
      emailVerified: decodedToken.email_verified || false
    }
  });

  return NextResponse.json({ success: true, user });
}
```

### C. 認證狀態檢查

**Dashboard 認證** (`/src/app/dashboard/page.tsx`):
```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      // 有 Firebase Session → 視為已登入
      setUser(currentUser);
    } else {
      // 無 Firebase Session → 導向登入頁
      router.push('/login');
    }
    setLoading(false);
  });

  return () => unsubscribe();
}, [router]);
```

---

_此文檔反映專案實際狀況，隨開發進展持續更新_
