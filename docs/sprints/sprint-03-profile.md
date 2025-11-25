# Sprint 3: 個人資料完善機制

**時間**：Week 5-6
**優先級**：P1（重要功能）
**預估點數**：8
**狀態**：待開始
**前置條件**：Sprint 1-2 完成

---

## Sprint 目標

實作登入後強制個人資料完善機制，確保所有用戶（OAuth 和手機註冊）完成必要的個人資料填寫後才能使用系統。

### 核心概念

**個人資料完善（Profile Completion）**：
- 用戶首次登入後，必須完成個人資料填寫才能存取系統功能
- 包含：姓名、生日、性別等必要資訊
- 完成後設定 `profileCompleted` 標記為 `true`
- 未完成前，所有頁面導向個人資料完善頁

**流程**：
```
登入成功 → 檢查 profileCompleted
→ 如為 false：強制導向 /profile/complete
→ 如為 true：允許存取 Dashboard 等頁面
```

---

## 使用者故事

### Story 1：個人資料完善頁面（5 點）

**作為** 新註冊的用戶
**我想要** 完成個人資料填寫
**以便** 開始使用系統功能

**驗收標準**：
- [ ] 登入後如 `profileCompleted` 為 `false`，導向 `/profile/complete`
- [ ] 個人資料完善頁面包含必要欄位：
  - 姓名（必填）
  - 生日（必填）
  - 性別（必填：男/女/其他）
- [ ] 表單驗證：
  - 姓名至少 2 個字元
  - 生日日期合理（18-120 歲）
  - 所有欄位必填
- [ ] 提交後更新資料庫，設定 `profileCompleted = true`
- [ ] 提交成功後導向 Dashboard

**技術任務**：
1. 建立 `/src/app/profile/complete/page.tsx`
   - 個人資料完善表單
   - 包含姓名、生日、性別欄位
   - 表單驗證邏輯
   - 提交後呼叫 API
2. 建立 `/src/app/api/profile/complete/route.ts`
   - 接收個人資料
   - 驗證 JWT（使用 auth middleware）
   - 更新資料庫 User 記錄
   - 設定 `profileCompleted = true`
3. 更新 Prisma Schema
   - 新增 `displayName`、`birthDate`、`gender`、`profileCompleted` 欄位

### Story 2：個人資料完善檢查（3 點）

**作為** 系統
**我想要** 在用戶存取任何受保護頁面時檢查是否完成個人資料
**以便** 確保所有用戶資料完整

**驗收標準**：
- [ ] Dashboard 頁面檢查 `profileCompleted`
- [ ] 如為 `false`，導向 `/profile/complete`
- [ ] 如為 `true`，正常顯示 Dashboard
- [ ] 個人資料完善頁面本身不檢查（避免循環）

**技術任務**：
1. 更新 `/src/app/dashboard/page.tsx`
   - 新增 `profileCompleted` 檢查
   - 如為 `false`，使用 `router.push('/profile/complete')`
2. 建立 `/src/lib/hooks/useProfileCheck.ts`（可選）
   - 可重用的 profile check hook
   - 其他受保護頁面可使用

---

## 技術規格

### Prisma Schema 更新

```prisma
model User {
  uid             String   @unique
  email           String   @unique
  phoneNumber     String   @unique
  password        String?

  // OAuth Provider IDs
  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique

  // 驗證狀態
  emailVerified   Boolean  @default(false)
  phoneVerified   Boolean  @default(false)

  // 個人資料
  displayName     String?
  photoURL        String?
  birthDate       DateTime?
  gender          String?   // "male" | "female" | "other"
  profileCompleted Boolean  @default(false)  // ← 新增

  lastLoginAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### API 規格：POST /api/profile/complete

**Request**：
```typescript
{
  displayName: string;    // 姓名（2-50 字元）
  birthDate: string;      // ISO 8601 格式：YYYY-MM-DD
  gender: "male" | "female" | "other";
}
```

**Response（成功）**：
```typescript
{
  success: true;
  user: {
    uid: string;
    displayName: string;
    birthDate: string;
    gender: string;
    profileCompleted: true;
  }
}
```

**Response（失敗）**：
```typescript
{
  error: string;  // "Invalid name" | "Invalid birth date" 等
}
```

### 表單驗證規則

```typescript
// 姓名驗證
const nameRegex = /^[\u4e00-\u9fa5a-zA-Z\s]{2,50}$/;
// 允許中文、英文、空格，2-50 字元

// 生日驗證
const today = new Date();
const birthDate = new Date(input);
const age = today.getFullYear() - birthDate.getFullYear();
// 年齡必須在 18-120 之間

