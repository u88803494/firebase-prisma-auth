# 功能需求規格

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔定義 OAuth 認證系統的詳細功能需求，包含 OAuth 社群登入、手動註冊、登入和密碼重設等完整流程。

---

## 🎯 功能需求總覽

| 需求編號 | 功能模組 | 優先級 | 狀態 |
|---------|---------|--------|------|
| FR1 | OAuth 社群登入/註冊 | ⭐⭐⭐ 必做 | 📋 設計完成 |
| FR2 | 手動註冊 | ⭐⭐⭐ 必做 | 📋 設計完成 |
| FR3 | 登入功能 | ⭐⭐⭐ 必做 | 📋 設計完成 |
| FR4 | 密碼重設 | ⭐⭐ 重要 | 📋 設計完成 |
| FR5 | 用戶資料管理 | ⭐⭐ 重要 | 📋 設計完成 |

---

## FR1: OAuth 社群登入/註冊

### FR1.1 OAuth 提供商支援

**需求描述**：系統必須支援以下 OAuth 2.0 提供商

| 提供商 | 協議 | 用途 |
|--------|------|------|
| Google | OAuth 2.0 | 社群登入/註冊 |
| Facebook | OAuth 2.0 | 社群登入/註冊 |
| LINE | OAuth 2.0 | 社群登入/註冊（亞洲市場） |

**技術實現**：
- 使用 Firebase Authentication 整合
- Google、Facebook：內建支援
- LINE：使用 Generic OAuth Provider 配置

**驗收標準**：
```
GIVEN 用戶在登入頁面
WHEN 點擊任一 OAuth 按鈕（Google/Facebook/LINE）
THEN
  ✅ 正確跳轉到對應 OAuth 授權頁面
  ✅ 授權成功後返回應用程式
  ✅ 取得用戶基本資訊（email、name、photo）
```

---

### FR1.2 首次 OAuth 登入流程（未綁定用戶）

**需求描述**：首次使用 OAuth 登入的用戶必須完成手機號碼和 Email 綁定

**流程步驟**：
1. 用戶點擊 OAuth 按鈕（Google/Facebook/LINE）
2. 完成 OAuth 授權
3. 系統檢查該 OAuth 帳號是否已註冊
4. **未註冊** → 顯示「完成註冊」頁面
5. 用戶輸入手機號碼和 Email
6. 系統發送 OTP 驗證碼（Firebase Phone Auth）
7. 用戶輸入 6 位數 OTP
8. 驗證成功 → 建立用戶記錄（綁定 OAuth ID、手機、Email）
9. 顯示註冊完成視窗
10. 用戶進入首頁

**資料綁定**：
- `googleId` / `facebookId` / `lineId`：OAuth 提供商的唯一 ID
- `email`：用戶輸入或 OAuth 取得
- `phoneNumber`：用戶輸入（必填）
- `displayName`：OAuth 取得
- `photoURL`：OAuth 取得

**驗收標準**：
```
GIVEN 用戶首次使用 Google OAuth 登入
WHEN 完成 OAuth 授權
THEN
  ✅ 系統檢測到未綁定
  ✅ 顯示「完成註冊」表單
  ✅ 必須輸入手機號碼
  ✅ 發送 OTP 成功
  ✅ OTP 驗證通過後建立用戶記錄
  ✅ 資料庫中正確綁定 googleId
```

---

### FR1.3 已綁定 OAuth 用戶登入

**需求描述**：已完成綁定的 OAuth 用戶直接登入

**流程步驟**：
1. 用戶點擊 OAuth 按鈕
2. 完成 OAuth 授權
3. 系統檢查該 OAuth 帳號是否已註冊
4. **已註冊** → 直接登入
5. 取得 Firebase ID Token
6. 後端驗證 Token
7. 返回用戶資訊
8. 進入首頁

**驗收標準**：
```
GIVEN 用戶已使用 Google OAuth 註冊過
WHEN 再次點擊 Google 登入
THEN
  ✅ 直接完成登入（不需再次綁定）
  ✅ 取得完整用戶資訊
  ✅ 正確導向首頁
```

---

### FR1.4 OTP 驗證機制

**需求描述**：手機號碼驗證使用 Firebase Phone Authentication

**OTP 規格**：
- **長度**：6 位數字
- **有效期**：5 分鐘
- **發送方式**：Firebase Phone Auth（SMS）
- **重發限制**：60 秒冷卻時間

**驗證流程**：
1. 用戶輸入手機號碼（格式驗證）
2. 系統調用 Firebase Phone Auth 發送 OTP
3. 用戶收到 SMS（包含 6 位數驗證碼）
4. 用戶輸入 OTP
5. 系統驗證 OTP
   - 成功 → 標記 `phoneVerified = true`
   - 失敗 → 顯示錯誤，允許重試（最多 3 次）
   - 過期 → 提示重新發送

