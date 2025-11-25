# 架構遷移策略

本文件說明從當前 Custom Token 架構遷移到 Backend JWT 架構的詳細策略和步驟。

---

## 遷移概述

### 當前架構（As-Is）
```
手機/Email + 密碼登入：
Prisma 驗證密碼 → Firebase Admin createCustomToken
→ 前端 signInWithCustomToken → Firebase Auth Session

OAuth 登入：
Firebase OAuth → Custom Token → Firebase Auth Session
```

### 目標架構（To-Be）
```
手機/Email + 密碼登入：
Prisma 驗證密碼 → 直接發放 Backend JWT

OAuth 登入：
Firebase OAuth → Firebase ID Token → 後端驗證 → 發放 Backend JWT
```

---

## 遷移原則

### 1. 向下相容性
- ✅ 現有用戶資料不受影響
- ✅ 資料庫 Schema 變更向下相容
- ✅ 不破壞現有功能

### 2. 漸進式遷移
- ✅ 按 Sprint 順序逐步遷移
- ✅ 每個 Sprint 都是可部署的完整功能
- ✅ 可隨時回滾到前一個 Sprint 狀態

### 3. 最小停機時間
- ✅ 資料庫 Migration 可在不停機狀態下執行
- ✅ 前後端代碼部署可分階段進行
- ✅ 使用 feature flags 控制新功能啟用

---

## 詳細遷移步驟

### Phase 1: 準備階段（Sprint 1 開始前）

**目標**：確保環境和工具準備就緒

**步驟**：
1. **備份資料庫**
   ```bash
   # SQLite 備份
   cp prisma/dev.db prisma/dev.db.backup

   # PostgreSQL 備份
   pg_dump database_name > backup.sql
   ```

2. **設定 JWT_SECRET**
   ```bash
   # 生成 32 字元隨機字串
   openssl rand -base64 32

   # 加入 .env.local
   JWT_SECRET=your_jwt_secret_here"生成的隨機字串"
   ```

3. **安裝相依套件**
   ```bash
   pnpm add jsonwebtoken zustand
   pnpm add -D @types/jsonwebtoken
   ```

4. **建立測試環境**
   - 確保 dev server 正常運作
   - 確保 Prisma Studio 可存取
   - 確保 Firebase Admin SDK 認證正常

---

### Phase 2: Sprint 1 - 核心架構遷移

**目標**：手機/Email 登入使用 Backend JWT

**步驟**：

1. **建立 JWT 工具（Day 1）**
   - [ ] 建立 `/src/lib/jwt.ts`
   - [ ] 實作 `generateToken` 和 `verifyToken`
   - [ ] 撰寫單元測試

2. **建立 Auth Middleware（Day 1-2）**
   - [ ] 建立 `/src/lib/middleware/auth.ts`
   - [ ] 實作 JWT 驗證邏輯
   - [ ] 撰寫單元測試

3. **重構手機登入 API（Day 2-3）**
   - [ ] 重命名 `/src/app/api/auth/create-custom-token/` → `login-phone/`
   - [ ] 移除 `createCustomToken` 調用
   - [ ] 改用 `generateToken`
   - [ ] 測試 API

4. **重構 Email 登入 API（Day 3）**
   - [ ] 更新 `/src/app/api/auth/login-email/`
   - [ ] 改用 `generateToken`
   - [ ] 測試 API

5. **建立認證狀態管理（Day 4-5）**
   - [ ] 建立 `/src/stores/authStore.ts`
   - [ ] 實作 login、logout、checkAuth actions
   - [ ] 整合到前端頁面

6. **更新前端登入頁面（Day 5-6）**
   - [ ] 移除 `signInWithCustomToken`
   - [ ] 改用 authStore 管理狀態
   - [ ] 測試登入流程

7. **更新 Dashboard（Day 6）**
   - [ ] 移除 `onAuthStateChanged`
   - [ ] 改用 authStore 檢查認證
   - [ ] 測試受保護頁面

8. **E2E 測試（Day 7）**
   - [ ] 測試手機登入完整流程
   - [ ] 測試 Email 登入完整流程
   - [ ] 測試 Dashboard 存取控制

