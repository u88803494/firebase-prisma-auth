# Sprint 1: 核心架構 - Backend JWT

**時間**：Week 1-2
**優先級**：P0（必須完成）
**預估點數**：13
**狀態**：待開始

---

## Sprint 目標

建立 Backend JWT 認證基礎架構，將手機+密碼登入和 Email+密碼登入從 Custom Token 機制遷移到純 Backend JWT 認證。

### 核心改變

**之前（Custom Token）**：
```
用戶登入 → Prisma 驗證密碼 → Firebase Admin SDK 生成 Custom Token
→ 前端使用 Custom Token 登入 Firebase → 取得 Firebase ID Token
→ 後續請求使用 Firebase ID Token
```

**之後（Backend JWT）**：
```
用戶登入 → Prisma 驗證密碼 → 後端直接發放 Backend JWT
→ 後續請求使用 Backend JWT → JWT Middleware 驗證
```

**關鍵差異**：
- ❌ 不再使用 Firebase Admin SDK 生成 Custom Token
- ❌ 不再使用 Firebase Auth Session
- ✅ 完全由後端控制認證流程
- ✅ JWT 包含用戶資訊（uid、email、phoneNumber 等）

---

## 使用者故事

### Story 1：手機+密碼登入使用 Backend JWT（8 點）

**作為** 已註冊的用戶
**我想要** 使用手機號碼和密碼登入系統
**以便** 獲得 Backend JWT 來存取受保護的資源

**驗收標準**：
- [ ] 用戶可以使用手機號碼 + 密碼登入
- [ ] 後端驗證密碼後直接發放 Backend JWT
- [ ] JWT 包含必要的用戶資訊（uid、email、phoneNumber）
- [ ] JWT 有效期設定為 7 天
- [ ] 登入失敗有適當的錯誤訊息（密碼錯誤、帳號不存在等）
- [ ] 前端將 JWT 儲存在 localStorage
- [ ] Dashboard 使用 JWT 驗證用戶身份

**技術任務**：
1. 建立 `/src/lib/jwt.ts` - JWT 工具函式
   - `generateToken(payload)`: 生成 JWT
   - `verifyToken(token)`: 驗證 JWT
   - 使用 `jsonwebtoken` 套件
   - 設定 JWT_SECRET 環境變數
2. 建立 `/src/lib/middleware/auth.ts` - JWT 驗證 middleware
   - 從 Authorization header 提取 token
   - 驗證 token 有效性
   - 將用戶資訊附加到 request
3. 重構 `/src/app/api/auth/create-custom-token/route.ts`
   - 重命名為 `/src/app/api/auth/login-phone/route.ts`
   - 移除 Firebase Admin SDK 的 `createCustomToken` 調用
   - 改為使用 `generateToken` 生成 Backend JWT
   - 回傳 JWT 和用戶基本資訊
4. 重構 `/src/app/login/page.tsx`
   - 移除 `signInWithCustomToken` 調用
   - 改為將 JWT 儲存到 localStorage
   - 更新認證狀態管理（使用 Zustand）

### Story 2：Email+密碼登入使用 Backend JWT（3 點）

**作為** 已註冊的用戶
**我想要** 使用 Email 和密碼登入系統
**以便** 獲得 Backend JWT 來存取受保護的資源

**驗收標準**：
- [ ] 用戶可以使用 Email + 密碼登入
- [ ] 後端驗證密碼後直接發放 Backend JWT
- [ ] JWT 結構與手機登入一致
- [ ] 登入失敗有適當的錯誤訊息

**技術任務**：
1. 重構 `/src/app/api/auth/login-email/route.ts`
   - 移除 Firebase Admin SDK 的 `createCustomToken` 調用
   - 改為使用 `generateToken` 生成 Backend JWT
   - 確保與手機登入回傳格式一致

### Story 3：認證狀態管理（2 點）

**作為** 開發者
**我想要** 統一的認證狀態管理
**以便** 在整個應用中追蹤用戶登入狀態

**驗收標準**：
- [ ] 使用 Zustand 建立全域認證狀態
- [ ] 狀態包含：user（用戶資訊）、token（JWT）、isAuthenticated（登入狀態）
- [ ] 提供 login、logout、checkAuth 等 actions
- [ ] 頁面初始化時自動檢查 JWT 有效性
- [ ] JWT 過期時自動登出

**技術任務**：
1. 建立 `/src/stores/authStore.ts`
   - 定義認證狀態 interface
   - 實作 login action：儲存 token 和 user 到 state 和 localStorage
   - 實作 logout action：清除 token 和 user
   - 實作 checkAuth action：驗證 token 有效性
2. 在 `/src/app/layout.tsx` 中初始化 authStore
   - 應用啟動時檢查 localStorage 中的 token
   - 如果 token 有效，恢復登入狀態
   - 如果 token 無效，清除狀態

---

## 技術規格

### JWT Payload 結構

