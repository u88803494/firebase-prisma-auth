# Sprint 4: 多平台綁定/解綁

**時間**：Week 7-8
**優先級**：P2（額外功能）
**預估點數**：8
**狀態**：待開始
**前置條件**：Sprint 1-3 完成

---

## Sprint 目標

實作多平台帳號綁定/解綁功能，允許用戶將多個 OAuth 平台（Google、Facebook、LINE）綁定到同一帳號，並為 OAuth 帳號設定密碼，實現靈活的多登入方式。

### 核心功能

1. **平台綁定**：用戶可將其他 OAuth 平台綁定到現有帳號
2. **平台解綁**：用戶可解除已綁定的 OAuth 平台
3. **設定密碼**：OAuth 用戶可為帳號設定密碼，啟用密碼登入
4. **修改密碼**：已有密碼的用戶可修改密碼
5. **帳號管理**：統一的帳號管理介面

---

## 使用者故事

### Story 1：OAuth 平台綁定（5 點）

**作為** 已登入的用戶
**我想要** 將其他 OAuth 平台綁定到我的帳號
**以便** 使用多種方式登入系統

**驗收標準**：
- [ ] 帳號管理頁面顯示已綁定的平台
- [ ] 可以綁定尚未綁定的 OAuth 平台（Google/Facebook/LINE）
- [ ] 綁定時檢查該 OAuth 帳號是否已被其他用戶使用
- [ ] 綁定成功後更新資料庫相應的 providerId 欄位
- [ ] 綁定成功後顯示成功訊息

**技術任務**：
1. 建立 `/src/app/account/page.tsx`
   - 帳號管理介面
   - 顯示已綁定平台（Google、Facebook、LINE）
   - 顯示是否已設定密碼
   - 提供綁定/解綁按鈕
2. 建立 `/src/app/api/account/bind-oauth/route.ts`
   - 接收 Firebase ID Token
   - 驗證 token 並提取 providerId
   - 檢查該 OAuth 帳號是否已被使用
   - 更新當前用戶的 providerId 欄位

### Story 2：OAuth 平台解綁（2 點）

**作為** 已登入的用戶
**我想要** 解除已綁定的 OAuth 平台
**以便** 管理我的登入方式

**驗收標準**：
- [ ] 可以解綁已綁定的 OAuth 平台
- [ ] 至少保留一種登入方式（不能全部解綁）
- [ ] 如帳號只有一個 OAuth 且無密碼，無法解綁
- [ ] 解綁成功後清空資料庫相應的 providerId 欄位
- [ ] 解綁成功後顯示成功訊息

**技術任務**：
1. 建立 `/src/app/api/account/unbind-oauth/route.ts`
   - 檢查用戶至少有一種登入方式
   - 清空指定的 providerId 欄位
   - 回傳成功訊息

### Story 3：為 OAuth 帳號設定密碼（1 點）

**作為** OAuth 註冊的用戶
**我想要** 為我的帳號設定密碼
**以便** 也能使用密碼登入

**驗收標準**：
- [ ] OAuth 用戶（`password` 為 `null`）可設定密碼
- [ ] 密碼強度要求：至少 8 字元
- [ ] 設定密碼後可使用手機+密碼或 Email+密碼登入
- [ ] 設定成功後顯示成功訊息

**技術任務**：
1. 在 `/src/app/account/page.tsx` 新增「設定密碼」功能
   - 如 `password` 為 `null`，顯示「設定密碼」按鈕
   - 點擊後顯示密碼設定表單
2. 建立 `/src/app/api/account/set-password/route.ts`
   - 驗證密碼強度
   - 使用 bcrypt hash 密碼
   - 更新資料庫 `password` 欄位

---

## 技術規格

### 帳號管理頁面設計

```typescript
// 頁面狀態
interface AccountStatus {
  user: {
    uid: string;
    email: string;
    phoneNumber: string;
    hasPassword: boolean;  // password !== null
  };
  bindings: {
    google: boolean;    // googleId !== null
    facebook: boolean;  // facebookId !== null
    line: boolean;      // lineId !== null
  };
}

// 登入方式統計
const loginMethods = {
  oauth: ['google', 'facebook', 'line'].filter(p => bindings[p]).length,
  password: hasPassword ? 1 : 0,
  total: oauth + password
};

// 解綁檢查
const canUnbind = loginMethods.total > 1;
```

### API 規格

#### POST /api/account/bind-oauth

**Request**：
```typescript
{
  firebaseToken: string;  // Firebase ID Token
  provider: "google" | "facebook" | "line";
}
```

