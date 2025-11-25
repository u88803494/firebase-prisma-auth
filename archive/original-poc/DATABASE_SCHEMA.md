# 🗄️ SQLite 資料庫設計（Prisma ORM）

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔定義 Firebase Auth POC 的 SQLite 資料庫結構，使用 Prisma ORM 進行管理。

### 設計優勢

| 優勢 | 說明 |
|------|------|
| **零配置** | 檔案型資料庫，無需伺服器 |
| **快速開發** | 直接使用，無需等待 DB 啟動 |
| **輕量級** | 整個資料庫就是一個 `.db` 檔案 |
| **可遷移** | 未來輕鬆升級到 PostgreSQL |
| **團隊協作** | `.db` 檔案可提交到 Git |

---

## 📚 Prisma Schema

### 完整 schema.prisma 文件

```typescript
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ============================================
// 用戶基本資訊表
// ============================================

model User {
  // 主鍵
  id              Int      @id @default(autoincrement())

  // Firebase 識別
  uid             String   @unique              // Firebase UID

  // 基本信息
  email           String   @unique              // Email（必填、唯一）
  phoneNumber     String?  @unique              // 手機號碼（可選、唯一）
  displayName     String?                       // 顯示名稱

  // 登入方式
  // 存儲為 JSON array: '["phone","email","google"]'
  loginMethods    String   @default("[]")

  // 驗證狀態
  phoneVerified   Boolean  @default(false)      // OTP 驗證狀態
  emailVerified   Boolean  @default(false)      // Email 驗證狀態

  // 時間戳
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // 關聯
  userAuth        UserAuth?
  phoneMap        PhoneToEmail?

  @@index([email])                              // Email 快速查詢索引
  @@index([uid])                                // UID 快速查詢索引
  @@map("users")
}

// ============================================
// 認證詳細資訊表
// ============================================

model UserAuth {
  id              Int      @id @default(autoincrement())
  uid             String   @unique              // Firebase UID

  // 存儲為 JSON String（可選）
  // {
  //   "phoneNumber": "0912345678",
  //   "verifiedAt": "2025-11-18T10:00:00Z"
  // }
  phoneAuth       String?

  // 存儲為 JSON String（可選）
  // {
  //   "email": "user@example.com",
  //   "verifiedAt": "2025-11-18T10:05:00Z"
  // }
  emailAuth       String?

  // 存儲為 JSON String（可選）
  // {
  //   "google": {
  //     "uid": "google-uid-123",
  //     "email": "user@gmail.com",
  //     "displayName": "John Doe",
  //     "linkedAt": "2025-11-18T10:10:00Z"
  //   },
  //   "facebook": { ... },
  //   "line": { ... }
  // }
  oauthProviders  String?

  // 時間戳
  updatedAt       DateTime @updatedAt

  // 關聯
  user            User     @relation(fields: [uid], references: [uid], onDelete: Cascade)

  @@map("userAuth")
}

// ============================================
// 手機到 Email 映射表（快速查詢）
// ============================================

model PhoneToEmail {
  id              Int      @id @default(autoincrement())
  phoneNumber     String   @unique              // 手機號碼（主鍵替代）
  uid             String   @unique              // Firebase UID
  email           String                        // 對應的 Email

  createdAt       DateTime @default(now())

  // 關聯
  user            User     @relation(fields: [uid], references: [uid], onDelete: Cascade)

  @@index([phoneNumber])                        // 手機快速查詢
  @@map("phoneToEmail")
}
```

---

## 📊 表結構詳解

### 1️⃣ users 表

**用途**：存儲用戶基本信息

| 欄位 | 類型 | 必填 | 唯一 | 說明 |
|------|------|------|------|------|
| `id` | Int | ✅ | ✅ | 自增主鍵 |
| `uid` | String | ✅ | ✅ | Firebase UID |
| `email` | String | ✅ | ✅ | 用戶 Email |
| `phoneNumber` | String | ❌ | ✅ | 手機號碼（可選） |
| `displayName` | String | ❌ | ❌ | 顯示名稱 |
| `loginMethods` | String | ✅ | ❌ | JSON array |
| `phoneVerified` | Boolean | ✅ | ❌ | OTP 驗證狀態 |
| `emailVerified` | Boolean | ✅ | ❌ | Email 驗證狀態 |
| `createdAt` | DateTime | ✅ | ❌ | 建立時間 |
| `updatedAt` | DateTime | ✅ | ❌ | 更新時間 |