```typescript
interface JWTPayload {
  uid: string;           // Firebase UID
  email: string;         // 用戶 Email
  phoneNumber: string;   // 用戶手機號碼（國際格式）
  emailVerified: boolean;
  phoneVerified: boolean;
  iat: number;          // issued at
  exp: number;          // expiration time
}
```

### JWT 設定

```typescript
// JWT_SECRET: 從環境變數讀取（至少 32 字元）
// JWT_EXPIRES_IN: 7d（7 天）
// Algorithm: HS256

const token = jwt.sign(payload, process.env.JWT_SECRET!, {
  expiresIn: '7d',
  algorithm: 'HS256'
});
```

### API Response 格式

**成功登入**：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "uid": "firebase_uid_123",
    "email": "user@example.com",
    "phoneNumber": "+886912345678",
    "emailVerified": true,
    "phoneVerified": true
  }
}
```

**登入失敗**：
```json
{
  "error": "密碼錯誤"
}
```

### Middleware 使用範例

```typescript
// 在 API Route 中使用
import { verifyAuth } from '@/lib/middleware/auth';

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);

  if (!authResult.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // authResult.user 包含用戶資訊
  const { uid, email } = authResult.user;

  // 繼續處理請求...
}
```

---

## 檔案清單

### 新建檔案

1. **`/src/lib/jwt.ts`** - JWT 工具函式
   ```typescript
   export function generateToken(payload: JWTPayload): string
   export function verifyToken(token: string): JWTPayload | null
   ```

2. **`/src/lib/middleware/auth.ts`** - JWT 認證 middleware
   ```typescript
   export async function verifyAuth(request: NextRequest): Promise<AuthResult>
   ```

3. **`/src/stores/authStore.ts`** - Zustand 認證狀態
   ```typescript
   interface AuthState {
     user: User | null;
     token: string | null;
     isAuthenticated: boolean;
     login: (token: string, user: User) => void;
     logout: () => void;
     checkAuth: () => Promise<boolean>;
   }
   ```

### 重構檔案

4. **`/src/app/api/auth/create-custom-token/route.ts`**
   - 重命名為 `/src/app/api/auth/login-phone/route.ts`
   - 移除 `createCustomToken` 調用
   - 改用 `generateToken`

5. **`/src/app/api/auth/login-email/route.ts`**
   - 移除 `createCustomToken` 調用
   - 改用 `generateToken`

6. **`/src/app/login/page.tsx`**
   - 移除 Firebase Auth 相關代碼
   - 改用 authStore 管理登入狀態

7. **`/src/app/dashboard/page.tsx`**
   - 移除 `onAuthStateChanged` 監聽
   - 改用 authStore 檢查認證狀態

### 環境變數

8. **`.env.local`**
   - 新增 `JWT_SECRET`（至少 32 字元的隨機字串）

---

## 技術決策

### TD-001: 使用 jsonwebtoken 而非 jose

**決策**：使用 `jsonwebtoken` 套件而非 Next.js 推薦的 `jose`

**理由**：
- `jsonwebtoken` 是業界標準，文件完整
- 團隊熟悉度較高
- 功能完整且穩定
- 未來如需遷移到其他框架，代碼可重用

**影響**：
- 需要安裝 `jsonwebtoken` 和 `@types/jsonwebtoken`
- Edge Runtime 不支援（但目前 API Routes 使用 Node.js Runtime）

### TD-002: JWT 有效期設定為 7 天

**決策**：JWT 有效期設定為 7 天，不使用 refresh token

**理由**：
- 這是研究型 POC，簡化實作
- 7 天平衡了安全性和用戶體驗
- 未來可根據需求加入 refresh token 機制

**影響**：
- 用戶每 7 天需要重新登入一次
- 如 token 洩漏，最長有 7 天的風險窗口

### TD-003: JWT 儲存在 localStorage

**決策**：前端將 JWT 儲存在 localStorage

**理由**：
- 簡單且易於實作
- 支援跨分頁共享登入狀態
- 適合 SPA 應用

**安全考量**：
- ⚠️ localStorage 容易受到 XSS 攻擊
- ✅ 確保應用沒有 XSS 漏洞
- 💡 未來可考慮使用 httpOnly cookie（需要調整架構）

### TD-004: 保持 Firebase Admin SDK 用於 Phone Auth

**決策**：僅移除 Custom Token 生成，保留 Firebase Admin SDK 用於其他功能

**理由**：
- Phone Auth（OTP）仍需要 Firebase
- OAuth 功能仍需要 Firebase（Sprint 2 處理）
- 只移除 `createCustomToken` 的使用

**影響**：
- Firebase Admin SDK 依賴仍然存在
- `firebaseAdmin.ts` 檔案保留

---

## 測試策略

### 單元測試

1. **JWT 工具函式測試** (`/src/lib/jwt.test.ts`)
   - 測試 `generateToken` 生成有效的 JWT
   - 測試 `verifyToken` 正確驗證 JWT
   - 測試過期 token 被正確拒絕
   - 測試無效 token 被正確拒絕

2. **Middleware 測試** (`/src/lib/middleware/auth.test.ts`)
   - 測試有效 token 通過驗證
   - 測試無效 token 被拒絕
   - 測試缺少 token 被拒絕
   - 測試過期 token 被拒絕

### 整合測試

3. **手機登入 API 測試**
   - 測試正確的手機號碼和密碼回傳 JWT
   - 測試錯誤的密碼回傳 401
   - 測試不存在的手機號碼回傳 404
   - 測試回傳的 JWT 可以被驗證

4. **Email 登入 API 測試**
   - 測試正確的 Email 和密碼回傳 JWT
   - 測試錯誤的密碼回傳 401
   - 測試不存在的 Email 回傳 404

### E2E 測試（使用 Chrome DevTools MCP）

5. **完整登入流程測試**
   - 用戶在登入頁輸入手機號碼和密碼
   - 點擊登入按鈕
   - 成功登入後導向 Dashboard
   - Dashboard 顯示用戶資訊
   - 重新整理頁面，用戶仍保持登入狀態
   - 點擊登出，清除認證狀態

---

## 驗收標準（Definition of Done）

### 功能完整性
- [ ] 手機+密碼登入使用 Backend JWT
- [ ] Email+密碼登入使用 Backend JWT
- [ ] Dashboard 使用 JWT 驗證用戶身份
- [ ] 登出功能正常運作
- [ ] JWT 過期後自動登出

### 代碼品質
- [ ] 所有新增代碼有 TypeScript 型別定義
- [ ] 通過 ESLint 檢查（`pnpm lint`）
- [ ] 通過型別檢查（`pnpm type-check`）
- [ ] 移除所有 Custom Token 相關代碼

### 測試覆蓋率
- [ ] JWT 工具函式單元測試通過
- [ ] Middleware 單元測試通過
- [ ] API 整合測試通過
- [ ] E2E 測試通過

### 文件完整性
- [ ] JWT 工具函式有 JSDoc 註解
- [ ] Middleware 有使用範例
- [ ] API 端點有 README 說明
- [ ] 更新 CLAUDE.md 中的技術棧說明

### 安全性
- [ ] JWT_SECRET 從環境變數讀取
- [ ] JWT_SECRET 不出現在代碼中
- [ ] 密碼驗證使用 bcrypt
- [ ] 錯誤訊息不洩漏敏感資訊

---

## 風險管理

### 風險 1：JWT 安全性考量
**影響**：高
**機率**：中
**描述**：JWT 儲存在 localStorage 容易受到 XSS 攻擊

**應對方案**：
- 確保應用沒有 XSS 漏洞
- 實作 Content Security Policy (CSP)
- 定期審查第三方套件安全性
- 未來考慮遷移到 httpOnly cookie

### 風險 2：Token 過期處理
**影響**：中
**機率**：高
**描述**：用戶在使用過程中 token 可能過期

**應對方案**：
- 實作 token 過期自動登出
- 顯示友善的過期提示訊息
- 未來考慮實作 refresh token 機制

### 風險 3：Firebase 依賴未完全移除
**影響**：低
**機率**：低
**描述**：可能遺漏某些 Firebase Auth 相關代碼

**應對方案**：
- 使用全域搜尋檢查 `signInWithCustomToken`
- 檢查所有 Firebase Auth 相關 import
- 確保所有頁面不再使用 `onAuthStateChanged`

---

## 後續 Sprint 依賴

### Sprint 2 依賴項
- ✅ JWT 工具函式已建立
- ✅ Middleware 已建立
- ✅ 認證狀態管理已完成
- ✅ 手機+密碼登入已使用 Backend JWT

Sprint 2 將在此基礎上：
- 處理 OAuth 登入的雙層 JWT
- 調整 OAuth 註冊流程（移除密碼設定）

---

## 技術債務

### 已知債務
1. **JWT 儲存方式**：使用 localStorage 有安全風險
   - 未來考慮：httpOnly cookie
   - 優先級：P3

2. **Refresh Token 缺失**：無法無感刷新 token
   - 未來考慮：實作 refresh token 機制
   - 優先級：P2

3. **Token 撤銷機制缺失**：無法強制登出用戶
   - 未來考慮：Token 黑名單或 Redis 儲存
   - 優先級：P3

---

## 參考資源

### 文件
- [JWT 官方網站](https://jwt.io/)
- [jsonwebtoken 套件文檔](https://github.com/auth0/node-jsonwebtoken)
- [Zustand 官方文檔](https://docs.pmnd.rs/zustand/getting-started/introduction)

### 相關 ADR
- [ADR-003: 混合認證架構](../../web-hubble/docs/auth/decisions/adr-003-hybrid-auth-architecture.md)
- [ADR-004: 後端密碼儲存](../../web-hubble/docs/auth/decisions/adr-004-password-storage-backend.md)

### 內部文件
- [遷移策略](./migration-strategy.md)
- [測試策略](./testing-strategy.md)

---

## 更新記錄

- 2025-11-21：Sprint 1 初始規劃完成
