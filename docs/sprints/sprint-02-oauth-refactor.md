# Sprint 2: OAuth 雙層 JWT + 註冊流程調整

**時間**：Week 3-4
**優先級**：P0（必須完成）
**預估點數**：13
**狀態**：待開始
**前置條件**：Sprint 1 完成

---

## Sprint 目標

將 OAuth 登入機制從 Custom Token 遷移到雙層 JWT（Firebase ID Token → Backend JWT），並調整 OAuth 註冊流程，移除密碼設定步驟。

### 核心改變

**之前（OAuth with Custom Token）**：
```
用戶點擊 OAuth 按鈕 → Firebase OAuth 登入 → 取得 Firebase User
→ 檢查資料庫是否存在 → 如不存在，導向註冊完成頁
→ 註冊完成頁：綁定手機（OTP）+ 設定密碼
→ 後端生成 Custom Token → 前端使用 Custom Token 登入 Firebase
```

**之後（OAuth with Dual-Layer JWT）**：
```
用戶點擊 OAuth 按鈕 → Firebase OAuth 登入 → 取得 Firebase ID Token
→ 前端發送 Firebase ID Token 到後端
→ 後端驗證 Firebase ID Token → 檢查資料庫
→ 如用戶存在：直接發放 Backend JWT
→ 如用戶不存在：導向註冊完成頁
→ 註冊完成頁：僅綁定手機（OTP），不需要設定密碼
→ 註冊完成後發放 Backend JWT
```

**關鍵差異**：
- ✅ OAuth 登入使用雙層 JWT（Firebase Token → Backend JWT）
- ❌ OAuth 註冊不再需要設定密碼
- ✅ OAuth 用戶的認證憑證就是 OAuth 本身
- ✅ 統一所有登入方法都使用 Backend JWT

---

## 使用者故事

### Story 1：OAuth 登入使用雙層 JWT（8 點）

**作為** 已註冊的 OAuth 用戶
**我想要** 使用 Google/Facebook/LINE 登入
**以便** 快速登入系統並獲得 Backend JWT

**驗收標準**：
- [ ] 用戶可以使用 Google OAuth 登入
- [ ] 用戶可以使用 Facebook OAuth 登入（如已設定）
- [ ] 用戶可以使用 LINE OAuth 登入（如已設定）
- [ ] 前端取得 Firebase ID Token 後發送到後端
- [ ] 後端驗證 Firebase ID Token 有效性
- [ ] 後端檢查用戶是否存在於資料庫
- [ ] 如用戶存在，發放 Backend JWT
- [ ] 如用戶不存在，回傳需要註冊的標記
- [ ] 登入成功後導向 Dashboard

**技術任務**：
1. 建立 `/src/app/api/auth/oauth/verify-token/route.ts`
   - 接收 Firebase ID Token
   - 使用 Firebase Admin SDK 的 `verifyIdToken` 驗證
   - 從 token 中提取通用用戶資訊（uid, email, name, picture）
   - **新增：從 `token.firebase.sign_in_provider` 識別 OAuth 供應商（例如 'google.com', 'facebook.com', 'oidc.line'）**
   - **新增：從 `token.firebase.identities` 中提取該供應商的唯一 ID (provider-specific UID)**
   - 檢查資料庫中是否存在該用戶（使用 Firebase `uid`）
   - 如存在：更新用戶資料（例如 `displayName`, `photoURL`），生成 Backend JWT 並回傳
   - **修改：如不存在，則建立新用戶，並將 `uid`, `email` 以及對應的平台 ID（`googleId`, `facebookId`, 或 `lineId`）存入資料庫。然後生成 Backend JWT 並回傳。**
2. 重構 `/src/components/auth/OAuthButtons.tsx`
   - 移除註冊後的 Custom Token 處理
   - OAuth 成功後取得 Firebase ID Token
   - 將 Firebase ID Token 發送到 `/api/auth/oauth/verify-token`
   - 如回傳 Backend JWT，儲存並導向 Dashboard
   - 如回傳需要註冊，導向註冊完成頁
3. 重構 `/src/app/api/auth/oauth/callback/route.ts`
   - 簡化邏輯，僅處理 OAuth callback
   - 移除 Custom Token 生成
   - 確保正確回傳 Firebase ID Token

### Story 2：OAuth 註冊流程調整（3 點）

**作為** 新的 OAuth 用戶
**我想要** 只需綁定手機號碼即可完成註冊
**以便** 快速開始使用系統

**驗收標準**：
- [ ] OAuth 註冊只需綁定手機號碼（OTP 驗證）
- [ ] 不需要設定密碼
- [ ] 註冊完成後自動登入（獲得 Backend JWT）
- [ ] 註冊完成後導向 Dashboard
- [ ] OAuth 用戶的 `password` 欄位在資料庫中為 `null`

