# 用戶流程圖

> 最後更新：2025-11-18
> 版本：1.0.0

## 📌 概述

本文檔提供完整的用戶操作流程圖，涵蓋註冊、登入、密碼重設等所有使用場景。

---

## 🔄 流程圖索引

| 流程編號 | 流程名稱 | 用途 |
|---------|---------|------|
| Flow 1 | OAuth 首次註冊（未綁定） | 第一次使用 OAuth 登入 |
| Flow 2 | OAuth 已註冊登入（已綁定） | OAuth 用戶再次登入 |
| Flow 3 | 手動註冊 | 手機 + Email 註冊 |
| Flow 4 | 密碼登入 | 手機/Email + 密碼登入 |
| Flow 5 | Email 重設密碼 | 忘記密碼 - Email 驗證 |
| Flow 6 | OTP 重設密碼 | 忘記密碼 - 手機驗證 |

---

## 1️⃣ OAuth 首次註冊流程（未綁定用戶）

### 流程圖

```
[登入頁面]
    │
    ↓ 點擊 OAuth 按鈕
    │ (Google / Facebook / LINE)
    │
[OAuth 授權頁面]
    │ (第三方網站)
    ↓ 用戶同意授權
    │
[返回應用程式]
    │
    ↓ 系統接收 OAuth Token
    │
[檢查用戶是否已註冊]
    │
    ├─→ [已註冊] ──→ 跳轉到 Flow 2（直接登入）
    │
    └─→ [未註冊] ──→ [完成註冊頁面]
            │
            ↓ 顯示 OAuth 取得的資訊
            │ (顯示名稱、大頭照、Email)
            │
        [輸入綁定資料]
            │
            ├─ 手機號碼（必填）
            └─ Email（必填或使用 OAuth Email）
            │
            ↓ 點擊「發送 OTP」
            │
        [發送 OTP]
            │ (Firebase Phone Auth)
            ↓ SMS 發送成功
            │
        [OTP 驗證頁面]
            │
            ├─ 輸入 6 位數 OTP
            ├─ 倒數計時（5 分鐘）
            └─ 重新發送（60 秒冷卻）
            │
            ↓ 點擊「驗證」
            │
        [驗證 OTP]
            │
            ├─→ [驗證失敗] ──→ 顯示錯誤訊息 ──→ 重試（最多 3 次）
            │
            └─→ [驗證成功]
                    │
                    ↓ 建立用戶記錄
                    │ (綁定 OAuth ID、手機、Email)
                    │
                [註冊完成視窗]
                    │
                    ├─ 顯示「Welcome!」訊息
                    └─ 提供進入首頁的按鈕
                    │
                    ↓ 點擊「開始使用」
                    │
                [首頁]
                    │
                    └─ 登入成功，顯示用戶資訊
```

### 關鍵節點

| 節點 | 說明 | 技術細節 |
|------|------|---------|
| OAuth 授權 | 第三方網站授權 | Firebase redirects |
| 檢查註冊狀態 | 查詢 OAuth ID | 查詢 `googleId`/`facebookId`/`lineId` |
| 發送 OTP | Firebase SMS | `firebase.auth().signInWithPhoneNumber()` |
| 驗證 OTP | 驗證碼確認 | `confirmationResult.confirm(code)` |
| 建立用戶 | 寫入資料庫 | Prisma `user.create()` |

### 資料流

**輸入**：
- OAuth Token（來自 Google/Facebook/LINE）
- 手機號碼（用戶輸入）
- Email（用戶輸入或 OAuth 取得）

**輸出**：
- 用戶記錄（含 OAuth ID 綁定）
- Firebase ID Token（用於後續 API 呼叫）

---

## 2️⃣ OAuth 已註冊登入流程（已綁定用戶）

### 流程圖

```
[登入頁面]
    │
    ↓ 點擊 OAuth 按鈕
    │
[OAuth 授權頁面]
    │
    ↓ 用戶同意授權
    │
[返回應用程式]
    │
    ↓ 系統接收 OAuth Token
    │
[檢查用戶是否已註冊]
    │
    └─→ [已註冊]
            │
            ↓ 查詢用戶記錄
            │
        [取得用戶資訊]
            │
            ├─ displayName
            ├─ email
            ├─ photoURL
            └─ phoneNumber
            │
            ↓ 簽發 Firebase ID Token
            │
        [前端存儲 Token]
            │
            └─ localStorage / sessionStorage
            │
            ↓ 導向首頁
            │
        [首頁]
            │
            └─ 顯示用戶資訊
```

### 關鍵節點

| 節點 | 說明 | 技術細節 |
|------|------|---------|
| 檢查註冊 | 查詢 OAuth ID | `user.findUnique({ where: { googleId } })` |
| 取得資訊 | 從資料庫讀取 | Prisma query |
| 簽發 Token | Firebase Token | `user.getIdToken()` |