**驗收標準**：
```
GIVEN 用戶輸入有效手機號碼
WHEN 點擊「發送 OTP」
THEN
  ✅ Firebase 成功發送 SMS
  ✅ 用戶收到 6 位數驗證碼
  ✅ 輸入正確 OTP 後驗證成功
  ✅ 輸入錯誤 OTP 後顯示錯誤訊息
  ✅ 5 分鐘後 OTP 自動失效
```

---

## FR2: 手動註冊

### FR2.1 註冊流程

**需求描述**：用戶可使用手機號碼 + Email 手動註冊

**流程步驟**：
1. 用戶點擊「建立帳戶」按鈕
2. 進入註冊頁面
3. 輸入手機號碼（必填，格式驗證）
4. 輸入 Email（必填，格式驗證）
5. 點擊「發送 OTP」
6. 系統發送 OTP 到手機
7. 用戶輸入 OTP
8. 驗證成功 → 進入「設定密碼」頁面
9. 輸入密碼（必須符合強度要求）
10. 確認密碼
11. 完成註冊
12. 顯示註冊完成視窗

**密碼強度要求**：
- 最少 8 個字元
- 至少包含 1 個大寫字母
- 至少包含 1 個小寫字母
- 至少包含 1 個數字
- 可選：至少包含 1 個特殊字元

**資料存儲**：
- `email`：用戶輸入
- `phoneNumber`：用戶輸入
- `password`：bcrypt hash（絕不存明文）
- `emailVerified`：false（需 Email 驗證）
- `phoneVerified`：true（已通過 OTP）

**驗收標準**：
```
GIVEN 用戶在註冊頁面
WHEN 完成手機 + Email + OTP + 密碼設定
THEN
  ✅ 資料庫建立新用戶記錄
  ✅ 密碼正確 hash 存儲
  ✅ phoneVerified = true
  ✅ 可用 Email 或手機號碼 + 密碼登入
```

---

## FR3: 登入功能

### FR3.1 支援的登入方式

**需求描述**：系統支援多種登入方式

| 登入方式 | 認證欄位 | 備註 |
|---------|---------|------|
| OAuth | 第三方授權 | Google/Facebook/LINE |
| 手機號碼 + 密碼 | phoneNumber, password | 手動註冊用戶 |
| Email + 密碼 | email, password | 手動註冊用戶 |

**登入流程（手機/Email + 密碼）**：
1. 用戶輸入手機號碼或 Email
2. 輸入密碼
3. 系統查詢用戶記錄
4. 驗證密碼（bcrypt compare）
5. 登入成功 → 簽發 Firebase Token
6. 前端存儲 Token
7. 導向首頁

**驗收標準**：
```
GIVEN 用戶已手動註冊
WHEN 使用手機號碼 + 密碼登入
THEN
  ✅ 密碼驗證成功
  ✅ 取得 Firebase ID Token
  ✅ 前端存儲 Token
  ✅ 導向首頁

GIVEN 用戶輸入錯誤密碼
WHEN 嘗試登入
THEN
  ✅ 顯示「帳號或密碼錯誤」
  ✅ 不洩漏具體錯誤資訊（安全性）
```

---

## FR4: 密碼重設

### FR4.1 支援的重設方式

**需求描述**：提供兩種密碼重設路徑

| 重設方式 | 適用場景 | 驗證方法 |
|---------|---------|---------|
| Email 驗證 | Email 可用 | Firebase sendPasswordResetEmail |
| OTP 驗證 | 手機可用 | Firebase Phone Auth |

---

### FR4.2 Email 重設路徑

**流程步驟**：
1. 用戶點擊「忘記密碼」
2. 選擇「Email 驗證」
3. 輸入 Email
4. 系統發送重設郵件（Firebase）
5. 用戶點擊郵件中的連結
6. 進入「重設密碼」頁面
7. 輸入新密碼
8. 確認新密碼
9. 重設成功
10. 顯示成功訊息

**驗收標準**：
```
GIVEN 用戶忘記密碼
WHEN 選擇 Email 驗證並輸入 Email
THEN
  ✅ 收到 Firebase 重設郵件
  ✅ 點擊連結進入重設頁面
  ✅ 成功設定新密碼
  ✅ 可用新密碼登入
```

---

### FR4.3 OTP 重設路徑

**流程步驟**：
1. 用戶點擊「忘記密碼」
2. 選擇「手機驗證」
3. 輸入手機號碼
4. 系統發送 OTP
5. 用戶輸入 OTP
6. 驗證成功 → 進入「重設密碼」頁面
7. 輸入新密碼
8. 確認新密碼
9. 重設成功
10. 顯示成功訊息

**驗收標準**：
```
GIVEN 用戶忘記密碼
WHEN 選擇 OTP 驗證並完成驗證
THEN
  ✅ 成功驗證 OTP
  ✅ 可設定新密碼
  ✅ 密碼更新成功
  ✅ 可用新密碼登入
```