**Response（成功）**：
```typescript
{
  success: true;
  provider: string;
}
```

**Response（失敗）**：
```typescript
{
  error: "OAuth 帳號已被其他用戶使用" | "無效的 provider"
}
```

#### POST /api/account/unbind-oauth

**Request**：
```typescript
{
  provider: "google" | "facebook" | "line";
}
```

**Response（成功）**：
```typescript
{
  success: true;
}
```

**Response（失敗）**：
```typescript
{
  error: "無法解綁，至少需保留一種登入方式"
}
```

#### POST /api/account/set-password

**Request**：
```typescript
{
  password: string;  // 新密碼（至少 8 字元）
}
```

**Response（成功）**：
```typescript
{
  success: true;
}
```

**Response（失敗）**：
```typescript
{
  error: "密碼強度不足" | "帳號已有密碼"
}
```

---

## 檔案清單

### 新建檔案

1. **`/src/app/account/page.tsx`**
   - 帳號管理頁面
   - 顯示已綁定平台和密碼狀態
   - 提供綁定/解綁/設定密碼功能

2. **`/src/app/api/account/bind-oauth/route.ts`**
   - OAuth 平台綁定 API

3. **`/src/app/api/account/unbind-oauth/route.ts`**
   - OAuth 平台解綁 API

4. **`/src/app/api/account/set-password/route.ts`**
   - 設定密碼 API

5. **`/src/app/api/account/change-password/route.ts`**（可選）
   - 修改密碼 API

---

## 技術決策

### TD-011: 至少保留一種登入方式

**決策**：用戶不能解綁所有登入方式，至少需保留一種

**理由**：
- 避免用戶無法登入
- 確保帳號安全
- 提供清楚的錯誤訊息

**影響**：
- 需在前端和後端都檢查
- 如只剩一種方式，隱藏解綁按鈕

### TD-012: OAuth 帳號唯一性檢查

**決策**：綁定時檢查 OAuth 帳號是否已被其他用戶使用

**理由**：
- 一個 OAuth 帳號只能綁定到一個系統帳號
- 避免帳號衝突
- 資料庫 `googleId`、`facebookId`、`lineId` 已有 `@unique` 約束

**影響**：
- 如 OAuth 帳號已被使用，綁定失敗
- 需提供清楚的錯誤訊息

---

## 測試策略

### 單元測試

1. **登入方式計算測試**
   - 測試 `loginMethods.total` 計算正確
   - 測試 `canUnbind` 邏輯正確

2. **API 測試**
   - 測試綁定 API 正確更新資料庫
   - 測試解綁 API 檢查登入方式數量
   - 測試設定密碼 API hash 密碼

### 整合測試

3. **綁定/解綁流程測試**
   - 測試成功綁定 OAuth 平台
   - 測試解綁後可使用其他方式登入
   - 測試最後一種方式無法解綁

### E2E 測試

4. **完整流程測試**
   - 用 OAuth 註冊並登入
   - 前往帳號管理頁面
   - 設定密碼
   - 綁定其他 OAuth 平台
   - 登出並使用不同方式登入驗證

---

## 驗收標準（Definition of Done）

### 功能完整性
- [ ] 帳號管理頁面完成
- [ ] OAuth 平台綁定功能正常
- [ ] OAuth 平台解綁功能正常
- [ ] 設定密碼功能正常
- [ ] 至少保留一種登入方式的檢查

### 代碼品質
- [ ] TypeScript 型別完整
- [ ] API 錯誤處理完善
- [ ] 前端表單驗證完整

### 測試
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] E2E 測試通過

### 文件
- [ ] 更新 CLAUDE.md
- [ ] API 端點文件
- [ ] 帳號管理流程圖

---

## 風險管理

### 風險 1：OAuth 帳號衝突
**影響**：中
**機率**：中
**描述**：用戶嘗試綁定已被使用的 OAuth 帳號

**應對方案**：
- 資料庫 unique 約束
- 清楚的錯誤訊息
- 提供客服聯絡方式

### 風險 2：用戶誤解綁
**影響**：低
**機率**：低
**描述**：用戶誤解綁所有登入方式

**應對方案**：
- 至少保留一種方式的檢查
- 解綁前顯示確認對話框
- 提供「無法解綁」的說明

---

## 參考資源

### 內部文件
- [Sprint 2: OAuth 雙層 JWT](./sprint-02-oauth-refactor.md)
- [Sprint 3: 個人資料完善](./sprint-03-profile.md)

---

## 更新記錄

- 2025-11-21：Sprint 4 初始規劃完成