**索引**：
- `uid` (unique)：主要查詢
- `email` (unique)：Email 查詢
- 複合索引：可根據查詢性能需求後期添加

### 2️⃣ userAuth 表

**用途**：存儲認證方式的詳細信息和 OAuth 提供商綁定

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | Int | ✅ | 自增主鍵 |
| `uid` | String | ✅ | Firebase UID（外鍵） |
| `phoneAuth` | String | ❌ | JSON：手機認證詳情 |
| `emailAuth` | String | ❌ | JSON：Email 認證詳情 |
| `oauthProviders` | String | ❌ | JSON：OAuth 提供商集合 |
| `updatedAt` | DateTime | ✅ | 更新時間 |

**JSON 結構範例**：

```json
{
  "phoneAuth": {
    "phoneNumber": "0912345678",
    "verifiedAt": "2025-11-18T10:00:00Z",
    "provider": "phone"
  },
  "emailAuth": {
    "email": "user@example.com",
    "verifiedAt": "2025-11-18T10:05:00Z",
    "provider": "email"
  },
  "oauthProviders": {
    "google": {
      "uid": "google-uid-123",
      "email": "user@gmail.com",
      "displayName": "John Doe",
      "photoURL": "https://...",
      "linkedAt": "2025-11-18T10:10:00Z"
    },
    "facebook": {
      "uid": "facebook-uid-456",
      "email": "user@facebook.com",
      "displayName": "John D.",
      "photoURL": "https://...",
      "linkedAt": "2025-11-18T10:15:00Z"
    },
    "line": {
      "uid": "line-uid-789",
      "displayName": "ジョン",
      "pictureUrl": "https://...",
      "linkedAt": "2025-11-18T10:20:00Z"
    }
  }
}
```

### 3️⃣ phoneToEmail 表

**用途**：快速查詢手機號對應的 Email

| 欄位 | 類型 | 必填 | 唯一 | 說明 |
|------|------|------|------|------|
| `id` | Int | ✅ | ✅ | 自增主鍵 |
| `phoneNumber` | String | ✅ | ✅ | 手機號碼 |
| `uid` | String | ✅ | ✅ | Firebase UID |
| `email` | String | ✅ | ❌ | 對應的 Email |
| `createdAt` | DateTime | ✅ | ❌ | 建立時間 |

**索引**：
- `phoneNumber` (unique)：主要查詢

---

## 🔄 查詢設計

### Prisma 查詢範例

#### 1. 根據 UID 查詢用戶

```typescript
const user = await prisma.user.findUnique({
  where: { uid: "firebase-uid-123" },
  include: { userAuth: true, phoneMap: true }
});
```

#### 2. 根據 Email 查詢用戶

```typescript
const user = await prisma.user.findUnique({
  where: { email: "user@example.com" },
  include: { userAuth: true }
});
```

#### 3. 根據手機查詢用戶（推薦）

```typescript
// 透過 phoneToEmail 映射快速查詢
const phoneMap = await prisma.phoneToEmail.findUnique({
  where: { phoneNumber: "0912345678" }
});

if (phoneMap) {
  const user = await prisma.user.findUnique({
    where: { uid: phoneMap.uid }
  });
}

// 或一次查詢
const phoneMap = await prisma.phoneToEmail.findUnique({
  where: { phoneNumber: "0912345678" },
  include: { user: true }
});
```

#### 4. 檢查 Email/手機是否存在

```typescript
// Email 檢查
const emailExists = await prisma.user.findUnique({
  where: { email: "user@example.com" }
}) !== null;

// 手機檢查
const phoneExists = await prisma.phoneToEmail.findUnique({
  where: { phoneNumber: "0912345678" }
}) !== null;
```

#### 5. 建立新用戶

```typescript
const newUser = await prisma.user.create({
  data: {
    uid: "firebase-uid-123",
    email: "user@example.com",
    phoneNumber: "0912345678",
    displayName: "John Doe",
    loginMethods: JSON.stringify(["phone"]),
    phoneVerified: true,
    emailVerified: false,
    userAuth: {
      create: {
        phoneAuth: JSON.stringify({
          phoneNumber: "0912345678",
          verifiedAt: new Date(),
          provider: "phone"
        })
      }
    },
    phoneMap: {
      create: {
        phoneNumber: "0912345678",
        email: "user@example.com"
      }
    }
  }
});
```