**驗證檢查點**：
- [ ] 手機+密碼登入使用 Backend JWT
- [ ] Email+密碼登入使用 Backend JWT
- [ ] 不再調用 `createCustomToken`
- [ ] Dashboard 正常運作

**回滾計畫**：
- 如遷移失敗，保留舊的 API 端點
- 前端可切換回使用舊端點

---

### Phase 3: Sprint 2 - OAuth 雙層 JWT

**目標**：OAuth 登入使用雙層 JWT，註冊流程調整

**步驟**：

1. **建立 OAuth Token 驗證 API（Day 1-2）**
   - [ ] 建立 `/src/app/api/auth/oauth/verify-token/`
   - [ ] 實作 Firebase ID Token 驗證
   - [ ] 實作 Backend JWT 發放
   - [ ] 測試 API

2. **重構 OAuth 按鈕元件（Day 2-3）**
   - [ ] 更新 `/src/components/auth/OAuthButtons.tsx`
   - [ ] 實作雙層 JWT 流程
   - [ ] 處理註冊導向邏輯
   - [ ] 測試 OAuth 登入

3. **更新 OAuth 註冊完成頁（Day 3-4）**
   - [ ] 移除密碼輸入步驟
   - [ ] 簡化為只綁定手機
   - [ ] 更新 UI
   - [ ] 測試註冊流程

4. **更新 update-phone API（Day 4）**
   - [ ] 移除密碼參數
   - [ ] 改用 Backend JWT
   - [ ] 測試 API

5. **資料庫 Migration（Day 5）**
   - [ ] 確保 `password` 欄位允許 `null`
   - [ ] 執行 Migration
   - [ ] 驗證現有資料

6. **E2E 測試（Day 6-7）**
   - [ ] 測試 OAuth 登入（已註冊用戶）
   - [ ] 測試 OAuth 註冊（新用戶）
   - [ ] 測試 OAuth 用戶登入後使用系統

**驗證檢查點**：
- [ ] OAuth 登入使用雙層 JWT
- [ ] OAuth 註冊不需要設定密碼
- [ ] 所有登入方法統一使用 Backend JWT
- [ ] 不再有 Custom Token 相關代碼

**回滾計畫**：
- 保留舊的 OAuth callback 邏輯
- 可透過 feature flag 切換

---

### Phase 4: Sprint 3-5 - 功能擴展

這些 Sprint 為新功能實作，不涉及架構遷移，風險較低。

**Sprint 3：個人資料完善**
- 新功能，無遷移問題
- 資料庫新增欄位，不影響現有資料

**Sprint 4：多平台綁定**
- 新功能，無遷移問題
- 擴展現有 OAuth 功能

**Sprint 5：密碼重設**
- 重構現有功能
- 新增 Email OTP 方式

---

## 風險管理

### 風險矩陣

| 風險 | 影響 | 機率 | 等級 | 應對方案 |
|------|------|------|------|----------|
| JWT Secret 洩漏 | 高 | 低 | 中 | 定期輪換、不提交到 Git |
| 資料庫 Migration 失敗 | 高 | 低 | 中 | 事前備份、測試環境驗證 |
| 前端認證狀態不同步 | 中 | 中 | 中 | Zustand 狀態管理、自動檢查 |
| OAuth 流程中斷 | 中 | 低 | 低 | 保留舊流程、feature flag |
| 用戶登出後 Token 仍有效 | 低 | 高 | 中 | Token 有效期設為 7 天 |

### 應對措施

**預防措施**：
- 完整的單元測試和整合測試
- 在測試環境先完整驗證
- 每個 Sprint 獨立可部署
- 保留回滾方案

**監控措施**：
- 監控 API 錯誤率
- 監控登入成功率
- 監控 JWT 驗證失敗數量
- 用戶回報機制

**復原措施**：
- 資料庫備份可快速復原
- 代碼版本控制可快速回滾
- feature flag 可快速切換舊流程

---

## 資料庫 Migration 詳細計畫

