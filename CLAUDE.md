# CLAUDE.md

此檔案提供 Claude Code (claude.ai/code) 在此專案中工作時的指導說明。

## 專案概述

Firebase 認證系統 POC - 整合多種登入方式的完整認證解決方案。

**技術棧**：
- 前端：Next.js 15 + React 19 + TypeScript + Tailwind CSS
- 後端：Next.js API Routes + Firebase Admin SDK
- 認證：Firebase Authentication（OAuth、Phone Auth）
- 資料庫：SQLite (開發) / PostgreSQL (生產) + Prisma ORM
- 狀態管理：Zustand

**核心功能**：
- OAuth 社群登入（Google、Facebook、LINE）
- 手機號碼註冊與登入（OTP 驗證）
- Email + 密碼登入
- 手機 + 密碼登入
- 密碼重設（Email/手機 OTP）

## 常用指令

### 開發環境

```bash
# 啟動開發伺服器
pnpm dev

# 型別檢查（執行前必須先檢查）
pnpm type-check

# Linting
pnpm lint

# 建置專案
pnpm build

# 啟動生產模式
pnpm start
```

### 資料庫管理

```bash
# 查看資料庫狀態
npx prisma migrate status

# 建立新 migration（Schema 變更時）
npx prisma migrate dev --name "描述變更內容"

# 重新生成 Prisma Client（Schema 變更後必須執行）
npx prisma generate

# 啟動視覺化資料庫管理介面
npx prisma studio

# 重置資料庫（⚠️ 刪除所有資料）
npx prisma migrate reset
```

### Firebase Admin SDK 認證設定

**本地開發（推薦）**：使用 Service Account Key

```bash
# 1. 從 Firebase Console 下載 Service Account JSON
# 2. 將 JSON 內容壓縮成一行，設定到 .env.local：
# FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**優點**：不會過期，穩定可靠。

**替代方案（ADC）**：如無法取得 Service Account Key，可使用 Application Default Credentials

```bash
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
```

**注意**：ADC 憑證約 1 小時過期，需定期重新登入。

## 架構設計

### 認證流程架構

專案採用「混合認證架構」：

1. **OAuth 用戶**（Google/Facebook/LINE）
   - Firebase Auth 處理 OAuth 登入
   - 註冊時必須綁定手機號碼（OTP 驗證）+ 設定密碼
   - 登入方式：OAuth 按鈕 OR 手機+密碼 OR Email+密碼

2. **手機註冊用戶**
   - 使用 Firebase Phone Auth 進行 OTP 驗證
   - 註冊時需提供：手機、Email、密碼
   - 登入方式：手機+密碼 OR Email+密碼

3. **密碼儲存與驗證**
   - 密碼儲存在 **Prisma 資料庫**（bcrypt hash，10 rounds）
   - **不存在** Firebase Auth 中
   - 登入時透過 Custom Token 橋接：
     ```
     Prisma 密碼驗證 → 生成 Custom Token → Firebase Auth Session
     ```

### 關鍵設計決策

#### ADR-001: Firebase Admin SDK 認證方式
- **決策**：優先使用 Service Account Key，回退到 ADC
- **理由**：Service Account Key 不會過期，穩定可靠；ADC 約 1 小時過期需重新登入
- **實作**：檢查 `FIREBASE_SERVICE_ACCOUNT_KEY` 環境變數，無則使用 `applicationDefault()`
- **參考**：`src/lib/firebaseAdmin.ts`

#### ADR-002: 密碼儲存在 Prisma，不在 Firebase
- **決策**：所有密碼儲存在自有資料庫（Prisma），不使用 Firebase Email/Password Auth
- **理由**：允許 OAuth 用戶也能使用密碼登入；統一密碼管理邏輯
- **影響**：需使用 Firebase Custom Token 來建立 Firebase Auth Session
- **參考**：`src/app/api/auth/create-custom-token/route.ts`

#### ADR-003: 移除 OTPVerification Model
- **決策**：不在資料庫中儲存 OTP 記錄
- **理由**：改用 Firebase Phone Authentication，Firebase 自動處理 OTP 生成、發送、驗證
- **影響**：簡化資料庫結構，降低維護成本
- **參考**：`prisma/schema.prisma`（註解說明）

### 目錄結構

```
src/
├── app/
│   ├── api/auth/              # 認證相關 API
│   │   ├── oauth/callback/    # OAuth 登入處理
│   │   ├── register-phone/    # 手機號碼註冊
│   │   ├── update-phone/      # 綁定手機 + 設定密碼（OAuth 註冊流程）
│   │   ├── create-custom-token/ # 產生 Custom Token（手機/Email 登入）
│   │   ├── login-email/       # Email + 密碼登入
│   │   └── forgot-password/   # 密碼重設
│   ├── register/
│   │   ├── manual/            # 手機號碼註冊頁（3 步驟流程）
│   │   ├── complete/          # OAuth 註冊完成頁（綁定手機+密碼）
│   │   └── verify-otp/        # OTP 驗證頁（備用）
│   ├── login/                 # 登入頁面
│   ├── dashboard/             # 受保護頁面（需登入）
│   ├── dev/users/             # 開發用：用戶管理介面
│   └── page.tsx               # 首頁
├── components/
│   └── auth/
│       └── OAuthButtons.tsx   # OAuth 登入按鈕元件
├── lib/
│   ├── firebase.ts            # Firebase SDK 初始化（前端）
│   ├── firebaseAdmin.ts       # Firebase Admin SDK 初始化（後端）
│   ├── firebaseAuth.ts        # Token 驗證 utilities
│   ├── firebasePhoneAuth.ts   # Phone Auth 輔助函式
│   └── prisma.ts              # Prisma Client 初始化
└── types/                     # TypeScript 型別定義
```

### 認證相關檔案對照表

| 功能 | 前端頁面 | API Route | 使用 Firebase 功能 |
|------|---------|-----------|------------------|
| OAuth 登入 | `components/auth/OAuthButtons.tsx` | `api/auth/oauth/callback` | OAuth Provider |
| OAuth 完成註冊 | `register/complete/page.tsx` | `api/auth/update-phone` | Phone Auth (OTP) |
| 手機號碼註冊 | `register/manual/page.tsx` | `api/auth/register-phone` | Phone Auth (OTP) |
| 手機+密碼登入 | `login/page.tsx` | `api/auth/create-custom-token` | Custom Token |
| Email+密碼登入 | `login/page.tsx` | `api/auth/login-email` | Custom Token |
| 認證狀態檢查 | `dashboard/page.tsx` | - | `onAuthStateChanged` |

## 重要實作細節

### Firebase Phone Auth 流程

```typescript
// 1. 前端設置 reCAPTCHA
const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  size: 'invisible',
});

