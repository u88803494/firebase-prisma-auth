# 資料庫設計

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔定義認證系統的資料庫結構，使用 **Prisma ORM** 管理，開發環境使用 **SQLite**，生產環境可無痛升級到 **PostgreSQL**。

---

## 🎯 技術選擇

### 資料庫選擇

| 環境 | 資料庫 | 原因 |
|------|--------|------|
| **開發** | SQLite | 輕量、免安裝、快速開發 |
| **生產** | PostgreSQL | 企業級、高效能、可擴展 |

### ORM 選擇：Prisma

**優點**：
- ✅ Type-safe 查詢（TypeScript 完美整合）
- ✅ 自動遷移管理
- ✅ 內建 Prisma Studio（資料視覺化）
- ✅ 支援多種資料庫（SQLite ↔ PostgreSQL 無痛切換）
- ✅ 優秀的開發體驗

---

## 🗄️ 資料表結構

### 資料表清單

| 表名 | 說明 | 記錄數預估 |
|------|------|-----------|
| `users` | 用戶主表 | ~ 用戶數 |
| `otp_verifications` | OTP 驗證記錄 | ~ 用戶數 × 10 |

---

## 📋 Prisma Schema 完整定義

### `prisma/schema.prisma`

```prisma
// ================================================
// Prisma Configuration
// ================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // 開發環境
  // provider = "postgresql"  // 生產環境（取消註解並修改 DATABASE_URL）
  url      = env("DATABASE_URL")
}

// ================================================
// User Model - 用戶主表
// ================================================

model User {
  // ────────────────────────────────
  // 主鍵和唯一識別
  // ────────────────────────────────
  id              Int      @id @default(autoincrement())
  uid             String   @unique       // Firebase UID（全域唯一）

  // ────────────────────────────────
  // 基本資訊（必填）
  // ────────────────────────────────
  email           String   @unique       // Email 地址（唯一）
  phoneNumber     String   @unique       // 手機號碼（唯一）

  // ────────────────────────────────
  // 認證資訊
  // ────────────────────────────────
  password        String?                // 密碼 Hash（手動註冊才有）
                                         // OAuth 註冊用戶此欄位為 null

  // ────────────────────────────────
  // 個人資訊（可選）
  // ────────────────────────────────
  displayName     String?                // 顯示名稱
  photoURL        String?                // 大頭照 URL

  // ────────────────────────────────
  // OAuth Provider IDs（可選）
  // ────────────────────────────────
  googleId        String?  @unique       // Google OAuth ID
  facebookId      String?  @unique       // Facebook OAuth ID
  lineId          String?  @unique       // LINE OAuth ID

  // ────────────────────────────────
  // 驗證狀態
  // ────────────────────────────────
  emailVerified   Boolean  @default(false)  // Email 是否已驗證
  phoneVerified   Boolean  @default(false)  // 手機是否已驗證（OTP 驗證）

  // ────────────────────────────────
  // 時間戳記
  // ────────────────────────────────
  createdAt       DateTime @default(now())  // 建立時間
  updatedAt       DateTime @updatedAt       // 更新時間

  // ────────────────────────────────
  // 索引優化
  // ────────────────────────────────
  @@index([email])         // 加速 Email 查詢
  @@index([phoneNumber])   // 加速手機號碼查詢
  @@index([uid])           // 加速 Firebase UID 查詢

  // ────────────────────────────────
  // 資料表映射名稱
  // ────────────────────────────────
  @@map("users")
}

// ================================================
// OTPVerification Model - OTP 驗證記錄
// ================================================

model OTPVerification {
  // ────────────────────────────────
  // 主鍵
  // ────────────────────────────────
  id              Int      @id @default(autoincrement())

  // ────────────────────────────────
  // OTP 資訊
  // ────────────────────────────────
  phoneNumber     String                 // 接收 OTP 的手機號碼
  code            String                 // 6 位數 OTP 碼
  expiresAt       DateTime               // 過期時間（5 分鐘後）

  // ────────────────────────────────
  // 驗證狀態
  // ────────────────────────────────
  verified        Boolean  @default(false)  // 是否已驗證

  // ────────────────────────────────
  // 時間戳記
  // ────────────────────────────────
  createdAt       DateTime @default(now())  // 建立時間

  // ────────────────────────────────
  // 索引優化
  // ────────────────────────────────
  @@index([phoneNumber])   // 加速手機號碼查詢
  @@index([expiresAt])     // 加速過期記錄清理

  // ────────────────────────────────
  // 資料表映射名稱
  // ────────────────────────────────
  @@map("otp_verifications")
}
```

---

## 📊 資料表詳細說明

### 1. `users` 表

#### 欄位說明