---

## 3️⃣ 手動註冊流程

### 流程圖

```
[登入頁面]
    │
    ↓ 點擊「建立 Eluelu 帳戶」
    │
[註冊頁面]
    │
    ├─ 輸入手機號碼（必填）
    ├─ 輸入 Email（必填）
    └─ 格式即時驗證
    │
    ↓ 點擊「發送 OTP」
    │
[發送 OTP]
    │
    ↓ Firebase Phone Auth
    │
[OTP 驗證頁面]
    │
    ├─ 輸入 6 位數 OTP
    ├─ 倒數計時（5 分鐘）
    └─ 重新發送（60 秒冷卻）
    │
    ↓ 驗證成功
    │
[建立密碼頁面]
    │
    ├─ 輸入密碼
    ├─ 確認密碼
    ├─ 密碼強度指示器
    └─ 要求：8+ 字元、大小寫、數字
    │
    ↓ 點擊「完成註冊」
    │
[建立用戶記錄]
    │
    ├─ email
    ├─ phoneNumber
    ├─ password (bcrypt hash)
    ├─ phoneVerified = true
    └─ emailVerified = false
    │
    ↓ 註冊成功
    │
[註冊完成視窗]
    │
    └─ 顯示「Welcome!」訊息
    │
    ↓ 點擊「開始使用」
    │
[首頁]
```

### 關鍵節點

| 節點 | 說明 | 技術細節 |
|------|------|---------|
| 格式驗證 | 手機、Email 格式 | `libphonenumber-js`、regex |
| OTP 發送 | Firebase SMS | `signInWithPhoneNumber()` |
| 密碼 Hash | bcrypt 加密 | `bcrypt.hash(password, 10)` |
| 建立用戶 | 寫入資料庫 | Prisma `user.create()` |

### 資料流

**輸入**：
- 手機號碼
- Email
- 密碼（明文，僅前端 → 後端傳輸時）

**輸出**：
- 用戶記錄
- 密碼 Hash（絕不存明文）
- `phoneVerified = true`

---

## 4️⃣ 密碼登入流程

### 流程圖

```
[登入頁面]
    │
    ├─ 輸入手機號碼或 Email
    └─ 輸入密碼
    │
    ↓ 點擊「登入」
    │
[查詢用戶記錄]
    │
    ├─→ [未找到] ──→ 顯示「帳號或密碼錯誤」
    │
    └─→ [找到用戶]
            │
            ↓ 驗證密碼
            │
        [bcrypt compare]
            │
            ├─→ [密碼錯誤] ──→ 顯示「帳號或密碼錯誤」
            │
            └─→ [密碼正確]
                    │
                    ↓ 簽發 Firebase Token
                    │
                [前端存儲 Token]
                    │
                    └─ localStorage / sessionStorage
                    │
                    ↓ 導向首頁
                    │
                [首頁]
```

### 關鍵節點

| 節點 | 說明 | 技術細節 |
|------|------|---------|
| 查詢用戶 | 手機或 Email | `findUnique({ where: { email } })` |
| 驗證密碼 | bcrypt compare | `bcrypt.compare(password, hash)` |
| 簽發 Token | Firebase | `auth.createCustomToken(uid)` |

### 安全考量

- **不洩漏資訊**：無論是帳號不存在還是密碼錯誤，都顯示相同的錯誤訊息
- **限制嘗試次數**：連續失敗 5 次後鎖定 15 分鐘（可選）
- **HTTPS 必須**：密碼傳輸必須加密

---

## 5️⃣ Email 重設密碼流程

### 流程圖

```
[登入頁面]
    │
    ↓ 點擊「忘記密碼」
    │
[忘記密碼選擇頁]
    │
    ├─ Email 驗證 ◀ (選擇此路徑)
    └─ OTP 驗證
    │
    ↓ 選擇 Email 驗證
    │
[輸入 Email 頁面]
    │
    └─ 輸入 Email 地址
    │
    ↓ 點擊「發送重設郵件」
    │
[Firebase 發送重設郵件]
    │
    └─ 使用 `sendPasswordResetEmail()`
    │
    ↓ 郵件發送成功
    │
[提示檢查信箱]
    │
    └─ 「重設郵件已發送到您的信箱」
    │
    ↓ 用戶檢查 Email
    │
[點擊郵件中的連結]
    │
    └─ Firebase 驗證連結有效性
    │
    ↓ 連結有效
    │
[重設密碼頁面]
    │ (Firebase 提供的頁面或自訂)
    │
    ├─ 輸入新密碼
    └─ 確認新密碼
    │
    ↓ 點擊「重設密碼」
    │
[更新密碼]
    │
    └─ Firebase 更新認證資訊
    │
    ↓ 重設成功
    │
[重設成功頁面]
    │
    └─ 顯示「密碼已成功重設」
    │
    ↓ 點擊「返回登入」
    │
[登入頁面]
```

