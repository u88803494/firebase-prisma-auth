# Sprint 6+: LINE/FB OAuth 研究與整合

**時間**：Week 11+
**優先級**：研究項目
**預估點數**：TBD（依研究結果調整）
**狀態**：待開始
**前置條件**：Sprint 1-5 完成

---

## Sprint 目標

研究並實作 LINE Login 和 Facebook OAuth 整合，探索 OIDC Provider 設定、Token 驗證、以及與現有架構的整合方式。

### 為何作為研究項目

LINE 和 Facebook OAuth 與 Google OAuth 有明顯差異，需要更多技術研究和測試：

1. **LINE Login 特殊性**：
   - 需要設定 OIDC Provider（OpenID Connect）
   - Channel ID 和 Channel Secret 的取得和設定
   - LINE Login v2.1 API 的特殊要求
   - Web 和 Native App 的整合差異

2. **Facebook OAuth 特殊性**：
   - App ID 和 App Secret 的審核流程
   - 不同權限（permissions）的申請
   - Facebook Login API 版本差異
   - 隱私政策和資料使用政策要求

3. **未知技術挑戰**：
   - OIDC Provider 與 Firebase 的整合
   - Token 格式和驗證流程差異
   - 錯誤處理和 fallback 機制
   - 測試環境的建立

---

## 研究階段（Research Phase）

### 階段 1：LINE Login 研究（Week 11-12）

**研究目標**：
- [ ] 了解 LINE Login OIDC Provider 設定流程
- [ ] 研究 Firebase 與 LINE Login 的整合方式
- [ ] 評估技術可行性和潛在問題
- [ ] 建立測試環境