| 欄位名 | 類型 | 必填 | 唯一 | 說明 |
|--------|------|------|------|------|
| `id` | Int | ✅ | ✅ | 自增主鍵 |
| `uid` | String | ✅ | ✅ | Firebase UID，全域唯一識別 |
| `email` | String | ✅ | ✅ | Email 地址 |
| `phoneNumber` | String | ✅ | ✅ | 手機號碼（台灣格式：09XX-XXX-XXX） |
| `password` | String | ❌ | ❌ | bcrypt hash（手動註冊才有） |
| `displayName` | String | ❌ | ❌ | 顯示名稱 |
| `photoURL` | String | ❌ | ❌ | 大頭照 URL |
| `googleId` | String | ❌ | ✅ | Google OAuth 唯一 ID |
| `facebookId` | String | ❌ | ✅ | Facebook OAuth 唯一 ID |
| `lineId` | String | ❌ | ✅ | LINE OAuth 唯一 ID |
| `emailVerified` | Boolean | ✅ | ❌ | Email 驗證狀態（預設 false） |
| `phoneVerified` | Boolean | ✅ | ❌ | 手機驗證狀態（預設 false） |
| `createdAt` | DateTime | ✅ | ❌ | 建立時間（自動） |
| `updatedAt` | DateTime | ✅ | ❌ | 更新時間（自動） |

#### 登入方式判別

**OAuth 用戶**：
- `googleId` / `facebookId` / `lineId` 至少有一個不為 null
- `password` 為 null

**手動註冊用戶**：
- `password` 不為 null
- 所有 OAuth ID 為 null

**混合用戶**（後續綁定）：
- `password` 不為 null
- 至少有一個 OAuth ID 不為 null

#### 索引策略

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phoneNumber ON users(phoneNumber);
CREATE INDEX idx_users_uid ON users(uid);
```

**原因**：
- `email`：登入查詢高頻
- `phoneNumber`：登入查詢高頻
- `uid`：Firebase Token 驗證高頻

---

### 2. `otp_verifications` 表

#### 欄位說明

| 欄位名 | 類型 | 必填 | 說明 |
|--------|------|------|------|
| `id` | Int | ✅ | 自增主鍵 |
| `phoneNumber` | String | ✅ | 接收 OTP 的手機號碼 |
| `code` | String | ✅ | 6 位數 OTP 碼 |
| `expiresAt` | DateTime | ✅ | 過期時間（建立時間 + 5 分鐘） |
| `verified` | Boolean | ✅ | 是否已驗證（預設 false） |
| `createdAt` | DateTime | ✅ | 建立時間 |

#### OTP 規則

- **有效期**：5 分鐘
- **格式**：6 位數字（000000 ~ 999999）
- **驗證後處理**：標記 `verified = true`
- **清理機制**：定期刪除過期記錄（Cron job 或手動）

#### 索引策略

```sql
CREATE INDEX idx_otp_phoneNumber ON otp_verifications(phoneNumber);
CREATE INDEX idx_otp_expiresAt ON otp_verifications(expiresAt);
```

**原因**：
- `phoneNumber`：查詢最新 OTP
- `expiresAt`：清理過期記錄

---

## 🔄 資料庫遷移

### 初始化 Prisma

```bash
# 1. 初始化 Prisma（會建立 prisma/schema.prisma）
npx prisma init

# 2. 編輯 schema.prisma（貼上上面的 Schema）

# 3. 執行遷移（建立資料表）
npx prisma migrate dev --name init

# 4. 生成 Prisma Client
npx prisma generate
```

### 查看資料（Prisma Studio）

```bash
# 啟動 Prisma Studio（http://localhost:5555）
npx prisma studio
```

---

## 📈 查詢範例

### 1. 建立 OAuth 用戶（首次註冊）

```typescript
const user = await prisma.user.create({
  data: {
    uid: firebaseUser.uid,
    email: firebaseUser.email || userInput.email,
    phoneNumber: userInput.phoneNumber,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    googleId: firebaseUser.providerData[0].uid,  // 如果是 Google OAuth
    phoneVerified: true,  // OTP 驗證通過
    emailVerified: firebaseUser.emailVerified,
  },
});
```

---

### 2. 建立手動註冊用戶

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);

const user = await prisma.user.create({
  data: {
    uid: firebaseUser.uid,
    email: userInput.email,
    phoneNumber: userInput.phoneNumber,
    password: hashedPassword,
    phoneVerified: true,  // OTP 驗證通過
    emailVerified: false, // 需要 Email 驗證
  },
});
```

---

### 3. 查詢用戶（支援多種方式）

