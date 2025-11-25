# 資料庫管理指南

## 目前狀態

✅ **資料庫已啟用並正常運作**

- 資料庫檔案：`/path/to/firebase-prisma-auth/prisma/dev.db`
- 資料庫類型：SQLite（開發環境）
- Schema 狀態：✅ Up to date（1 個 migration）
- 連線狀態：✅ 正常（已修復路徑問題）

## 📊 管理工具

### 1. Prisma Studio（視覺化管理介面）

**啟動方式**：
```bash
npx prisma studio
```

**功能**：
- 瀏覽所有資料表
- 新增/編輯/刪除資料
- 查看資料關聯
- 執行簡單查詢

**訪問網址**：http://localhost:5556

**注意**：
- Prisma Studio 會鎖定資料庫檔案
- 執行 migration 前需要關閉 Prisma Studio
- 使用 `Ctrl+C` 或關閉終端視窗來停止

---

### 2. 用戶管理頁面（專案內建）

**訪問網址**：http://localhost:3000/dev/users

**功能**：
- 查看所有用戶
- 刪除單一用戶
- 批量刪除所有用戶
- 查看用戶驗證狀態
- 查看 OAuth Provider

**優點**：
- 整合在專案中，不需要額外工具
- 提供業務邏輯相關的操作
- 可以自訂功能

---

## 🔧 常用指令

### 查看資料庫狀態

```bash
# 查看 migration 狀態
npx prisma migrate status

# 查看 schema
cat prisma/schema.prisma
```

### 執行 Migrations

```bash
# 建立新的 migration（當 schema 有變更時）
npx prisma migrate dev --name 描述變更內容

# 重置資料庫（⚠️ 會刪除所有資料）
npx prisma migrate reset

# 部署 migrations 到生產環境
npx prisma migrate deploy
```

### 重新生成 Prisma Client

```bash
# 當 schema 變更後，需要重新生成
npx prisma generate
```

### 查看資料庫內容（CLI）

```bash
# 使用 Prisma Studio
npx prisma studio

# 或使用 SQLite CLI（如果已安裝）
sqlite3 prisma/dev.db "SELECT * FROM users;"
```

---

## 📝 資料表結構

### User 資料表

| 欄位 | 類型 | 說明 | 限制 |
|------|------|------|------|
| id | Int | 主鍵 | 自動遞增 |
| uid | String | Firebase UID | 唯一 |
| email | String | Email 地址 | 唯一 |
| phoneNumber | String | 手機號碼 | 唯一 |
| password | String? | 密碼 Hash | 可為空 |
| displayName | String? | 顯示名稱 | 可為空 |
| photoURL | String? | 大頭照 URL | 可為空 |
| googleId | String? | Google ID | 唯一（可為空） |
| facebookId | String? | Facebook ID | 唯一（可為空） |
| lineId | String? | LINE ID | 唯一（可為空） |
| emailVerified | Boolean | Email 驗證狀態 | 預設 false |
| phoneVerified | Boolean | 手機驗證狀態 | 預設 false |
| createdAt | DateTime | 建立時間 | 自動設定 |
| updatedAt | DateTime | 更新時間 | 自動更新 |

**索引**：
- email（加速查詢）
- phoneNumber（加速查詢）
- uid（加速查詢）

---

## 🚨 常見問題

### Q1: 資料庫被鎖定 (database is locked)

**原因**：Prisma Studio 或其他程序正在使用資料庫

**解決方法**：
```bash
# 1. 找出使用資料庫的程序
lsof prisma/dev.db

# 2. 關閉 Prisma Studio（如果在執行）
# 按 Ctrl+C 停止

# 3. 如果還是被鎖定，強制關閉程序
kill <PID>
```

---

### Q2: Migration 失敗

**常見原因**：
1. 資料庫被鎖定
2. Schema 與現有資料不相容
3. SQLite 限制（如某些 ALTER TABLE 操作）