#### 6. 更新 OAuth 綁定

```typescript
// 將 Google OAuth 添加到現有用戶
const updatedAuth = await prisma.userAuth.update({
  where: { uid: "firebase-uid-123" },
  data: {
    oauthProviders: JSON.stringify({
      ...JSON.parse(existingAuth.oauthProviders || "{}"),
      google: {
        uid: "google-uid-123",
        email: "user@gmail.com",
        displayName: "John Doe",
        linkedAt: new Date()
      }
    })
  }
});
```

---

## 🔐 資料完整性

### 外鍵關聯

```typescript
// userAuth 和 phoneToEmail 都透過 uid 關聯到 user
// 當 user 被刪除時，相關記錄自動刪除（onDelete: Cascade）

user.uid (PK)
    ↓
userAuth.uid (FK) → onDelete: Cascade
phoneToEmail.uid (FK) → onDelete: Cascade
```

### 唯一性約束

| 欄位 | 表 | 約束 | 原因 |
|------|-----|------|------|
| `uid` | users | UNIQUE | Firebase UID 全局唯一 |
| `email` | users | UNIQUE | Email 不能重複註冊 |
| `phoneNumber` | users | UNIQUE | 手機號不能重複註冊 |
| `phoneNumber` | phoneToEmail | UNIQUE | 一個手機對應一個用戶 |

---

## 📈 性能優化

### 索引策略

```typescript
// 1. 主鍵索引（自動）
id @id                    // 自動索引

// 2. 唯一索引（自動）
uid @unique               // 自動索引
email @unique             // 自動索引
phoneNumber @unique       // 自動索引

// 3. 常用查詢索引
@@index([email])          // Email 查詢快速
@@index([uid])            // UID 查詢快速
@@index([phoneNumber])    // 手機查詢快速
```

### 查詢優化建議

```typescript
// ✅ 好：直接用唯一欄位
const user = await prisma.user.findUnique({
  where: { uid: "..." }
});

// ✅ 好：用索引欄位
const user = await prisma.user.findUnique({
  where: { email: "..." }
});

// ⚠️ 較差：掃描整個表
const users = await prisma.user.findMany({
  where: { displayName: "John" }  // 沒有索引
});
```

---

## 🔄 遷移到 PostgreSQL

### 升級流程（無代碼改變）

**步驟 1**：修改 schema.prisma

```typescript
// 改這一行
datasource db {
  provider = "postgresql"        // 改成 postgresql
  url      = env("DATABASE_URL")
}
```

**步驟 2**：建立新的 .env

```bash
# 使用 PostgreSQL 連線字串
DATABASE_URL="postgresql://user:password@localhost:5432/firebase_auth_poc"
```

**步驟 3**：執行遷移

```bash
npx prisma migrate deploy
```

**步驟 4**：搞定！程式碼無需改動

---

## 📝 Prisma 常用命令

```bash
# 初始化 Prisma
npx prisma init

# 建立遷移
npx prisma migrate dev --name init

# 套用遷移
npx prisma migrate deploy

# 重設資料庫（開發時用）
npx prisma migrate reset

# 生成 Prisma Client
npx prisma generate

# 查看資料庫 UI（開發時用）
npx prisma studio

# 驗證 schema
npx prisma validate

# 格式化 schema
npx prisma format
```

---

## 🎯 開發工作流程

### 初次設定

```bash
# 1. 複製 schema.prisma
# 2. 執行初始遷移
npx prisma migrate dev --name init

# 3. 自動生成 Prisma Client
# 4. 開始使用！

# 開發時可用 Studio 檢視資料
npx prisma studio
```

### 修改 Schema

```bash
# 1. 編輯 prisma/schema.prisma
# 2. 建立遷移（會自動保存 SQL）
npx prisma migrate dev --name add_new_field

# 3. 程式碼自動更新
# 4. 完成！
```

### 備份資料

```bash
# SQLite 就是複製檔案
cp prisma/dev.db prisma/dev.db.backup

# 恢復
cp prisma/dev.db.backup prisma/dev.db
```

---

## 📚 相關文檔

- [需求規格](./REQUIREMENTS.md)
- [API 規格](./API_SPEC.md)
- [討論紀錄](./DISCUSSION_NOTES.md)
- [Prisma 官方文檔](https://www.prisma.io/docs)
- [SQLite 官方文檔](https://www.sqlite.org/docs.html)

---

_此文檔基於 2025-11-18 的討論_
