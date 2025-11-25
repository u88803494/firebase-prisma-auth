# Sprint 規劃總覽

本文件記錄 Firebase Auth POC 重構專案的完整 Sprint 規劃，目標是將當前架構對齊 web-hubble 的目標架構。

## 專案背景

**專案性質**：研究型 POC（Proof of Concept）

**核心目標**：
- 研究並實作完整的 Firebase Authentication 功能
- 探索各種認證方法（OAuth、Phone Auth、密碼登入）
- 驗證混合架構（Firebase + Prisma）的可行性
- 為 web-hubble 專案提供認證系統實作參考

## 架構遷移目標

### 當前架構（POC）
- **手機+密碼登入**：Prisma 驗證密碼 → Firebase Admin SDK 生成 Custom Token → 前端使用 Custom Token 登入 Firebase
- **OAuth 登入**：Firebase OAuth → Custom Token → Firebase Session
- **OAuth 註冊**：需要綁定手機（OTP）+ 設定密碼
- **密碼儲存**：bcrypt（10 rounds）在 Prisma 資料庫

### 目標架構（web-hubble）
- **手機+密碼登入**：純後端驗證 → 直接發放 Backend JWT（不經過 Firebase）
- **OAuth 登入**：Firebase OAuth → Firebase ID Token → 後端驗證 → 發放 Backend JWT（雙層 JWT）
- **OAuth 註冊**：只需綁定手機（OTP），不需要設定密碼
- **個人資料完善**：登入後強制完成個人資料填寫
- **密碼儲存**：保持 bcrypt（用戶明確要求不升級到 Argon2）

## Sprint 時間軸

| Sprint | 週次 | 優先級 | 目標 | 預估點數 |
|--------|------|--------|------|----------|
| Sprint 1 | Week 1-2 | P0 | 核心架構 - Backend JWT 基礎 | 13 |
| Sprint 2 | Week 3-4 | P0 | OAuth 雙層 JWT + 註冊流程調整 | 13 |
| Sprint 3 | Week 5-6 | P1 | 個人資料完善機制 | 8 |
| Sprint 4 | Week 7-8 | P2 | 多平台綁定/解綁 | 8 |
| Sprint 5 | Week 9-10 | P2 | 密碼重設（Email + 客服表單） | 8 |
| Sprint 6+ | Week 11+ | 研究 | LINE/FB OAuth 整合研究 | TBD |

**總計**：約 10-12 週完成核心功能，LINE/FB OAuth 作為後續研究項目

## 優先級說明

### P0（必須完成）
- **Sprint 1-2**：核心架構遷移
- 這是整個專案的基礎，必須優先完成
- 涉及登入流程的根本性改變

### P1（重要功能）
- **Sprint 3**：個人資料完善
- web-hubble 的重要流程，用戶體驗關鍵

### P2（額外功能）
- **Sprint 4-5**：平台綁定、密碼重設
- 提升系統完整性，但不影響核心流程

### 研究項目
- **Sprint 6+**：LINE/FB OAuth
- 需要更多技術研究和測試
- 可能涉及 OIDC Provider 設定等複雜問題

## Sprint 文件說明

每個 Sprint 的詳細文件包含：

1. **Sprint 目標**：明確的完成目標
2. **使用者故事**：從用戶角度描述功能需求
3. **驗收標準**：具體可驗證的完成條件
4. **技術任務**：詳細的實作步驟
5. **檔案清單**：需要建立/修改的檔案
6. **技術決策**：重要的架構決定和理由
7. **測試策略**：測試方法和覆蓋範圍
8. **風險管理**：潛在風險和應對方案

## 文件索引

- [Sprint 1: 核心架構 - Backend JWT](./sprint-01-core-jwt.md) - P0
- [Sprint 2: OAuth 雙層 JWT](./sprint-02-oauth-refactor.md) - P0
- [Sprint 3: 個人資料完善](./sprint-03-profile.md) - P1
- [Sprint 4: 多平台綁定/解綁](./sprint-04-binding.md) - P2
- [Sprint 5: 密碼重設](./sprint-05-password-reset.md) - P2
- [Sprint 6+: LINE/FB OAuth 研究](./sprint-06-research.md) - 研究
- [遷移策略](./migration-strategy.md) - 技術指南
- [測試策略](./testing-strategy.md) - 測試指南

## 成功指標

### 技術指標
- ✅ 所有登入流程使用 Backend JWT
- ✅ OAuth 和密碼登入統一認證機制
- ✅ Firebase 僅用於 OAuth 和 Phone Auth
- ✅ 完整的測試覆蓋率（>80%）

### 功能指標
- ✅ 三種登入方式正常運作（OAuth、手機+密碼、Email+密碼）
- ✅ 兩種註冊方式正常運作（OAuth 註冊、手機註冊）
- ✅ 個人資料完善流程順暢
- ✅ 密碼重設功能正常

### 研究指標
- ✅ LINE Login OIDC Provider 設定可行性
- ✅ Facebook OAuth 整合方案
- ✅ 完整的技術文件和研究報告

## 技術債務管理

### Sprint 1-2 完成後評估
- Custom Token 相關代碼是否完全移除
- Firebase Auth Session 相關邏輯是否清理
- 前端認證狀態管理是否統一

### Sprint 3 完成後評估
- 個人資料欄位是否完整
- 強制完善流程是否影響用戶體驗
- 資料驗證邏輯是否完善

### Sprint 4-5 完成後評估
- 平台綁定邏輯是否穩定
- 密碼重設流程是否安全
- 錯誤處理是否完整

## 參考文件

- [web-hubble 認證架構](../../web-hubble/docs/auth/guides/current-flow.md)
- [ADR-003: 混合認證架構](../../web-hubble/docs/auth/decisions/adr-003-hybrid-auth-architecture.md)
- [ADR-004: 後端密碼儲存](../../web-hubble/docs/auth/decisions/adr-004-password-storage-backend.md)
- [POC 認證現狀](../AUTHENTICATION_STATUS.md)

## 更新記錄

- 2025-11-21：初始版本，定義 6 個 Sprint 的完整規劃