### 關鍵節點

| 節點 | 說明 | 技術細節 |
|------|------|---------|
| 發送郵件 | Firebase Email | `sendPasswordResetEmail(email)` |
| 驗證連結 | Token 驗證 | Firebase 自動處理 |
| 更新密碼 | 密碼重設 | Firebase `confirmPasswordReset()` |

---

## 6️⃣ OTP 重設密碼流程

### 流程圖

```
[登入頁面]
    │
    ↓ 點擊「忘記密碼」
    │
[忘記密碼選擇頁]
    │
    ├─ Email 驗證
    └─ OTP 驗證 ◀ (選擇此路徑)
    │
    ↓ 選擇 OTP 驗證
    │
[輸入手機號碼頁面]
    │
    └─ 輸入手機號碼
    │
    ↓ 點擊「發送 OTP」
    │
[發送 OTP]
    │
    └─ Firebase Phone Auth
    │
    ↓ SMS 發送成功
    │
[OTP 驗證頁面]
    │
    ├─ 輸入 6 位數 OTP
    ├─ 倒數計時（5 分鐘）
    └─ 重新發送（60 秒冷卻）
    │
    ↓ 驗證成功
    │
[重設密碼頁面]
    │
    ├─ 輸入新密碼
    └─ 確認新密碼
    │
    ↓ 點擊「重設密碼」
    │
[更新密碼]
    │
    └─ bcrypt hash 新密碼
    │
    ↓ 更新資料庫
    │
[重設成功頁面]
    │
    └─ 顯示「密碼已成功重設」
    │
    ↓ 點擊「返回登入」
    │
[登入頁面]
```

### 關鍵節點

| 節點 | 說明 | 技術細節 |
|------|------|---------|
| 發送 OTP | Firebase SMS | `signInWithPhoneNumber()` |
| 驗證 OTP | 驗證碼確認 | `confirmationResult.confirm()` |
| 更新密碼 | Hash 新密碼 | `bcrypt.hash()` + Prisma update |

---

## 🔀 流程決策樹

### 用戶進入登入頁面後的決策流程

```
[用戶到達登入頁面]
    │
    ├─→ 想用 OAuth 登入？
    │   │
    │   ├─ Yes → 點擊 OAuth 按鈕
    │   │   │
    │   │   ├─ 首次使用 → Flow 1（OAuth 首次註冊）
    │   │   └─ 已註冊過 → Flow 2（OAuth 直接登入）
    │   │
    │   └─ No → 繼續下一步
    │
    ├─→ 已有帳號？
    │   │
    │   ├─ Yes → 輸入帳密登入 → Flow 4（密碼登入）
    │   │   │
    │   │   └─ 忘記密碼？
    │   │       │
    │   │       ├─ Email 可用 → Flow 5（Email 重設）
    │   │       └─ 手機可用 → Flow 6（OTP 重設）
    │   │
    │   └─ No → 點擊「建立帳戶」→ Flow 3（手動註冊）
    │
    └─ 完成登入 → [首頁]
```

---

## 📊 流程比較表

| 流程 | 觸發方式 | 需要 OTP | 需要密碼 | 預估時間 |
|------|---------|---------|---------|---------|
| Flow 1 | 首次 OAuth | ✅ Yes | ❌ No | 2-3 分鐘 |
| Flow 2 | 已註冊 OAuth | ❌ No | ❌ No | 10-20 秒 |
| Flow 3 | 手動註冊 | ✅ Yes | ✅ Yes | 3-5 分鐘 |
| Flow 4 | 密碼登入 | ❌ No | ✅ Yes | 10-20 秒 |
| Flow 5 | Email 重設 | ❌ No | ✅ Yes（新） | 5-10 分鐘 |
| Flow 6 | OTP 重設 | ✅ Yes | ✅ Yes（新） | 3-5 分鐘 |

---

## 🎯 用戶體驗優化點

### 減少摩擦
- OAuth 已註冊用戶 **不需** 重新綁定（Flow 2）
- 自動填入 OAuth 取得的 Email（Flow 1）
- OTP 自動偵測和填入（部分瀏覽器支援）

### 明確提示
- OTP 倒數計時清楚顯示
- 密碼強度即時反饋
- 錯誤訊息明確但不洩漏資訊

### 防止錯誤
- 前端格式驗證（即時）
- 後端二次驗證（安全）
- 提供「重新發送 OTP」選項

---

## 🔗 相關文檔

- [功能需求](./FUNCTIONAL_REQUIREMENTS.md)
- [資料庫設計](../architecture/DATABASE_DESIGN.md)
- [API 設計](../architecture/API_DESIGN.md)
- [實作計劃](../implementation/PHASE_PLAN.md)

---

_此文檔會隨流程優化持續更新_