**研究任務**：
1. 閱讀 LINE Login 官方文件
   - [LINE Login v2.1 文件](https://developers.line.biz/en/docs/line-login/)
   - OIDC Provider 設定指南
   - Token 驗證流程
2. 研究 Firebase 支援的 OIDC Provider 設定
   - Firebase Console 設定步驟
   - Provider 配置參數
   - Callback URL 設定
3. 建立 LINE Login 測試帳號
   - 註冊 LINE Developers 帳號
   - 建立 LINE Login Channel
   - 取得 Channel ID 和 Secret
4. 實作 POC
   - 建立最小可行範例
   - 測試 Token 交換流程
   - 驗證用戶資訊提取

**預期產出**：
- LINE Login 技術研究報告
- 可行性評估文件
- 測試範例代碼
- 設定步驟文件

**風險評估**：
- **高風險**：OIDC Provider 設定複雜，可能無法與 Firebase 順利整合
- **中風險**：LINE Login API 限制，可能無法取得必要的用戶資訊
- **低風險**：測試環境建立困難

**決策點**：
- ✅ 如可行性高：進入實作階段（Sprint 6A）
- ⚠️ 如可行性中：評估替代方案或簡化實作
- ❌ 如可行性低：暫緩實作，記錄技術債務

---

### 階段 2：Facebook OAuth 研究（Week 13-14）

**研究目標**：
- [ ] 了解 Facebook Login 的申請和審核流程
- [ ] 研究 Firebase 與 Facebook Login 的整合
- [ ] 評估隱私政策和資料使用要求
- [ ] 建立測試環境

**研究任務**：
1. 閱讀 Facebook Login 官方文件
   - [Facebook Login 文件](https://developers.facebook.com/docs/facebook-login/)
   - Graph API 使用指南
   - 權限申請流程
2. 研究 Firebase 的 Facebook OAuth 設定
   - Firebase Console 設定步驟
   - App ID 和 App Secret 配置
   - 權限範圍（scope）設定
3. 建立 Facebook App 測試帳號
   - 註冊 Facebook Developers 帳號
   - 建立 Facebook App
   - 設定 OAuth Redirect URIs
4. 實作 POC
   - 建立最小可行範例
   - 測試登入流程
   - 驗證用戶資訊提取

**預期產出**：
- Facebook OAuth 技術研究報告
- 隱私政策要求評估
- 測試範例代碼
- 審核準備清單

**風險評估**：
- **高風險**：Facebook App 審核流程複雜，可能需要完整的隱私政策
- **中風險**：權限申請被拒絕，無法取得必要的用戶資訊
- **低風險**：測試環境限制

**決策點**：
- ✅ 如可行性高：進入實作階段（Sprint 6B）
- ⚠️ 如可行性中：評估簡化實作或替代方案
- ❌ 如可行性低：記錄為長期技術債務

---

## 實作階段（Implementation Phase）

### Sprint 6A：LINE Login 整合（如可行）

**前置條件**：研究階段完成，可行性評估為「可行」或「中」

**使用者故事**：

**Story 1：LINE Login 整合（8 點）**

**作為** 用戶
**我想要** 使用 LINE 帳號登入
**以便** 快速使用系統

**驗收標準**：
- [ ] 登入頁面顯示 LINE 登入按鈕
- [ ] 點擊後導向 LINE 授權頁面
- [ ] 授權成功後回到系統並完成登入
- [ ] 取得 LINE User ID 並儲存到資料庫
- [ ] 使用雙層 JWT 架構（與 Google OAuth 一致）

**技術任務**：
1. 設定 Firebase OIDC Provider
   - 在 Firebase Console 新增 LINE Login Provider
   - 配置 Channel ID 和 Channel Secret
   - 設定 Callback URL
2. 更新前端 OAuth 按鈕
   - 新增 LINE 登入按鈕和圖示
   - 整合 LINE Provider 到現有流程
3. 更新後端 OAuth 驗證
   - 支援 LINE providerId
   - 儲存 `lineId` 到資料庫
4. 測試完整流程

---

### Sprint 6B：Facebook Login 整合（如可行）

**前置條件**：研究階段完成，可行性評估為「可行」或「中」

**使用者故事**：

**Story 1：Facebook Login 整合（8 點）**

**作為** 用戶
**我想要** 使用 Facebook 帳號登入
**以便** 快速使用系統

**驗收標準**：
- [ ] 登入頁面顯示 Facebook 登入按鈕
- [ ] 點擊後導向 Facebook 授權頁面
- [ ] 授權成功後回到系統並完成登入
- [ ] 取得 Facebook User ID 並儲存到資料庫
- [ ] 使用雙層 JWT 架構（與 Google OAuth 一致）

**技術任務**：
1. 設定 Firebase Facebook Provider
   - 在 Firebase Console 新增 Facebook Provider
   - 配置 App ID 和 App Secret
   - 設定權限範圍
2. 更新前端 OAuth 按鈕
   - 新增 Facebook 登入按鈕和圖示
   - 整合 Facebook Provider 到現有流程
3. 更新後端 OAuth 驗證
   - 支援 Facebook providerId
   - 儲存 `facebookId` 到資料庫
4. 準備 App 審核
   - 準備隱私政策頁面
   - 準備資料使用說明
   - 提交審核申請
5. 測試完整流程

---

## 技術規格

### LINE Login OIDC Provider 設定

```typescript
// Firebase Console 設定範例
{
  provider_id: "oidc.line",
  client_id: "YOUR_LINE_CHANNEL_ID",
  issuer: "https://access.line.me",
  client_secret: "YOUR_LINE_CHANNEL_SECRET"
}

// 前端整合
import { OAuthProvider } from 'firebase/auth';

const lineProvider = new OAuthProvider('oidc.line');
lineProvider.addScope('profile');
lineProvider.addScope('openid');

await signInWithPopup(auth, lineProvider);
```

### Facebook OAuth 設定

```typescript
// Firebase Console 設定範例
{
  app_id: "YOUR_FACEBOOK_APP_ID",
  app_secret: "YOUR_FACEBOOK_APP_SECRET"
}

// 前端整合
import { FacebookAuthProvider } from 'firebase/auth';

const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');

await signInWithPopup(auth, facebookProvider);
```

---

## 研究報告範本

每個平台的研究完成後，應產出以下格式的報告：

### [平台名稱] OAuth 研究報告

**研究日期**：YYYY-MM-DD

**1. 技術可行性**
- ✅ 可行 / ⚠️ 部分可行 / ❌ 不可行
- 理由說明
- 主要技術障礙

**2. 設定複雜度**
- 評分：低/中/高
- 所需步驟數量
- 預估設定時間

**3. 與 Firebase 整合**
- 整合方式說明
- Firebase 支援程度
- 已知限制

**4. 用戶資訊可取得性**
- 可取得的用戶資訊欄位
- 權限申請要求
- 隱私政策要求

**5. 測試結果**
- POC 實作結果
- 發現的問題
- 解決方案

**6. 建議**
- 是否建議實作
- 實作優先級
- 替代方案（如適用）

**7. 參考資源**
- 官方文件連結
- 有用的教學或範例
- 相關問題討論

---

## 檔案清單

### 研究階段產出

1. **`/docs/research/line-login-research.md`**
   - LINE Login 研究報告

2. **`/docs/research/facebook-oauth-research.md`**
   - Facebook OAuth 研究報告

3. **`/docs/research/poc-examples/`**
   - 測試範例代碼

### 實作階段（如進入）

4. **更新 `/src/components/auth/OAuthButtons.tsx`**
   - 新增 LINE/Facebook 按鈕

5. **更新 `/src/app/api/auth/oauth/verify-token/route.ts`**
   - 支援 LINE/Facebook providerId

6. **更新 Prisma Schema**
   - 確保 `lineId` 和 `facebookId` 欄位存在

---

## 技術決策

### TD-016: 研究優先於實作

**決策**：LINE 和 Facebook OAuth 作為研究項目，不強制實作

**理由**：
- 技術複雜度高，可能遇到未知問題
- Google OAuth 已足夠驗證架構可行性
- 避免專案時程風險

**影響**：
- 可能無法提供 LINE/Facebook 登入
- 需向用戶說明支援的登入方式
- 作為長期規劃項目

### TD-017: 逐一平台研究

**決策**：先研究 LINE，再研究 Facebook，不並行

**理由**：
- 集中資源，提高研究深度
- 避免同時面對多個未知問題
- 可根據第一個平台的經驗調整第二個平台的研究方法

**影響**：
- 研究時程較長
- 但風險較低，品質較高

---

## 成功指標

### 研究階段成功指標
- [ ] 完成技術可行性評估
- [ ] 建立可運作的 POC
- [ ] 記錄完整的研究報告
- [ ] 產出清楚的決策建議

### 實作階段成功指標（如進入）
- [ ] LINE/Facebook 登入功能正常運作
- [ ] 整合到現有架構無縫接軌
- [ ] 通過完整測試流程
- [ ] 文件完整記錄實作細節

---

## 風險管理

### 風險 1：研究時間超出預期
**影響**：中
**機率**：高
**描述**：OAuth 平台複雜度可能超出預期

**應對方案**：
- 設定研究時間上限（2 週/平台）
- 定期評估進度
- 如超時，記錄為技術債務並暫停

### 風險 2：平台政策變更
**影響**：中
**機率**：中
**描述**：LINE/Facebook 可能更新政策或 API

**應對方案**：
- 定期檢查官方公告
- 建立 fallback 機制
- 文件記錄 API 版本

### 風險 3：審核被拒絕
**影響**：高
**機率**：中
**描述**：Facebook App 審核可能被拒絕

**應對方案**：
- 提前準備完整的隱私政策
- 準備詳細的資料使用說明
- 預留審核時間和修正時間

---

## 參考資源

### LINE Login
- [LINE Login 文件](https://developers.line.biz/en/docs/line-login/)
- [Firebase OIDC Provider 設定](https://firebase.google.com/docs/auth/web/openid-connect)

### Facebook Login
- [Facebook Login 文件](https://developers.facebook.com/docs/facebook-login/)
- [Firebase Facebook Auth](https://firebase.google.com/docs/auth/web/facebook-login)

### 內部文件
- [Sprint 2: OAuth 雙層 JWT](./sprint-02-oauth-refactor.md)
- [Sprint 4: 多平台綁定](./sprint-04-binding.md)

---

## 更新記錄

- 2025-11-21：Sprint 6+ 初始規劃完成，定義為研究項目
