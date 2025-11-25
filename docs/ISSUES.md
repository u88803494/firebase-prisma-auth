# 專案問題追蹤

## 🚨 待解決問題

### Issue #1: Firebase Admin SDK 服務帳戶金鑰建立受限

**狀態**：🔴 待管理員處理

**發現日期**：2025-11-18

**問題描述**：
在 Firebase Console 嘗試產生 Admin SDK 服務帳戶私密金鑰時，出現以下錯誤：

```
這個服務帳戶不得建立金鑰，請確認組織政策是否限制服務帳戶建立金鑰。
```

**原因分析**：
Google Cloud 組織層級啟用了 `iam.disableServiceAccountKeyCreation` 政策，限制服務帳戶建立金鑰。

**影響範圍**：
- 無法使用 Firebase Admin SDK 在後端驗證 Firebase Authentication Token
- 影響後端 API 的 Token 驗證流程

**臨時解決方案**（POC 階段）：
改用 Firebase Auth REST API 進行 Token 驗證：

```typescript
// 使用 REST API 驗證 token（不需要 Admin SDK）
const response = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: firebaseToken })
  }
);

const data = await response.json();
// data.users[0] 包含用戶資訊
```

**長期解決方案**：
需要組織管理員執行以下操作：

1. **前往 Google Cloud Console**
   - 網址：https://console.cloud.google.com/iam-admin/orgpolicies
   - 選擇組織或專案：`your-firebase-project-id` (Project ID)

2. **調整組織政策**
   - 找到政策：`iam.disableServiceAccountKeyCreation`
   - 選項 A：將 `your-firebase-project-id` 專案設為政策例外
   - 選項 B：暫時停用此政策（不推薦）
   - 選項 C：為特定服務帳戶 `firebase-adminsdk-fbsvc@your-firebase-project-id.iam.gserviceaccount.com` 開放權限

3. **產生金鑰**
   - 返回 Firebase Console → 專案設定 → 服務帳戶 → Firebase Admin SDK
   - 點擊「產生新的私密金鑰」
   - 下載 JSON 檔案（格式：`your-firebase-project-id-firebase-adminsdk-xxxxx.json`）

4. **更新專案配置**
   - 將 JSON 內容轉為單行字串
   - 填入 `.env.local` 的 `FIREBASE_ADMIN_SDK_KEY` 變數
   - 重新啟動開發伺服器

**相關資源**：
- [Google Cloud 組織政策文檔](https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints)
- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)

**聯繫人**：
- 待確認：Google Cloud 組織管理員
- 開發者：demo-user@example.com

**更新日誌**：
- 2025-11-18：問題發現，採用 REST API 臨時方案繼續開發