**技術任務**：
1. 重構 `/src/app/register/complete/page.tsx`
   - 移除密碼輸入欄位
   - 只保留手機號碼綁定流程
   - 簡化為 2 步驟：手機輸入 → OTP 驗證
   - 更新 UI 說明文字
2. 重構 `/src/app/api/auth/update-phone/route.ts`
   - 移除密碼相關欄位檢查
   - 移除 bcrypt hash 處理
   - 只更新 `phoneNumber` 和 `phoneVerified`
   - `password` 欄位保持為 `null`
   - 註冊完成後生成 Backend JWT（而非 Custom Token）
   - 回傳 JWT 和用戶資訊

### Story 3：OAuth 用戶資訊同步（2 點）

**作為** 系統
**我想要** 在 OAuth 登入時同步用戶最新資訊
**以便** 保持資料庫資料的準確性

**驗收標準**：
- [ ] OAuth 登入時更新用戶的 email（如有變更）
- [ ] OAuth 登入時更新 `emailVerified` 狀態
- [ ] 保持 `displayName` 和 `photoURL` 同步（如有提供）

**技術任務**：
1. 在 `/src/app/api/auth/oauth/verify-token/route.ts` 中
   - 檢查 Firebase ID Token 中的用戶資訊
   - 與資料庫中的資訊比對
   - 如有差異，更新資料庫
   - 記錄最後登入時間

---

## 技術規格

### OAuth 雙層 JWT 流程圖

```
┌─────────┐
│  用戶   │
└────┬────┘
     │
     │ 1. 點擊 OAuth 按鈕
     ▼
┌─────────────┐
│   前端      │
│ (Next.js)   │
└──────┬──────┘
       │
       │ 2. signInWithPopup(provider)
       ▼
┌──────────────┐
│  Firebase    │  ← 第一層：Firebase OAuth
│  Auth        │
└──────┬───────┘
       │
       │ 3. 回傳 Firebase ID Token
       ▼
┌─────────────┐
│   前端      │
└──────┬──────┘
       │
       │ 4. POST /api/auth/oauth/verify-token
       │    { firebaseToken: "..." }
       ▼
┌──────────────┐
│   後端      │
│ (API Route) │
└──────┬───────┘
       │
       │ 5. verifyIdToken(firebaseToken)
       ▼
┌──────────────┐
│  Firebase    │
│  Admin SDK   │
└──────┬───────┘
       │
       │ 6. 驗證成功，回傳用戶資訊
       ▼
┌──────────────┐
│   後端      │
│   Prisma    │
└──────┬───────┘
       │
       │ 7. 檢查/更新用戶資料
       │ 8. generateToken(payload)
       ▼
┌─────────────┐
│   前端      │  ← 第二層：Backend JWT
│  儲存 JWT   │
└──────┬──────┘
       │
       │ 9. 導向 Dashboard
       ▼
┌─────────────┐
│ Dashboard   │
└─────────────┘
```

### API 規格：POST /api/auth/oauth/verify-token

**Request**：
```typescript
{
  idToken: string;  // Firebase ID Token from client
}
```

**Response (Success)**：
```typescript
{
  token: string;      // Backend JWT
  user: {
    uid: string;
    email: string;
    phoneNumber: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
  },
  isNewUser: boolean; // True if the user was just created
}
```

**Note on Backend Logic**:
- The backend will use the `idToken` to identify the user and their OAuth provider.
- If the user (identified by Firebase `uid`) does not exist in the database, a new record will be created.
- When creating a new user, the backend **must** save the provider-specific ID into the corresponding `googleId`, `facebookId`, or `lineId` field.

**Error Response**：
```typescript
{
  success: false,
  error: string;  // e.g., "Invalid token" or "Token expired"
}
```

### Prisma Schema 調整