**解決方法**：
```bash
# 方法 1：重置資料庫（⚠️ 會刪除所有資料）
npx prisma migrate reset

# 方法 2：手動修復
# 1. 備份資料
# 2. 刪除 dev.db
# 3. 重新執行 migration
npx prisma migrate dev
```

---

### Q3: Prisma Client 版本不符

**錯誤訊息**：`Prisma Client version mismatch`

**解決方法**：
```bash
# 重新生成 Prisma Client
npx prisma generate

# 如果還是有問題，清除快取
rm -rf node_modules/.prisma
pnpm install
npx prisma generate
```

---

### Q4: 找不到資料庫檔案 (Error code 14)

**原因**：DATABASE_URL 路徑錯誤

**檢查**：
```bash
# 查看當前設定
cat .env.local | grep DATABASE_URL
```

**應該是**：
```bash
# ✅ 使用絕對路徑（推薦）
DATABASE_URL="file:/path/to/firebase-prisma-auth/prisma/dev.db"

# ❌ 不要用相對路徑（可能導致找不到檔案）
DATABASE_URL="file:./prisma/dev.db"
```

---

## 🔄 開發流程

### 修改 Schema 的標準流程

```bash
# 1. 編輯 prisma/schema.prisma
# 2. 建立 migration
npx prisma migrate dev --name "add_new_field"

# 3. 重新生成 Prisma Client
npx prisma generate

# 4. 重啟 dev server
pnpm dev
```

---

### 備份與還原

**備份資料庫**：
```bash
# 複製整個 dev.db 檔案
cp prisma/dev.db prisma/dev.db.backup

# 或使用 SQLite dump
sqlite3 prisma/dev.db .dump > backup.sql
```

**還原資料庫**：
```bash
# 從備份檔案還原
cp prisma/dev.db.backup prisma/dev.db

# 或從 SQL dump 還原
sqlite3 prisma/dev.db < backup.sql
```

---

## 📊 效能優化

### 索引建議

目前已建立的索引：
- `users.email`
- `users.phoneNumber`
- `users.uid`

如果有新的查詢需求，可以在 schema.prisma 中新增索引：

```prisma
model User {
  // ...欄位定義...

  @@index([createdAt])    // 如果常按建立時間排序
  @@index([emailVerified]) // 如果常篩選已驗證用戶
}
```

---

### 查詢優化

**善用 Prisma 的查詢優化**：

```typescript
// ✅ 只選取需要的欄位
const users = await prisma.user.findMany({
  select: {
    id: true,
    email: true,
    displayName: true,
  }
});

// ❌ 避免取得所有欄位（如果不需要）
const users = await prisma.user.findMany();
```

---

## 🎯 下一步

### 未來遷移到 PostgreSQL

當要部署到生產環境時，建議遷移到 PostgreSQL：

**步驟**：

1. **修改 schema.prisma**：
```prisma
datasource db {
  provider = "postgresql"  // 改為 postgresql
  url      = env("DATABASE_URL")
}
```

2. **更新 DATABASE_URL**（.env.production）：
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/firebase_auth_poc"
```

3. **執行 migration**：
```bash
npx prisma migrate dev
```

---

## 📚 相關文件

- [Prisma 官方文件](https://www.prisma.io/docs)
- [Prisma Migrate 指南](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Studio 使用說明](https://www.prisma.io/docs/concepts/components/prisma-studio)
- [專案認證狀態文件](./AUTHENTICATION_STATUS.md)

---

## 快速參考

```bash
# 啟動視覺化管理介面
npx prisma studio

# 查看資料庫狀態
npx prisma migrate status

# 重新生成 Prisma Client
npx prisma generate

# 建立新 migration
npx prisma migrate dev --name "描述"

# 重置資料庫（清空所有資料）
npx prisma migrate reset

# 查看使用資料庫的程序
lsof prisma/dev.db
```