```typescript
// 透過 Email 查詢
const userByEmail = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
});

// 透過手機號碼查詢
const userByPhone = await prisma.user.findUnique({
  where: { phoneNumber: '0912345678' },
});

// 透過 Firebase UID 查詢
const userByUid = await prisma.user.findUnique({
  where: { uid: 'firebase-uid-123' },
});

// 透過 Google OAuth ID 查詢
const userByGoogle = await prisma.user.findUnique({
  where: { googleId: 'google-oauth-id' },
});
```

---

### 4. 驗證密碼（登入）

```typescript
import bcrypt from 'bcryptjs';

// 查詢用戶
const user = await prisma.user.findUnique({
  where: { email: inputEmail },
});

if (!user || !user.password) {
  throw new Error('帳號或密碼錯誤');
}

// 驗證密碼
const isValid = await bcrypt.compare(inputPassword, user.password);

if (!isValid) {
  throw new Error('帳號或密碼錯誤');
}

// 驗證成功，返回用戶資訊
```

---

### 5. 建立 OTP 記錄

```typescript
const otp = await prisma.oTPVerification.create({
  data: {
    phoneNumber: userInput.phoneNumber,
    code: generateOTP(),  // 生成 6 位數 OTP
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),  // 5 分鐘後
  },
});
```

---

### 6. 驗證 OTP

```typescript
// 查詢最新的 OTP 記錄
const otpRecord = await prisma.oTPVerification.findFirst({
  where: {
    phoneNumber: userInput.phoneNumber,
    verified: false,
    expiresAt: {
      gte: new Date(),  // 未過期
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});

if (!otpRecord) {
  throw new Error('OTP 不存在或已過期');
}

if (otpRecord.code !== userInput.otp) {
  throw new Error('OTP 驗證碼錯誤');
}

// 驗證成功，標記為已驗證
await prisma.oTPVerification.update({
  where: { id: otpRecord.id },
  data: { verified: true },
});
```

---

### 7. 更新用戶密碼（重設）

```typescript
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(newPassword, 10);

await prisma.user.update({
  where: { email: userEmail },
  data: { password: hashedPassword },
});
```

---

### 8. 清理過期 OTP 記錄（Cron Job）

```typescript
// 刪除所有過期且未驗證的 OTP
await prisma.oTPVerification.deleteMany({
  where: {
    expiresAt: {
      lt: new Date(),  // 已過期
    },
    verified: false,
  },
});
```

---

## 🔒 安全考量

### 1. 密碼存儲
- **絕對不存明文**：使用 bcrypt hash（cost factor = 10）
- **Salt 自動生成**：bcrypt 內建 salt 機制

### 2. 唯一性約束
- `email`、`phoneNumber`、`uid` 必須唯一
- 防止重複註冊

### 3. 索引優化
- 加速登入查詢
- 避免全表掃描

### 4. OTP 安全
- 5 分鐘有效期
- 驗證後立即標記
- 定期清理過期記錄

---

## 🚀 SQLite ↔ PostgreSQL 遷移

### 切換到 PostgreSQL（生產環境）

#### Step 1: 修改 `schema.prisma`

```prisma
datasource db {
  provider = "postgresql"  // 改為 postgresql
  url      = env("DATABASE_URL")
}
```

#### Step 2: 修改 `.env.local`

```env
# SQLite（開發）
# DATABASE_URL="file:./prisma/dev.db"

# PostgreSQL（生產）
DATABASE_URL="postgresql://user:password@localhost:5432/auth_db"
```

#### Step 3: 執行遷移

```bash
# 重新遷移（會自動轉換到 PostgreSQL）
npx prisma migrate dev

# 生成新的 Prisma Client
npx prisma generate
```

### 資料遷移（可選）

如果需要將 SQLite 資料遷移到 PostgreSQL：

```bash
# 使用 Prisma 工具或手動匯出/匯入
# 詳見 Prisma 官方文檔
```

---

## 📊 效能優化建議

### 索引優化
- ✅ 已建立必要索引（email、phoneNumber、uid）
- 生產環境可考慮額外索引（依查詢模式）

### 查詢優化
- 使用 `findUnique` 而非 `findFirst`（唯一鍵查詢更快）
- 避免 `select *`，只查詢需要的欄位

### 資料清理
- 定期清理過期 OTP 記錄（避免表過大）
- 考慮軟刪除（soft delete）而非硬刪除

---

## 🔗 相關文檔

- [功能需求](../requirements/FUNCTIONAL_REQUIREMENTS.md)
- [用戶流程](../requirements/USER_FLOWS.md)
- [API 設計](./API_DESIGN.md)
- [實作計劃](../implementation/PHASE_PLAN.md)

---

_此文檔會隨資料結構調整持續更新_