```prisma
model User {
  uid             String   @unique
  email           String   @unique
  phoneNumber     String   @unique
  password        String?  // ← OAuth 用戶為 null，手機註冊用戶有值

  // OAuth Provider IDs
  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique

  // 驗證狀態
  emailVerified   Boolean  @default(false)
  phoneVerified   Boolean  @default(false)

  // 額外資訊
  displayName     String?
  photoURL        String?
  lastLoginAt     DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**重點**：
- `password` 欄位允許為 `null`
- OAuth 用戶的 `password` 為 `null`
- 手機註冊用戶的 `password` 為 bcrypt hash

---

## 檔案清單

### 新建檔案

1. **`/src/app/api/auth/oauth/verify-token/route.ts`**
   - 驗證 Firebase ID Token
   - 檢查/更新用戶資料
   - 發放 Backend JWT

### 重構檔案

2. **`/src/components/auth/OAuthButtons.tsx`**
   - 移除 Custom Token 處理
   - 實作雙層 JWT 流程
   - 處理註冊導向邏輯

3. **`/src/app/api/auth/oauth/callback/route.ts`**
   - 簡化邏輯
   - 移除 Custom Token 生成

4. **`/src/app/register/complete/page.tsx`**
   - 移除密碼輸入步驟
   - 簡化為 2 步驟流程
   - 更新 UI 和說明文字

5. **`/src/app/api/auth/update-phone/route.ts`**
   - 移除密碼參數
   - 移除 bcrypt 處理
   - 改用 Backend JWT

### 資料庫遷移

6. **Prisma Migration**
   - 確保 `password` 欄位允許 `null`
   - 新增 `displayName`、`photoURL`、`lastLoginAt` 欄位（如尚未新增）

---

## 技術決策

### TD-005: OAuth 用戶不需要密碼

**決策**：OAuth 用戶的 `password` 欄位在資料庫中為 `null`，不要求設定密碼

**理由**：
- OAuth 本身就是認證憑證，不需要額外密碼
- 簡化用戶註冊流程，提升用戶體驗
- 符合 web-hubble 的目標架構
- 降低用戶密碼管理負擔

**影響**：
- OAuth 用戶只能使用 OAuth 登入
- 如需使用密碼登入，需要後續實作「設定密碼」功能（Sprint 4）
- 資料庫 `password` 欄位必須允許 `null`

**未來擴展**：
- Sprint 4 可實作「為 OAuth 帳號設定密碼」功能
- 允許 OAuth 用戶也能使用密碼登入

### TD-006: 雙層 JWT 而非純 Firebase Auth

**決策**：OAuth 使用雙層 JWT（Firebase ID Token → Backend JWT），而非純 Firebase Auth Session

**理由**：
- 統一所有登入方法的認證機制（全部使用 Backend JWT）
- 後端可完全控制認證邏輯和權限
- 減少對 Firebase 的依賴（僅 OAuth 和 Phone Auth 依賴 Firebase）
- 符合 web-hubble 的混合架構設計

**影響**：
- 前端需要處理兩次 token 交換
- 增加一次 API 請求（verify-token）
- 後端需要驗證 Firebase ID Token

**優點**：
- 統一認證機制
- 易於擴展和維護
- 可自訂 JWT payload

### TD-007: OAuth 註冊只需綁定手機

**決策**：OAuth 註冊流程只需綁定手機號碼（OTP 驗證），不需要設定密碼

**理由**：
- 對齊 web-hubble 的註冊流程
- 簡化用戶註冊體驗
- 手機號碼綁定用於：密碼重設、帳號安全、多平台綁定

**影響**：
- 註冊流程從 3 步驟簡化為 2 步驟
- 降低註冊摩擦
- 提高註冊轉化率

### TD-008: 儲存各平台 Provider-Specific ID

**決策**：在用戶透過 OAuth 首次註冊時，我們必須將該 OAuth 平台回傳的唯一用戶 ID（例如 Google 的 `sub`，Facebook 的 `id`）儲存到資料庫對應的 `googleId`, `facebookId`, `lineId` 欄位中。

**理由**：
1.  **支持帳號綁定**：這是實現 Sprint 4「多平台帳號綁定」功能的基礎。系統需要這個 ID 來唯一識別一個用戶在特定平台上的身份。
2.  **避免帳號重複**：確保一個 Facebook 帳號只能被一個系統帳號綁定，防止資料庫中出現重複的外部身份。
3.  **提供解綁依據**：未來用戶如果需要解除綁定，系統需要依據這個 ID 來操作。

**影響**：
- `/api/auth/oauth/verify-token` 的邏輯需要被增強，使其能識別不同平台並儲存對應的 ID。
- 這讓我們的用戶模型更穩固，為未來的帳號管理功能鋪路。

---

## 測試策略

### 單元測試

1. **OAuth Token 驗證測試** (`/src/app/api/auth/oauth/verify-token/route.test.ts`)
   - 測試有效的 Firebase ID Token 被正確驗證
   - 測試無效的 token 被拒絕
   - 測試過期的 token 被拒絕
   - 測試用戶資訊正確提取和儲存

### 整合測試

2. **OAuth 登入流程測試**
   - 測試 Google OAuth 登入成功回傳 Backend JWT
   - 測試新用戶 OAuth 登入回傳 `needsRegistration`
   - 測試 OAuth 登入後用戶資訊被更新

3. **OAuth 註冊流程測試**
   - 測試 OAuth 註冊只需綁定手機
   - 測試註冊完成後回傳 Backend JWT
   - 測試註冊後 `password` 欄位為 `null`

### E2E 測試（使用 Chrome DevTools MCP）

4. **完整 OAuth 登入流程（已註冊用戶）**
   - 點擊 Google OAuth 按鈕
   - Firebase OAuth 登入成功
   - 取得 Backend JWT
   - 導向 Dashboard
   - Dashboard 顯示用戶資訊

5. **完整 OAuth 註冊流程（新用戶）**
   - 點擊 Google OAuth 按鈕
   - Firebase OAuth 登入成功
   - 導向註冊完成頁
   - 輸入手機號碼
   - 驗證 OTP
   - 註冊完成
   - 導向 Dashboard

---

## 驗收標準（Definition of Done）

### 功能完整性
- [ ] Google OAuth 登入使用雙層 JWT
- [ ] OAuth 註冊不需要設定密碼
- [ ] OAuth 註冊只需綁定手機（OTP）
- [ ] 新註冊的 OAuth 用戶 `password` 為 `null`
- [ ] OAuth 登入後用戶資訊同步

### 代碼品質
- [ ] 移除所有 OAuth 相關的 Custom Token 代碼
- [ ] 通過 TypeScript 型別檢查
- [ ] 通過 ESLint 檢查
- [ ] 前端 OAuth 流程代碼清晰易懂

### 測試覆蓋率
- [ ] OAuth Token 驗證單元測試通過
- [ ] OAuth 登入整合測試通過
- [ ] OAuth 註冊整合測試通過
- [ ] E2E 測試通過

### 資料庫
- [ ] Prisma Schema 更新（`password` 允許 `null`）
- [ ] Migration 成功執行
- [ ] 現有用戶資料不受影響

### 文件
- [ ] 更新 CLAUDE.md 中的 OAuth 流程說明
- [ ] 更新 API 端點文件
- [ ] 更新註冊流程圖

---

## 風險管理

### 風險 1：Firebase Admin SDK 驗證效能
**影響**：中
**機率**：低
**描述**：每次 OAuth 登入都需要呼叫 Firebase Admin SDK 驗證 token，可能影響效能

**應對方案**：
- 監控 API 回應時間
- 如有效能問題，考慮實作 token 快取機制
- Firebase Admin SDK 已有內建快取

### 風險 2：用戶混淆（OAuth vs 密碼登入）
**影響**：低
**機率**：中
**描述**：用戶可能不清楚 OAuth 帳號是否可以使用密碼登入

**應對方案**：
- 登入頁面清楚說明 OAuth 和密碼登入的差異
- 提供「忘記如何登入」的說明
- 未來實作「為 OAuth 帳號設定密碼」功能（Sprint 4）

### 風險 3：手機號碼重複綁定
**影響**：中
**機率**：低
**描述**：不同 OAuth 帳號可能嘗試綁定同一個手機號碼

**應對方案**：
- 資料庫 `phoneNumber` 欄位已有 `@unique` 約束
- API 回傳清楚的錯誤訊息：「此手機號碼已被使用」
- 未來可實作「解除綁定」功能（Sprint 4）

---

## 後續 Sprint 依賴

### Sprint 3 依賴項
- ✅ OAuth 登入已使用 Backend JWT
- ✅ 所有登入方法統一使用 Backend JWT
- ✅ 認證狀態管理完善

Sprint 3 將在此基礎上：
- 實作登入後強制個人資料完善
- 收集必要的用戶資訊（姓名、生日等）

### Sprint 4 依賴項
- ✅ OAuth 註冊流程已調整
- ✅ 資料庫結構支援多平台綁定

Sprint 4 將實作：
- 多平台帳號綁定/解綁
- 為 OAuth 帳號設定密碼

---

## 技術債務

### 已知債務
1. **OAuth Token 快取缺失**：每次登入都驗證 Firebase ID Token
   - 未來考慮：實作 token 快取機制
   - 優先級：P3

2. **OAuth 用戶無密碼登入**：OAuth 用戶只能使用 OAuth 登入
   - 未來考慮：實作「設定密碼」功能（Sprint 4）
   - 優先級：P2

3. **手機號碼解綁功能缺失**：無法解除手機號碼綁定
   - 未來考慮：實作解綁功能（Sprint 4）
   - 優先級：P3

---

## 參考資源

### Firebase 文件
- [Firebase Admin SDK - Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firebase Auth - OAuth Providers](https://firebase.google.com/docs/auth/web/google-signin)

### 相關 ADR
- [ADR-003: 混合認證架構](../../web-hubble/docs/auth/decisions/adr-003-hybrid-auth-architecture.md)

### 內部文件
- [Sprint 1: 核心架構 - Backend JWT](./sprint-01-core-jwt.md)
- [Sprint 3: 個人資料完善](./sprint-03-profile.md)
- [遷移策略](./migration-strategy.md)

---

## 更新記錄

- 2025-11-21：Sprint 2 初始規劃完成
