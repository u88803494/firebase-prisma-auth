# OAuth 認證系統 - 文檔導航

> 最後更新：2025-11-18
> 專案狀態：📋 文檔整理完成，準備開始實作

## 📌 專案概述

一個完整的 OAuth 認證系統，支援多種登入方式和完整的用戶管理功能。

### 核心功能
- ✅ **OAuth 社群登入**：Google、Facebook、LINE
- ✅ **手動註冊**：手機號碼 + Email + OTP 驗證
- ✅ **多種登入方式**：OAuth、手機號碼、Email
- ✅ **密碼重設**：Email 驗證、OTP 驗證
- ✅ **資料持久化**：SQLite（開發）/ PostgreSQL（生產）

### 技術棧
```
前端：Next.js 15 + React 19 + TypeScript + Tailwind CSS
後端：Next.js API Routes + Firebase Admin SDK
認證：Firebase Authentication
資料庫：SQLite + Prisma ORM（可升級 PostgreSQL）
狀態管理：Zustand
```

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

### 🏛️ [架構決策記錄 (ADR)](./adr/)
記錄重要的技術決策和理由

- **[ADR 範本](./adr/0000-template.md)** - ADR 文檔範本（待建立）
- **[ADR-0001: 使用 Firebase Auth](./adr/0001-use-firebase-auth.md)** - 為何選擇 Firebase（待建立）
- **[ADR-0002: OAuth 提供商選擇](./adr/0002-oauth-providers.md)** - Google/Facebook/LINE（待建立）
- **[ADR-0003: 資料庫選擇](./adr/0003-database-sqlite-vs-pg.md)** - SQLite vs PostgreSQL（待建立）
- **[ADR-0004: OTP 方案](./adr/0004-otp-solution.md)** - Firebase Phone Auth（待建立）
- **[ADR-0005: 密碼重設策略](./adr/0005-password-reset-strategy.md)** - 重設流程設計（待建立）

### 💻 [實作文檔](./implementation/)
開發指南和實作計劃

- **[分階段實作計劃](./implementation/PHASE_PLAN.md)** - 7 個階段的詳細開發計劃
- **[環境設定指南](./implementation/SETUP_GUIDE.md)** - 從零開始的設定步驟（待建立）
- **[編碼規範](./implementation/CODING_STANDARDS.md)** - 代碼風格和最佳實踐（待建立）
- **[測試策略](./implementation/TESTING_STRATEGY.md)** - 測試方法和檢查清單（待建立）

### 🔧 [維運文檔](./operations/)
部署和維護相關

- **[部署指南](./operations/DEPLOYMENT.md)** - 部署到 Vercel 等平台（待建立）
- **[監控設定](./operations/MONITORING.md)** - 日誌和監控配置（待建立）
- **[問題排解](./operations/TROUBLESHOOTING.md)** - 常見問題和解決方案（待建立）

---

## 🚀 快速開始

### 新手入門（推薦順序）

1. **理解需求** 📋
   閱讀 [功能需求](./requirements/FUNCTIONAL_REQUIREMENTS.md) 了解系統要做什麼

2. **掌握流程** 🔄
   查看 [用戶流程](./requirements/USER_FLOWS.md) 理解完整的用戶操作路徑

3. **理解架構** 🏗️
   閱讀 [資料庫設計](./architecture/DATABASE_DESIGN.md) 了解資料結構

4. **開始實作** 💻
   按照 [實作計劃](./implementation/PHASE_PLAN.md) 的 7 個階段逐步開發

5. **環境設定** 🔧
   參考 [設定指南](./implementation/SETUP_GUIDE.md) 配置開發環境（待建立）

---

## 📊 專案狀態

### ✅ 已完成
- [x] 文檔結構規劃
- [x] 原始 POC 文檔整理（保存在 `archive/original-poc/`）
- [x] 核心需求文檔
- [x] 用戶流程圖
- [x] 資料庫設計
- [x] 實作計劃

### 🔄 進行中
- [ ] ADR 文檔建立
- [ ] API 設計規格
- [ ] 環境設定指南

### ⏳ 待開始
- [ ] 專案初始化
- [ ] Firebase 配置
- [ ] 核心功能開發
- [ ] 測試與部署

---

## 🎯 下一步行動

按照 [實作計劃](./implementation/PHASE_PLAN.md) 開始開發：

1. **Phase 1: 專案初始化**（30 分鐘）
   - 初始化 Next.js
   - 安裝依賴
   - 建立專案結構

2. **Phase 2: Firebase 配置**（30 分鐘）
   - 啟用 Authentication
   - 取得配置資訊
   - 設定環境變數

3. **Phase 3: 資料庫設定**（30 分鐘）
   - 編寫 Prisma Schema
   - 執行遷移
   - 測試連線

4. **Phase 4-7: 核心功能開發**（5.5 小時）
   - OAuth 註冊流程
   - 手動註冊
   - 密碼重設
   - 測試整合

**總計開發時間：約 7.5 小時**

---

## 📖 原始 POC 文檔

原始的 firebase-auth-poc 文檔已保存在 [`archive/original-poc/`](../archive/original-poc/) 目錄，作為參考資料：

- [原始 README](../archive/original-poc/README.md)
- [討論紀錄](../archive/original-poc/DISCUSSION_NOTES.md)
- [原始需求](../archive/original-poc/REQUIREMENTS.md)
- [原始 API 規格](../archive/original-poc/API_SPEC.md)
- [原始資料庫設計](../archive/original-poc/DATABASE_SCHEMA.md)
- [原始架構文檔](../archive/original-poc/ARCHITECTURE.md)
- [原始實作指南](../archive/original-poc/IMPLEMENTATION_GUIDE.md)

---

## 🤝 專案用途

### 適用場景
- ✅ 公司專案的 OAuth 認證系統 POC
- ✅ 個人 Side Project 的認證系統
- ✅ 學習 Firebase Authentication 整合
- ✅ Portfolio 展示項目

### 可擴展方向
- 加入更多 OAuth 提供商（Apple、GitHub、Twitter）
- 實作 Multi-Factor Authentication (MFA)
- 加入 Session 管理和 Token 刷新機制
- 升級到 PostgreSQL 生產環境
- 實作 Role-Based Access Control (RBAC)

---

## 📝 文檔維護

### 更新規則
- 每次重大變更需更新相關文檔
- ADR 記錄所有架構決策
- 保持文檔與代碼同步

### 貢獻指南
1. 遵循現有文檔結構
2. 使用 Markdown 格式
3. 重要決策需建立 ADR
4. 更新 `00-INDEX.md` 索引

---

_此文檔會隨專案進展持續更新_
