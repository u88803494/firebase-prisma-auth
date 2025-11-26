# Firebase + Prisma 認證系統 - 文檔導航

> 最後更新：2025-11-26
> 專案狀態：✅ 核心功能已實作完成

## 📌 專案概述

Firebase + Prisma 混合認證系統，解決 Firebase Email/Password Auth 無法與 OAuth 共用帳戶的限制。

### 核心功能
- ✅ **OAuth 社群登入**：Google、GitHub、Facebook、LINE
- ✅ **手機註冊**：Phone Auth OTP 驗證 + 設定密碼
- ✅ **多種登入方式**：OAuth、手機+密碼、Email+密碼
- ✅ **密碼重設**：Email 驗證、OTP 驗證
- ✅ **帳號綁定**：OAuth 用戶可設定密碼登入

### 技術棧
```
前端：Next.js 15 + React 19 + TypeScript + Tailwind CSS
後端：Next.js API Routes + Firebase Admin SDK
認證：Firebase Auth (OAuth/Phone) + Prisma (密碼)
資料庫：SQLite + Prisma ORM（可升級 PostgreSQL）
狀態管理：Zustand
```

---

## 🚀 快速開始

**新手入門請從這裡開始：**

| 文件 | 說明 |
|------|------|
| 📋 **[快速開始](./QUICKSTART.md)** | 5 分鐘內讓專案運行 |
| 🔧 **[環境變數範例](../.env.example)** | 需要設定的環境變數 |
| 🔥 **[Firebase 設定](./FIREBASE_SETUP_GUIDE.md)** | Firebase 專案設定指南 |
| ❓ **[常見問題](./TROUBLESHOOTING.md)** | 問題排解與解決方案 |

---

## 📚 文檔結構

### 📋 [需求文檔](./requirements/)
定義系統要實現的功能和用戶流程

- **[功能需求](./requirements/FUNCTIONAL_REQUIREMENTS.md)** - 詳細的功能規格
- **[用戶流程](./requirements/USER_FLOWS.md)** - 完整的用戶操作流程圖
- **[使用案例](./requirements/USE_CASES.md)** - 典型使用場景（待建立）

### 🏗️ [架構文檔](./architecture/)
系統設計和技術架構

- **[架構概覽](./architecture/OVERVIEW.md)** - 系統整體架構（待建立）
- **[API 設計](./architecture/API_DESIGN.md)** - API 端點規格（待建立）
- **[資料庫設計](./architecture/DATABASE_DESIGN.md)** - Prisma Schema 和資料模型
- **[安全設計](./architecture/SECURITY.md)** - 安全機制和最佳實踐（待建立）

### 🏛️ [架構決策記錄 (ADR)](./decisions/)
記錄重要的技術決策和理由

- **[ADR-001: 混合認證架構](./decisions/001-hybrid-auth-architecture.md)** - 為何密碼儲存在 Prisma 而非 Firebase

### 💻 [實作文檔](./implementation/)
開發指南和實作計劃

- **[分階段實作計劃](./implementation/PHASE_PLAN.md)** - 7 個階段的詳細開發計劃
- **[環境設定指南](./implementation/SETUP_GUIDE.md)** - 從零開始的設定步驟（待建立）
- **[編碼規範](./implementation/CODING_STANDARDS.md)** - 代碼風格和最佳實踐（待建立）
- **[測試策略](./implementation/TESTING_STRATEGY.md)** - 測試方法和檢查清單（待建立）

### 🔥 Firebase 文檔
Firebase 設定和整合指南

- **[Firebase 設定指南](./FIREBASE_SETUP_GUIDE.md)** - 方案選擇、計費說明、GCP 關係
- **[LINE 登入整合](./LINE_LOGIN_INTEGRATION.md)** - LINE OIDC 設定（需 Blaze 方案）
- **[ADC 設定指南](./ADC_SETUP.md)** - Application Default Credentials

### 📖 API 文檔
API 端點參考

- **[API 參考文件](./API_REFERENCE.md)** - 所有認證 API 端點的完整文檔

### 🔧 維運文檔
部署和維護相關

- **[常見問題排解](./TROUBLESHOOTING.md)** - 開發過程中的問題與解決方案
- **[部署指南](./operations/DEPLOYMENT.md)** - 部署到 Vercel 等平台（待建立）

---

## 📊 專案狀態

### ✅ 已完成
- [x] 核心認證功能（OAuth、Phone Auth、密碼登入）
- [x] Firebase 專案設定（Google、GitHub、Facebook、Phone）
- [x] 混合認證架構實作
- [x] 快速開始文檔
- [x] API 參考文件
- [x] 常見問題排解文檔
- [x] 架構決策記錄 (ADR)

### 🔄 可擴展
- [ ] LINE 登入整合（需 Blaze 方案）
- [ ] Apple 登入
- [ ] Multi-Factor Authentication (MFA)
- [ ] 部署指南

---

## 📚 相關文件

### 專案說明
- **[CLAUDE.md](../CLAUDE.md)** - 專案概述與開發指南
- **[README.md](../README.md)** - 專案說明

### 原始 POC 文檔
原始文檔已保存在 [`archive/original-poc/`](../archive/original-poc/) 目錄作為參考。

---

**最後更新**：2025-11-26