// 性別驗證
const validGenders = ["male", "female", "other"];
```

---

## 檔案清單

### 新建檔案

1. **`/src/app/profile/complete/page.tsx`**
   - 個人資料完善表單頁面
   - 包含 displayName、birthDate、gender 欄位
   - 表單驗證和提交邏輯

2. **`/src/app/api/profile/complete/route.ts`**
   - 接收個人資料並更新資料庫
   - 使用 auth middleware 驗證 JWT
   - 設定 `profileCompleted = true`

3. **`/src/lib/hooks/useProfileCheck.ts`**（可選）
   - 可重用的 profile check hook
   - 檢查 `profileCompleted` 並導向

### 重構檔案

4. **`/src/app/dashboard/page.tsx`**
   - 新增 `profileCompleted` 檢查
   - 如未完成，導向 `/profile/complete`

5. **`/src/stores/authStore.ts`**
   - 新增 `profileCompleted` 欄位到 user state
   - 登入時儲存 `profileCompleted` 狀態

### 資料庫遷移

6. **Prisma Migration**
   - 新增 `displayName`、`birthDate`、`gender`、`profileCompleted` 欄位
   - 設定 `profileCompleted` 預設值為 `false`

---

## 技術決策

### TD-008: 登入後才完善個人資料

**決策**：個人資料完善在登入後進行，而非註冊時

**理由**：
- 對齊 web-hubble 的流程設計
- 降低註冊摩擦，提高註冊轉化率
- 允許用戶先體驗系統，再要求完善資料
- OAuth 註冊流程已簡化（只綁手機），進一步降低摩擦

**影響**：
- 註冊流程更簡潔
- 用戶首次登入後需額外一步
- 需實作強制導向邏輯

### TD-009: 必填欄位最小化

**決策**：個人資料完善只要求最少必要欄位（姓名、生日、性別）

**理由**：
- 降低用戶完善資料的心理負擔
- 提高完善率
- 其他資訊可後續收集或設為選填

**影響**：
- 資料完整性較低
- 可能需要多次向用戶收集資訊
- 平衡用戶體驗和資料需求

### TD-010: 使用 profileCompleted 標記

**決策**：使用單一布林值 `profileCompleted` 標記資料是否完善

**理由**：
- 簡單明確，易於檢查
- 避免多次資料庫查詢檢查各欄位
- 未來如增加必填欄位，只需更新 API 邏輯

**影響**：
- 需確保 API 邏輯正確設定標記
- 如需修改必填欄位，需遷移現有用戶

---

## 測試策略

### 單元測試

1. **表單驗證測試**
   - 測試姓名驗證規則
   - 測試生日驗證規則
   - 測試性別驗證規則

2. **API 測試** (`/src/app/api/profile/complete/route.test.ts`)
   - 測試有效資料成功更新
   - 測試無效資料被拒絕
   - 測試未認證請求被拒絕

### 整合測試

3. **個人資料完善流程測試**
   - 測試新用戶登入後導向 `/profile/complete`
   - 測試提交資料後 `profileCompleted` 設為 `true`
   - 測試完善後可正常存取 Dashboard

### E2E 測試

4. **完整流程測試**
   - 註冊新帳號
   - 登入成功
   - 自動導向個人資料完善頁
   - 填寫姓名、生日、性別
   - 提交成功
   - 導向 Dashboard
   - Dashboard 正常顯示

---

## 驗收標準（Definition of Done）

### 功能完整性
- [ ] 個人資料完善頁面完成
- [ ] 表單驗證正常運作
- [ ] API 端點正常運作
- [ ] Dashboard 檢查 `profileCompleted`
- [ ] 未完成資料的用戶無法存取 Dashboard

### 代碼品質
- [ ] TypeScript 型別完整
- [ ] 表單驗證邏輯清晰
- [ ] API 錯誤處理完善
- [ ] 通過 ESLint 和型別檢查

### 資料庫
- [ ] Prisma Migration 成功
- [ ] 新欄位正確新增
- [ ] 現有用戶 `profileCompleted` 設為 `false`

### 測試
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] E2E 測試通過

### 文件
- [ ] 更新 CLAUDE.md
- [ ] API 端點文件
- [ ] 流程圖更新

---

## 風險管理

### 風險 1：現有用戶資料遷移
**影響**：中
**機率**：高
**描述**：現有用戶的 `profileCompleted` 將被設為 `false`，需要重新完善資料

**應對方案**：
- Migration 時檢查用戶是否已有 `displayName` 等欄位
- 如已有，設定 `profileCompleted = true`
- 發送通知告知現有用戶需完善資料

### 風險 2：用戶體驗摩擦
**影響**：中
**機率**：中
**描述**：強制完善資料可能造成用戶流失

**應對方案**：
- 清楚說明為何需要這些資料
- 表單設計簡潔易用
- 提供「稍後完成」選項（但仍限制功能存取）

### 風險 3：必填欄位變更
**影響**：低
**機率**：中
**描述**：未來可能需要增加或減少必填欄位

**應對方案**：
- 使用 `profileCompleted` 標記而非檢查各欄位
- API 邏輯集中，易於修改
- 記錄欄位變更的版本

---

## 後續 Sprint 依賴

### Sprint 4 依賴項
- ✅ 個人資料完善機制已建立
- ✅ 資料庫結構支援完整個人資料

Sprint 4 將實作：
- 個人資料編輯功能
- 多平台帳號綁定/解綁

---

## 技術債務

### 已知債務
1. **個人資料編輯功能缺失**：完善後無法修改資料
   - 未來考慮：實作個人資料編輯頁（Sprint 4）
   - 優先級：P2

2. **「稍後完成」功能缺失**：必須立即完善資料
   - 未來考慮：允許跳過，但限制功能
   - 優先級：P3

3. **必填欄位驗證固定**：無法動態調整必填欄位
   - 未來考慮：可配置的必填欄位系統
   - 優先級：P3

---

## 參考資源

### 相關文件
- [web-hubble 註冊流程](../../web-hubble/docs/auth/guides/registration-flow.md)

### 內部文件
- [Sprint 1: 核心架構](./sprint-01-core-jwt.md)
- [Sprint 2: OAuth 雙層 JWT](./sprint-02-oauth-refactor.md)
- [Sprint 4: 多平台綁定](./sprint-04-binding.md)

---

## 更新記錄

- 2025-11-21：Sprint 3 初始規劃完成
