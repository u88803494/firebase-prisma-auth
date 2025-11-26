# 快速開始指南

**目標**: 在 5 分鐘內讓專案在本地運行

---

## ✅ 前置需求

- **Node.js** 18+
- **pnpm** 8+
- **Git**
- **Firebase 專案**（Spark 免費方案即可）

---

## 🚀 快速設定（3 步驟）

### 1. Clone 並安裝依賴

```bash
# Clone repository
git clone https://github.com/u88803494/firebase-prisma-auth.git
cd firebase-prisma-auth

# 安裝依賴
pnpm install
```

### 2. 設定環境變數

```bash
# 複製範例環境變數檔案
cp .env.example .env.local
```

編輯 `.env.local`，填入以下資訊：

#### 2.1 Firebase Frontend Config
從 [Firebase Console](https://console.firebase.google.com/) 取得：
- Project Settings → General → Your apps → Web → 複製 firebaseConfig

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

#### 2.2 Firebase Admin SDK
從 Firebase Console → Project Settings → Service accounts → Generate new private key

```bash
# 將下載的 JSON 壓縮成單行，用單引號包裹
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"..."}'
```

#### 2.3 Database URL
⚠️ **重要**：必須使用絕對路徑

```bash
# 取得專案絕對路徑
pwd

# 設定 DATABASE_URL（範例）
DATABASE_URL="file:/Users/yourname/projects/firebase-prisma-auth/prisma/dev.db"
```

#### 2.4 JWT Secret

```bash
# 生成隨機 secret
openssl rand -base64 32

# 填入 .env.local
JWT_SECRET=your-generated-secret
```

### 3. 初始化資料庫並啟動

```bash
# 初始化資料庫
npx prisma migrate dev --name init
npx prisma generate

# 啟動開發伺服器
pnpm dev

# 開啟瀏覽器：http://localhost:3000
```

---

## ✅ 驗證安裝

### 設定測試電話號碼（首次必須）

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. Authentication → Sign-in method → Phone
3. 展開「Phone numbers for testing」
4. 新增測試號碼：

| 電話號碼 | 驗證碼 |
|----------|--------|
| +886900000001 | 111111 |
| +886900000002 | 111111 |
| +886900000003 | 111111 |

### 測試登入功能

1. **OAuth 登入**: 點擊 Google/GitHub/Facebook 按鈕
2. **手機註冊**: 前往 `/register/manual`，使用測試電話號碼

看到登入成功畫面即表示設定完成！🎉

---

## 📚 下一步

### 了解專案

1. [專案概述](./00-INDEX.md) - 文檔導航
2. [Firebase 設定指南](./FIREBASE_SETUP_GUIDE.md) - 詳細 Firebase 設定
3. [認證架構決策](./decisions/001-hybrid-auth-architecture.md) - 為何使用混合架構

### 開發工具

```bash
# Prisma Studio - 視覺化資料庫管理
npx prisma studio  # http://localhost:5556

# 用戶管理介面（開發環境）
http://localhost:3000/dev/users
```

---

## 🔧 常見問題

### Firebase Admin SDK 驗證失敗？

檢查 `FIREBASE_SERVICE_ACCOUNT_KEY` 格式：
- 必須是單行 JSON
- 必須用單引號包裹
- 詳見 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

### 資料庫連線錯誤？

確認 `DATABASE_URL` 使用絕對路徑：
```bash
# ✅ 正確
DATABASE_URL="file:/Users/yourname/project/prisma/dev.db"

# ❌ 錯誤
DATABASE_URL="file:./prisma/dev.db"
```

### 測試電話號碼無法使用？

必須在 Firebase Console 手動設定測試號碼，詳見上方「驗證安裝」章節。

更多問題請參考 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 💡 開發指令

```bash
# 開發
pnpm dev              # 啟動開發伺服器

# 建置
pnpm build            # 生產環境建置

# 程式碼品質
pnpm type-check       # TypeScript 檢查
pnpm lint             # ESLint 檢查

# 資料庫
npx prisma studio     # 視覺化管理
npx prisma migrate dev --name "description"  # 建立遷移
npx prisma generate   # 重新生成 Client
```

---

## 🆘 需要幫助？

- 📖 [完整文檔](./00-INDEX.md)
- 🔧 [常見問題](./TROUBLESHOOTING.md)
- 💬 查看 [CLAUDE.md](../CLAUDE.md) 了解專案概述

---

**祝開發愉快！** 🚀