// 2. 發送 OTP
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);

// 3. 驗證 OTP（用戶輸入驗證碼）
const userCredential = await confirmationResult.confirm(verificationCode);

// 4. 取得 Firebase User
const firebaseUser = userCredential.user;
```

**參考實作**：`src/app/register/manual/page.tsx`

### Custom Token 登入流程

```typescript
// 1. 後端驗證密碼（Prisma）
const user = await prisma.user.findUnique({ where: { phoneNumber } });
const isPasswordValid = await bcrypt.compare(password, user.password);

// 2. 生成 Custom Token（Firebase Admin SDK）
const customToken = await adminAuth.createCustomToken(user.uid);

// 3. 前端使用 Custom Token 登入
await signInWithCustomToken(auth, customToken);

// 4. Firebase Auth Session 建立
// onAuthStateChanged 會觸發，導向 Dashboard
```

**參考實作**：`src/app/api/auth/create-custom-token/route.ts`

### Prisma Schema 關鍵欄位

```prisma
model User {
  uid             String   @unique       // Firebase UID（全域唯一）
  email           String   @unique       // Email 地址
  phoneNumber     String   @unique       // 手機號碼（國際格式，如 +886912345678）
  password        String?                // bcrypt hash（OAuth 用戶也有此欄位）

  // OAuth Provider IDs（擇一或為 null）
  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique

  // 驗證狀態
  emailVerified   Boolean  @default(false)  // OAuth 用戶自動為 true
  phoneVerified   Boolean  @default(false)  // OTP 驗證後為 true
}
```

**索引優化**：已在 `email`、`phoneNumber`、`uid` 建立索引。

## 開發工作流程

### 修改 Prisma Schema

```bash
# 1. 編輯 prisma/schema.prisma
# 2. 建立 migration
npx prisma migrate dev --name "add_new_field"
# 3. 重新生成 Prisma Client
npx prisma generate
# 4. 重啟 dev server
pnpm dev
```

### 新增 API Route

1. 在 `src/app/api/` 建立資料夾和 `route.ts`
2. 使用 `NextRequest` 和 `NextResponse` 型別
3. 驗證必填欄位，回傳適當的 HTTP 狀態碼
4. 使用 try-catch 處理錯誤

**範例模板**：參考 `src/app/api/auth/create-custom-token/route.ts`

### 認證保護頁面

```typescript
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ProtectedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <div>Loading...</div>;
  return <div>Protected Content</div>;
}
```

## 環境變數設定

**必要環境變數**（`.env.local`）：

```bash
# Firebase 前端設定
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK（推薦使用 Service Account Key）
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# 資料庫（使用絕對路徑，避免找不到檔案）
DATABASE_URL="file:/absolute/path/to/project/prisma/dev.db"
```

**注意**：
- `FIREBASE_SERVICE_ACCOUNT_KEY` 為 Service Account JSON 壓縮成一行的字串
- `DATABASE_URL` 必須使用絕對路徑，相對路徑可能導致 Prisma 找不到資料庫

## 測試與除錯

### 開發工具

- **用戶管理介面**：`http://localhost:3000/dev/users`
- **Prisma Studio**：`npx prisma studio`（`http://localhost:5556`）
- **Firebase Console**：前往 Firebase 專案控制台

