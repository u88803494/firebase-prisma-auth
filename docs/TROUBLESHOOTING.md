# 常見問題排解

本文件整理開發過程中可能遇到的問題及解決方案。

---

## 目錄

1. [Firebase Admin SDK](#1-firebase-admin-sdk)
2. [Prisma 資料庫](#2-prisma-資料庫)
3. [Phone Auth 手機驗證](#3-phone-auth-手機驗證)
4. [OAuth 登入](#4-oauth-登入)
5. [Custom Token](#5-custom-token)
6. [環境變數](#6-環境變數)
7. [開發流程](#7-開發流程)

---

## 1. Firebase Admin SDK

### 問題：Firebase Admin SDK 驗證失敗

**錯誤訊息**：
```
Error: Failed to determine project ID. Initialize the SDK with service account credentials.
```

**原因**：
- `FIREBASE_SERVICE_ACCOUNT_KEY` 格式錯誤
- 或 Application Default Credentials (ADC) 未設定

**解決方案**：

#### 方案 A：使用 Service Account Key（推薦）

1. 取得 Service Account Key：
   - Firebase Console → Project Settings → Service accounts
   - Generate new private key → 下載 JSON

2. 壓縮 JSON 為單行：
   ```bash
   # 使用 jq 壓縮（如果有安裝）
   cat your-key.json | jq -c .
   
   # 或手動移除換行
   ```

3. 設定環境變數：
   ```bash
   # .env.local - 用單引號包裹
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

#### 方案 B：使用 ADC（約 1 小時過期）

```bash
# 登入 GCP
gcloud auth application-default login

# 設定專案
gcloud config set project your-project-id
```

**預防措施**：
- 優先使用 Service Account Key（永不過期）
- ADC 僅適合短期開發測試

---

## 2. Prisma 資料庫

### 問題：Prisma Client 版本不匹配

**錯誤訊息**：
```
Prisma Client could not locate the Query Engine
```

**解決方案**：
```bash
npx prisma generate
```

### 問題：資料庫被鎖定

**錯誤訊息**：
```
Error: database is locked
```

**原因**：
- Prisma Studio 正在運行
- 其他程序正在存取資料庫

**解決方案**：
```bash
# 關閉 Prisma Studio
# 或強制結束佔用程序
lsof prisma/dev.db
kill <PID>
```

### 問題：資料表不存在

**錯誤訊息**：
```
The table `main.users` does not exist
```

**解決方案**：
```bash
npx prisma migrate dev --name init
```

---

## 3. Phone Auth 手機驗證

### 問題：reCAPTCHA 驗證失敗

**錯誤訊息**：
```
Firebase: Error (auth/invalid-app-credential)
```

**原因**：
- reCAPTCHA 未正確初始化
- 網域未在 Firebase 授權清單

**解決方案**：
1. 確認 Firebase Console 已啟用 Phone Auth
2. 檢查授權網域：
   - Firebase Console → Authentication → Settings → Authorized domains
   - 確認包含 `localhost`

### 問題：測試電話號碼無效

**錯誤訊息**：
```
Firebase: Error (auth/invalid-verification-code)
```

**原因**：
- 測試號碼未在 Firebase Console 設定

**解決方案**：
1. Firebase Console → Authentication → Sign-in method → Phone
2. 展開「Phone numbers for testing」
3. 新增：
   - `+886900000001` / `111111`
   - `+886900000002` / `111111`
   - `+886900000003` / `111111`

### 問題：SMS 請求過於頻繁

**錯誤訊息**：
```
Firebase: Error (auth/too-many-requests)
```

**解決方案**：
- 使用測試電話號碼（不發送真實 SMS）
- 等待幾分鐘後重試

---

## 4. OAuth 登入

### 問題：OAuth 重導向網址不匹配

**錯誤訊息**：
```
redirect_uri_mismatch
```

**解決方案**：

#### Google OAuth
Firebase Console 會自動處理，通常不需手動設定。

#### GitHub OAuth
1. GitHub → Settings → Developer settings → OAuth Apps
2. Authorization callback URL：
   ```
   https://your-project.firebaseapp.com/__/auth/handler
   ```

#### Facebook OAuth
1. Facebook Developers → 應用程式設定 → Facebook 登入 → 設定
2. 有效的 OAuth 重新導向 URI：
   ```
   https://your-project.firebaseapp.com/__/auth/handler
   ```

### 問題：OAuth Provider 未啟用

**錯誤訊息**：
```
Firebase: Error (auth/operation-not-allowed)
```

**解決方案**：
1. Firebase Console → Authentication → Sign-in method
2. 啟用對應的 Provider（Google/GitHub/Facebook）

---

## 5. Custom Token

### 問題：Custom Token 生成失敗

**錯誤訊息**：
```
Error creating custom token
```

**原因**：
- Firebase Admin SDK 未正確初始化
- Service Account 權限不足

**解決方案**：
1. 確認 `FIREBASE_SERVICE_ACCOUNT_KEY` 正確設定
2. 確認 Service Account 有 `Firebase Admin` 角色

### 問題：Custom Token 驗證失敗

**錯誤訊息**：
```
Firebase: Error (auth/invalid-custom-token)
```

**原因**：
- Token 已過期（1 小時有效期）
- Project ID 不匹配

**解決方案**：
- 重新生成 Custom Token
- 確認前後端使用相同 Firebase 專案

---

## 6. 環境變數

### 問題：JWT_SECRET 未定義

**錯誤訊息**：
```
JWT_SECRET is not defined in environment variables
```

**解決方案**：
```bash
# 生成 secret
openssl rand -base64 32

# 加入 .env.local
JWT_SECRET=your-generated-secret
```

### 問題：DATABASE_URL 路徑錯誤

**錯誤訊息**：
```
Error: SQLITE_CANTOPEN: unable to open database file
```

**原因**：
- 使用相對路徑而非絕對路徑

**解決方案**：
```bash
# 取得絕對路徑
pwd

# 正確格式
DATABASE_URL="file:/Users/yourname/project/prisma/dev.db"

# 錯誤格式
DATABASE_URL="file:./prisma/dev.db"
```

---

## 7. 開發流程

### 問題：TypeScript 類型錯誤

**解決方案**：
```bash
# 檢查類型錯誤
pnpm type-check

# 重新生成 Prisma 類型
npx prisma generate
```

### 問題：Migration 衝突

**解決方案**：
```bash
# 重置開發資料庫（會清除資料）
npx prisma migrate reset

# 重新執行 migration
npx prisma migrate dev
```

### 問題：Port 3000 被佔用

**解決方案**：
```bash
# 找出佔用 port 的程序
lsof -i:3000

# 結束程序
kill -9 <PID>

# 或使用不同 port
PORT=3001 pnpm dev
```

---

## 🛠️ 除錯技巧

### 啟用詳細日誌

```bash
# Next.js 詳細日誌
DEBUG=* pnpm dev

# Prisma 查詢日誌
# 在 prisma/schema.prisma 中設定
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["tracing"]
}
```

### 檢查 Firebase Auth 狀態

```typescript
// 在瀏覽器 Console 執行
import { auth } from '@/lib/firebase';
console.log('Current User:', auth.currentUser);
console.log('Provider Data:', auth.currentUser?.providerData);
```

### 使用 Prisma Studio

```bash
npx prisma studio
# 開啟 http://localhost:5556 檢視資料庫
```

---

## 📚 相關文件

- [快速開始](./QUICKSTART.md)
- [Firebase 設定指南](./FIREBASE_SETUP_GUIDE.md)
- [認證架構決策](./decisions/001-hybrid-auth-architecture.md)
- [API 參考](./API_REFERENCE.md)

---

**最後更新**：2025-11-26
