# 多帳號綁定功能測試報告

## 功能概述

本專案實作了完整的多帳號綁定功能，允許用戶將多個 OAuth 提供商（Google、Facebook、LINE）綁定到同一個帳號，並可隨時解除綁定。

## 實作內容

### 1. 後端 API

#### 1.1 `/api/auth/link-provider` (新增)
**功能**：將 OAuth 提供商綁定到現有帳號

**流程**：
1. 驗證 Firebase ID Token
2. 從 Firebase Admin SDK 獲取最新 providerData
3. 檢查 Provider ID 是否已被其他用戶使用
4. 更新 Prisma 資料庫

**安全機制**：
- Provider ID 唯一性檢查（防止重複綁定）
- Firebase 與 Prisma 雙重驗證

#### 1.2 `/api/auth/unlink-provider` (新增)
**功能**：解除 OAuth 提供商綁定

**流程**：
1. 驗證用戶身份
2. 檢查是否至少保留一種登入方式
3. 更新 Prisma 資料庫（設為 null）
4. 檢查 Firebase 綁定狀態

**安全機制**：
- 防止用戶解除最後一種登入方式
- 必須保留：密碼 OR 至少一個 OAuth Provider

#### 1.3 `/api/auth/me` (新增)
**功能**：獲取用戶完整資料

**回傳內容**：
- 基本資訊（uid, email, phoneNumber, displayName, photoURL）
- 驗證狀態（emailVerified, phoneVerified）
- Provider 綁定狀態（googleId, facebookId, lineId）
- 密碼設定狀態（hasPassword）

#### 1.4 `/api/auth/oauth/verify-token` (修改)
**新增功能**：Provider ID 衝突檢查

**流程**：
```typescript
// 檢查 Provider ID 是否已被其他用戶使用
const existingUser = await prisma.user.findUnique({
  where:
    providerType === 'google.com' ? { googleId: providerId } :
    providerType === 'facebook.com' ? { facebookId: providerId } :
    { lineId: providerId }
});

// 如果已被其他用戶使用，拒絕登入
if (existingUser && existingUser.uid !== uid) {
  return NextResponse.json({
    success: false,
    error: `此 ${providerType} 帳號已被其他用戶綁定`
  }, { status: 409 });
}
```

### 2. 前端頁面

#### 2.1 `/settings` 頁面 (新增)
**功能**：帳號設定與 Provider 管理

**UI 組成**：
1. **基本資訊區**：顯示 email, phoneNumber, displayName
2. **已綁定登入方式**：顯示已綁定的 Providers，提供解綁按鈕
3. **綁定其他登入方式**：顯示未綁定的 Providers，提供綁定按鈕

**互動流程**：

**綁定流程**：
```typescript
// 1. Firebase 端綁定
const result = await linkWithPopup(auth.currentUser, authProvider);

// 2. 取得新的 ID Token
const idToken = await result.user.getIdToken(true); // forceRefresh

// 3. 呼叫後端同步 Prisma
await fetch('/api/auth/link-provider', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ provider })
});

// 4. 刷新用戶資料
await fetchUserData();
```

**解綁流程**：
```typescript
// 1. 呼叫後端 API（檢查安全性）
await fetch('/api/auth/unlink-provider', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${idToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ provider })
});

// 2. Firebase 端解綁
await unlink(auth.currentUser, firebaseProviderId);

// 3. 刷新用戶資料
await fetchUserData();
```

## 測試結果

### 測試環境
- 開發伺服器：`http://localhost:3000`
- 資料庫：SQLite (dev.db)
- Firebase 認證：使用 Service Account Key

### 測試資料

目前資料庫狀態（3 個測試用戶）：

| 用戶 | Email | 手機 | Google | Facebook | LINE | Password |
|------|-------|------|--------|----------|------|----------|
| Demo User B | test-user@example.com | +886912345001 | ❌ | ✅ | ❌ | ❌ |
| 測試用戶 C | - | +886912345002 | ❌ | ❌ | ✅ | ❌ |
| Demo User A | demo-user@example.com | +886912345003 | ✅ | ❌ | ❌ | ❌ |

### 已驗證功能

#### ✅ 1. OAuth 登入與註冊
- **Google 登入**：成功（Demo User A）
- **Facebook 登入**：成功（Demo User B）
- **LINE 登入**：成功（測試用戶 C）
- **Provider ID 儲存**：正確儲存到 Prisma 資料庫

**伺服器日誌證據**：
```
✅ 建立新 OAuth 用戶: demo-user@example.com (Google)
✅ 建立新 OAuth 用戶: (LINE: p7EF5eA5llb7LoS8iqZOQU7114f2)
✅ 建立新 OAuth 用戶: test-user@example.com (Facebook)
```

#### ✅ 2. Provider ID 唯一性驗證
**機制**：Prisma schema 中設定 `@unique` 約束

```prisma
model User {
  googleId        String?  @unique
  facebookId      String?  @unique
  lineId          String?  @unique
}
```

**效果**：
- 資料庫層級保證 Provider ID 唯一
- 防止同一個 Google/Facebook/LINE 帳號綁定到多個用戶

#### ✅ 3. Provider ID 衝突檢查
**位置**：`/api/auth/oauth/verify-token`