### 常見錯誤處理

#### Firebase Admin SDK 認證失敗

**錯誤訊息**：「Firebase Admin SDK 認證失敗」或初始化錯誤

**解決方法**：

1. **檢查 Service Account Key**（推薦）：
   ```bash
   # 確認 .env.local 中有設定 FIREBASE_SERVICE_ACCOUNT_KEY
   cat .env.local | grep FIREBASE_SERVICE_ACCOUNT_KEY
   ```

2. **使用 ADC（替代方案）**：
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   pnpm dev
   ```

**說明**：優先使用 Service Account Key（不會過期）。ADC 憑證約 1 小時過期，需定期重新登入。

#### Prisma Client 版本不符

**錯誤訊息**：`Prisma Client version mismatch`

**解決方法**：
```bash
npx prisma generate
pnpm dev
```

#### 資料庫被鎖定

**錯誤訊息**：`database is locked`

**解決方法**：
```bash
# 關閉 Prisma Studio（按 Ctrl+C）
# 或找出並關閉使用資料庫的程序
lsof prisma/dev.db
kill <PID>
```

## 程式碼規範

### 註解語言

- **工作專案**（路徑包含 `/work/`）：使用**繁體中文**註解
- **個人專案**（路徑包含 `/personal/`）：使用英文註解

### TypeScript 規範

- 明確標註函式參數和回傳值型別
- 使用 `interface` 定義物件結構
- 避免使用 `any`，改用 `unknown` 或明確型別
- API Route 使用 `NextRequest` 和 `NextResponse` 型別

### 錯誤處理

- 所有 API Route 必須有 try-catch
- 回傳適當的 HTTP 狀態碼（400、401、500）
- 前端顯示用戶友善的錯誤訊息
- 後端 console.error 記錄詳細錯誤資訊

### 安全性考量

- 密碼使用 bcrypt hash（10 rounds）
- API 驗證 Firebase ID Token（`verifyIdToken`）
- 敏感資料（如密碼）不出現在 API 回應中
- 使用環境變數儲存機密資訊（不提交到 Git）

## 參考文件

專案詳細文件位於 `docs/` 目錄：

- **認證系統現況**：`docs/AUTHENTICATION_STATUS.md`（必讀，反映實際狀況）
- **ADC 設定指南**：`docs/ADC_SETUP.md`
- **資料庫管理**：`docs/DATABASE_GUIDE.md`
- **文檔導航**：`docs/00-INDEX.md`

## 已知限制與注意事項

1. **密碼儲存**：密碼僅存在 Prisma，不在 Firebase（設計決策）
2. **Custom Token 必要性**：手機/Email 登入必須使用 Custom Token 來建立 Firebase Session
3. **Firebase Admin SDK 認證**：
   - 推薦使用 Service Account Key（穩定不過期）
   - ADC 作為替代方案（約 1 小時過期）
4. **SQLite 限制**：開發環境使用 SQLite，生產環境需遷移到 PostgreSQL
5. **組織政策限制**：部分組織可能限制下載 Service Account 金鑰（需聯繫管理員）

## Git 工作流程

**GitHub 帳號**：工作專案使用適當的工作帳號（路徑 `/work/`）

```bash
# 提交前檢查
pnpm type-check
pnpm lint

# Git 操作
git status
git add .
git commit -m "描述變更內容"

# 推送前確認分支
git branch
git push
```

---

_此文檔隨專案演進持續更新。最後更新：2025-11-21_