---

### FR4.4 不實作的功能

**明確排除的功能**（基於需求討論）：
- ❌ 身分證號碼驗證（需串接內政部 API）
- ❌ 證件上傳審核（需人工審核流程）
- ❌ 發證日期/地點驗證
- ❌ 領補換類別驗證

**原因**：
- 這些是「Email 與手機皆不再使用」和「身份可能被冒用」的進階路徑
- POC 階段不需要實作
- 可作為後續擴展功能

---

## FR5: 用戶資料管理

### FR5.1 用戶資料結構

**必要欄位**：
- `uid`：Firebase UID（唯一）
- `email`：Email 地址（唯一）
- `phoneNumber`：手機號碼（唯一）

**OAuth 欄位**：
- `googleId`：Google OAuth ID（可選）
- `facebookId`：Facebook OAuth ID（可選）
- `lineId`：LINE OAuth ID（可選）

**認證欄位**：
- `password`：密碼 hash（手動註冊才有）
- `displayName`：顯示名稱
- `photoURL`：大頭照 URL

**狀態欄位**：
- `emailVerified`：Email 是否已驗證
- `phoneVerified`：手機是否已驗證
- `createdAt`：建立時間
- `updatedAt`：更新時間

---

### FR5.2 資料驗證規則

**手機號碼**：
- 格式：台灣手機號碼（09XX-XXX-XXX）
- 必須唯一
- 驗證：使用 `libphonenumber-js`

**Email**：
- 格式：標準 Email 格式
- 必須唯一
- 驗證：RFC 5322 規範

**密碼**：
- 長度：8-64 字元
- 強度：至少包含大小寫字母和數字
- 存儲：bcrypt hash（成本因子 10）

---

## 📊 非功能需求 (NFR)

### NFR1: 安全性

| 需求 | 規格 | 實現方式 |
|------|------|---------|
| 密碼存儲 | 絕不存明文 | bcrypt hash (cost 10) |
| Token 驗證 | 每次 API 呼叫驗證 | Firebase Admin SDK verifyIdToken |
| HTTPS | 所有連線加密 | 強制使用 HTTPS |
| CSRF 防護 | 防止跨站請求偽造 | Next.js 內建 CSRF token |
| XSS 防護 | 防止跨站腳本攻擊 | React 自動轉義 + CSP headers |

---

### NFR2: 效能

| 需求 | 目標 | 測量方式 |
|------|------|---------|
| API 回應時間 | < 2 秒 | 後端 API 監控 |
| OAuth 登入 | < 5 秒（含第三方） | 完整流程計時 |
| 資料庫查詢 | < 100ms | Prisma 查詢日誌 |
| 頁面載入 | < 3 秒（首次） | Lighthouse 評分 |

---

### NFR3: 可用性

| 需求 | 規格 |
|------|------|
| OTP 有效期 | 5 分鐘 |
| OTP 重發冷卻 | 60 秒 |
| 錯誤訊息 | 明確、友善、繁體中文 |
| 表單驗證 | 即時前端驗證 + 後端二次驗證 |

---

### NFR4: 可維護性

| 需求 | 實現 |
|------|------|
| 程式碼風格 | TypeScript + ESLint + Prettier |
| 註解 | 關鍵邏輯使用繁體中文註解 |
| 錯誤處理 | 統一的錯誤格式和日誌 |
| 版本控制 | Git + 語意化版本號 |

---

## ✅ 驗收檢查清單

### OAuth 流程
- [ ] Google OAuth 首次註冊（完整綁定流程）
- [ ] Google OAuth 已註冊登入（直接登入）
- [ ] Facebook OAuth 首次註冊
- [ ] Facebook OAuth 已註冊登入
- [ ] LINE OAuth 首次註冊
- [ ] LINE OAuth 已註冊登入

### 手動註冊
- [ ] 手機 + Email 註冊流程
- [ ] OTP 發送和驗證
- [ ] 密碼設定和強度檢查
- [ ] 註冊完成後可登入

### 登入功能
- [ ] 手機號碼 + 密碼登入
- [ ] Email + 密碼登入
- [ ] 錯誤密碼顯示錯誤訊息
- [ ] Token 正確簽發和驗證

### 密碼重設
- [ ] Email 驗證重設密碼
- [ ] OTP 驗證重設密碼
- [ ] 重設後可用新密碼登入

### 資料持久化
- [ ] 用戶資料正確存入 SQLite
- [ ] OAuth ID 正確綁定
- [ ] 密碼正確 hash 存儲
- [ ] 驗證狀態正確更新

---

## 🔗 相關文檔

- [用戶流程圖](./USER_FLOWS.md)
- [資料庫設計](../architecture/DATABASE_DESIGN.md)
- [API 設計](../architecture/API_DESIGN.md)
- [實作計劃](../implementation/PHASE_PLAN.md)

---

_此文檔會隨需求變更持續更新_
