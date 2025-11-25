# Application Default Credentials (ADC) 設定指南

## 📋 什麼是 ADC？

Application Default Credentials (ADC) 是 Google Cloud 的認證機制，讓應用程式能夠自動使用適當的憑證，無需手動管理服務帳戶金鑰檔案。

**優點**：
- ✅ 不需要下載 Service Account JSON 金鑰
- ✅ 避免金鑰檔案外洩風險
- ✅ 簡化本地開發流程
- ✅ 符合企業安全政策（組織政策限制服務帳戶金鑰建立）

---

## 🛠️ 本地開發設定

### 前置需求

1. **安裝 Google Cloud SDK**

```bash
# macOS（使用 Homebrew）
brew install google-cloud-sdk

# 或下載安裝包
# https://cloud.google.com/sdk/docs/install
```

2. **驗證安裝**

```bash
gcloud --version
```

### 設定步驟

#### 步驟 1：登入 Google Cloud

```bash
gcloud auth application-default login
```

這個指令會：
1. 開啟瀏覽器視窗
2. 要求你登入 Google 帳號（使用有專案權限的帳號）
3. 授權後會在本地儲存憑證

**憑證位置**：`~/.config/gcloud/application_default_credentials.json`

#### 步驟 2：設定專案 ID

```bash
gcloud config set project your-firebase-project-id
```

#### 步驟 3：驗證設定

```bash
# 查看當前設定
gcloud config list

# 查看憑證檔案
cat ~/.config/gcloud/application_default_credentials.json
```

---

## 🔧 專案配置

### 環境變數設定

不需要設定 `FIREBASE_ADMIN_SDK_KEY`，ADC 會自動讀取憑證。

`.env.local` 檔案：
```bash
# ================================================
# Firebase Admin SDK (使用 ADC)
# ================================================
# 已啟用 ADC，不需要手動設定金鑰
# FIREBASE_ADMIN_SDK_KEY 留空即可

FIREBASE_ADMIN_SDK_KEY=
```

### Firebase Admin SDK 初始化

檔案：`/src/lib/firebaseAdmin.ts`

```typescript
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'your-firebase-project-id',
    // 不需要 credential 參數 - ADC 自動處理
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;
```

---

## ✅ 測試 ADC 設定

### 方法 1：啟動開發伺服器

```bash
pnpm dev
```

開發伺服器應該正常啟動，不會出現認證錯誤。

### 方法 2：測試 Custom Token API

```bash
# 註冊一個測試用戶（使用 OAuth 註冊並設定密碼）
# 然後測試登入 API

curl -X POST http://localhost:3000/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+886912345678",
    "password": "testPassword123"
  }'
```

**預期結果**：
```json
{
  "success": true,
  "customToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "uid": "firebase-uid",
    "email": "test@example.com",
    "phoneNumber": "+886912345678"
  }
}
```

---

## 🚨 常見問題

### Q1: 執行 gcloud 指令時提示「command not found」

**原因**：Google Cloud SDK 未安裝或未加入 PATH

**解決方法**：
```bash
# 安裝 Google Cloud SDK
brew install google-cloud-sdk

# 或手動加入 PATH（如果已安裝）
echo 'source "/usr/local/Caskroom/google-cloud-sdk/latest/google-cloud-sdk/path.bash.inc"' >> ~/.bashrc
source ~/.bashrc
```

---

### Q2: API 回傳「Firebase Admin SDK 認證失敗」

**錯誤訊息**：
```json
{
  "success": false,
  "error": "Firebase Admin SDK 認證失敗，請確認 ADC 已設定",
  "details": "執行：gcloud auth application-default login"
}
```

**原因**：ADC 未設定或憑證已過期

**解決方法**：
```bash
# 重新登入
gcloud auth application-default login

# 設定專案
gcloud config set project your-firebase-project-id

# 重啟開發伺服器
pnpm dev
```

---

### Q3: 登入時使用錯誤的 Google 帳號

**問題**：組織政策可能限制特定帳號的權限

**解決方法**：
```bash
# 查看當前帳號
gcloud auth list

# 切換帳號（如果已登入多個帳號）
gcloud config set account YOUR_EMAIL@example.com

# 或登出後重新登入
gcloud auth application-default revoke
gcloud auth application-default login
```

---

### Q4: 憑證過期

**問題**：ADC 憑證預設有效期約 1 小時

**解決方法**：
```bash
# 重新整理憑證
gcloud auth application-default login
```

---

### Q5: 權限不足 (Permission Denied)

**錯誤訊息**：
```
Error: Permission denied on resource project your-firebase-project-id
```

**原因**：使用的 Google 帳號沒有專案權限

**解決方法**：
1. 確認使用正確的 Google 帳號（有 Firebase 專案權限）
2. 在 [Firebase Console](https://console.firebase.google.com/project/your-firebase-project-id/settings/iam) 確認帳號角色
3. 需要的最低權限：**Firebase Admin** 或 **Editor**

---

## 👥 團隊協作

### 新成員加入設定

1. **前往 Firebase Console 設定權限**
   - URL：https://console.firebase.google.com/project/your-firebase-project-id/settings/iam
   - 新增成員並授予 **Firebase Admin** 角色

2. **成員執行本地設定**
   ```bash
   # 安裝 Google Cloud SDK
   brew install google-cloud-sdk

   # 登入並授權
   gcloud auth application-default login

   # 設定專案
   gcloud config set project your-firebase-project-id

   # 啟動開發環境
   pnpm install
   pnpm dev
   ```

---

## 🚀 生產環境部署

### Vercel 部署配置

Vercel 上需要使用環境變數來提供 Service Account 金鑰（因為 Vercel 無法執行 gcloud 指令）。

**步驟**：

1. **建立服務帳戶（需要組織管理員解除限制）**
   - Firebase Console → Project Settings → Service Accounts
   - Generate New Private Key
   - 下載 JSON 金鑰檔案

2. **在 Vercel 設定環境變數**
   - Vercel Dashboard → Project Settings → Environment Variables
   - 新增變數：`FIREBASE_ADMIN_SDK_KEY`
   - 值：完整的 JSON 金鑰內容（一行）

3. **更新 firebaseAdmin.ts（生產環境判斷）**
   ```typescript
   if (!admin.apps.length) {
     // 生產環境：使用 Service Account Key
     if (process.env.FIREBASE_ADMIN_SDK_KEY) {
       const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY);
       admin.initializeApp({
         credential: admin.credential.cert(serviceAccount),
       });
     } else {
       // 本地開發：使用 ADC
       admin.initializeApp({
         projectId: 'your-firebase-project-id',
       });
     }
   }
   ```

---

## 📚 相關文件

- [Google Cloud ADC 官方文件](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Firebase Admin SDK 認證指南](https://firebase.google.com/docs/admin/setup#initialize-sdk)
- [專案認證狀態文件](./AUTHENTICATION_STATUS.md)
- [資料庫管理指南](./DATABASE_GUIDE.md)

---

## 快速參考

```bash
# 設定 ADC
gcloud auth application-default login
gcloud config set project your-firebase-project-id

# 查看設定
gcloud config list
gcloud auth list

# 查看憑證檔案
cat ~/.config/gcloud/application_default_credentials.json

# 重新整理憑證
gcloud auth application-default login

# 登出
gcloud auth application-default revoke

# 切換帳號
gcloud config set account YOUR_EMAIL@example.com
```