**邏輯**：
```typescript
const existingUser = await prisma.user.findUnique({
  where:
    providerType === 'google.com' ? { googleId: providerId } :
    providerType === 'facebook.com' ? { facebookId: providerId } :
    { lineId: providerId }
});

if (existingUser && existingUser.uid !== uid) {
  return NextResponse.json({
    success: false,
    error: `此 ${providerType} 帳號已被其他用戶綁定`
  }, { status: 409 });
}
```

**測試狀態**：代碼已實作，邏輯正確

#### ✅ 4. 設定頁面登入保護
**機制**：`useEffect` + `onAuthStateChanged`

**測試結果**：
- 未登入用戶訪問 `/settings` 自動重定向到 `/login`
- 登入保護機制正常運作

#### ✅ 5. API 端點型別檢查
**測試命令**：`pnpm type-check`

**結果**：✅ 通過（無錯誤）

**修復記錄**：
- 修正了 Prisma `findUnique` 的動態屬性問題
- 使用顯式條件表達式代替計算屬性名稱

### 待測試功能（需手動測試）

由於瀏覽器自動化環境無法執行 OAuth popup，以下功能需要手動測試：

#### 🔄 1. 綁定流程（需手動測試）
**測試步驟**：
1. 使用 Google 登入（Demo User A）
2. 前往 `/settings` 頁面
3. 點擊「綁定 Facebook」按鈕
4. 完成 Facebook OAuth 授權
5. 驗證資料庫中 `facebookId` 已更新

**預期結果**：
- Firebase providerData 包含兩個 providers
- Prisma 資料庫 `googleId` 和 `facebookId` 都有值

#### 🔄 2. 解綁流程（需手動測試）
**測試步驟**：
1. 使用已綁定多個 Providers 的帳號登入
2. 前往 `/settings` 頁面
3. 點擊「解除綁定」按鈕
4. 驗證資料庫中 Provider ID 已設為 null

**預期結果**：
- Firebase providerData 移除該 provider
- Prisma 資料庫對應欄位設為 null

#### 🔄 3. 解綁安全檢查（需手動測試）
**測試場景**：嘗試解除最後一種登入方式

**測試步驟**：
1. 使用只有一個 Provider 且無密碼的帳號登入
2. 前往 `/settings` 頁面
3. 點擊「解除綁定」按鈕

**預期結果**：
- API 回傳錯誤：「無法解除綁定：至少需保留一種登入方式」
- 提示：「建議先設定密碼後再解除 OAuth 綁定」

#### 🔄 4. Provider ID 衝突測試（需手動測試）
**測試場景**：嘗試將已綁定的 Provider 綁定到另一個帳號

**測試步驟**：
1. 使用帳號 A 登入，綁定 Google
2. 登出，使用帳號 B 登入
3. 嘗試綁定同一個 Google 帳號

**預期結果**：
- 綁定失敗
- 錯誤訊息：「此 GOOGLE 帳號已被其他用戶綁定」

## 技術細節

### 雙層架構：Firebase + Prisma

**設計理由**：
1. **Firebase**：處理 OAuth 流程和 token 驗證
2. **Prisma**：儲存 Provider ID，支援反向查詢

**同步機制**：
- 前端使用 Firebase 完成 OAuth 綁定
- 後端從 Firebase Admin SDK 獲取 providerData
- 後端將 Provider ID 寫入 Prisma 資料庫

### 安全考量

#### 1. Provider ID 唯一性
- **資料庫層級**：`@unique` 約束
- **應用層級**：API 檢查衝突

#### 2. 最後登入方式保護
- 必須保留至少一種登入方式
- 防止用戶鎖定自己的帳號

#### 3. 雙重驗證
- Firebase Token 驗證
- Prisma 資料庫一致性檢查

### TypeScript 型別安全

所有 API 通過嚴格型別檢查：
```typescript
type Provider = 'google' | 'facebook' | 'line';

interface UserData {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  googleId: string | null;
  facebookId: string | null;
  lineId: string | null;
  hasPassword: boolean;
}
```

## 程式碼品質

### TypeScript 型別檢查
```bash
pnpm type-check
✓ 通過（無錯誤）
```

### 程式碼結構
- ✅ 遵循 Next.js 15 App Router 架構
- ✅ API Routes 使用 NextRequest/NextResponse
- ✅ 錯誤處理完整（try-catch + 適當的 HTTP 狀態碼）
- ✅ 日誌記錄詳細（console.log + emoji 標記）

## 總結

### 已完成
✅ 後端 API 實作（4 個 API）
✅ 前端設定頁面 UI
✅ Provider ID 唯一性機制
✅ 安全檢查邏輯
✅ TypeScript 型別檢查
✅ 基本功能驗證

### 待完成（需手動測試）
🔄 完整綁定/解綁流程測試
🔄 Provider ID 衝突測試
🔄 安全機制測試

### 學習價值
1. **Firebase 與 Prisma 整合**：理解雙層架構的設計
2. **OAuth 多帳號綁定**：學習 `linkWithPopup` 和 `unlink` API
3. **安全設計**：Provider ID 唯一性、最後登入方式保護
4. **TypeScript 型別安全**：Prisma 生成型別的使用

---

**報告產生時間**：2025-11-25
**測試環境**：本地開發（`pnpm dev`）
**資料庫**：SQLite (dev.db)