### Sprint 1: 無需 Migration

**原因**：只是改變登入邏輯，不修改資料庫結構

---

### Sprint 2: password 欄位允許 null

**Migration 檔案**：`prisma/migrations/YYYYMMDDHHMMSS_allow_null_password/migration.sql`

```sql
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
```

**執行步驟**：
```bash
# 1. 建立 Migration
npx prisma migrate dev --name allow_null_password

# 2. 檢查 Migration SQL
cat prisma/migrations/*/migration.sql

# 3. 執行 Migration
npx prisma migrate deploy

# 4. 驗證
npx prisma studio
```

**回滾計畫**：
```sql
-- 如需回滾（須先處理 null 資料）
-- 先設定預設值給 null 的 password
UPDATE "User" SET "password" = 'OAUTH_USER' WHERE "password" IS NULL;

-- 再設定 NOT NULL
ALTER TABLE "User" ALTER COLUMN "password" SET NOT NULL;
```

---

### Sprint 3: 新增個人資料欄位

**Migration 檔案**：`prisma/migrations/YYYYMMDDHHMMSS_add_profile_fields/migration.sql`

```sql
-- AlterTable
ALTER TABLE "User"
ADD COLUMN "displayName" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "gender" TEXT,
ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
```

**執行步驟**：同 Sprint 2

**注意事項**：
- 現有用戶的 `profileCompleted` 將為 `false`
- 需引導現有用戶完成個人資料

---

## 部署策略

### 開發環境部署

**步驟**：
1. Pull 最新代碼
2. 執行 Prisma Migration
3. 安裝相依套件
4. 更新環境變數
5. 重啟 dev server
6. 手動測試主要流程

**檢查清單**：
- [ ] 代碼無 TypeScript 錯誤
- [ ] 代碼通過 ESLint
- [ ] Prisma Migration 成功
- [ ] Dev server 正常啟動
- [ ] 登入功能正常

---

### 生產環境部署

**準備工作**：
1. 完整備份生產資料庫
2. 在 staging 環境完整測試
3. 準備回滾計畫
4. 通知用戶維護時間（如需要）

**部署步驟**：
1. **停止服務**（如需要）
2. **備份資料庫**
   ```bash
   pg_dump production_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```
3. **部署後端代碼**
   ```bash
   git pull origin main
   pnpm install
   pnpm build
   ```
4. **執行 Migration**
   ```bash
   npx prisma migrate deploy
   ```
5. **更新環境變數**（如有新增）
6. **重啟服務**
   ```bash
   pm2 restart app
   # 或
   systemctl restart app
   ```
7. **驗證部署**
   - 檢查服務狀態
   - 測試登入功能
   - 監控錯誤日誌

**回滾計畫**：
```bash
# 1. 回滾代碼
git reset --hard <previous_commit>
pnpm install
pnpm build

# 2. 回滾資料庫（如需要）
psql production_db < backup_file.sql

# 3. 重啟服務
pm2 restart app
```

---

## 成功標準

### Sprint 1 成功標準
- [ ] 所有單元測試通過
- [ ] 所有整合測試通過
- [ ] E2E 測試通過
- [ ] 手機登入使用 Backend JWT
- [ ] Email 登入使用 Backend JWT
- [ ] 無 Custom Token 調用

### Sprint 2 成功標準
- [ ] OAuth 登入使用雙層 JWT
- [ ] OAuth 註冊流程調整完成
- [ ] 所有登入方法統一使用 Backend JWT
- [ ] 測試覆蓋率 > 80%

### 整體專案成功標準
- [ ] 所有 P0 和 P1 Sprint 完成
- [ ] 生產環境部署成功
- [ ] 用戶無感知地完成遷移
- [ ] 系統穩定運行 1 週無重大問題

---

## 參考資源

- [Sprint 1: 核心架構](./sprint-01-core-jwt.md)
- [Sprint 2: OAuth 雙層 JWT](./sprint-02-oauth-refactor.md)
- [測試策略](./testing-strategy.md)

---

## 更新記錄

- 2025-11-21：初始版本
