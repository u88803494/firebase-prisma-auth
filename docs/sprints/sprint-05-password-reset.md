# Sprint 5: 密碼重設（Email + 客服表單）

**時間**：Week 9-10
**優先級**：P2（額外功能）
**預估點數**：8
**狀態**：待開始
**前置條件**：Sprint 1-4 完成

---

## Sprint 目標

根據 ADR-004 的決策，實作密碼重設功能，包含 Email OTP 和 Phone OTP 兩種方式，並提供客服表單作為後備方案。

### 密碼重設方式

根據 [ADR-004](../../web-hubble/docs/auth/decisions/adr-004-password-storage-backend.md)，實作以下方式：

1. **方式 (i)：Email + OTP**
   - 用戶輸入 Email
   - 後端發送 OTP 到 Email
   - 用戶驗證 OTP
   - 設定新密碼

2. **方式 (ii)：手機 + OTP**
   - 用戶輸入手機號碼
   - 使用 Firebase Phone Auth 發送 OTP
   - 用戶驗證 OTP
   - 設定新密碼

3. **後備方案：客服表單**
   - 用戶填寫客服表單（提供帳號資訊）
   - 客服人員手動協助重設密碼

**不實作方式 (iii) 和 (iv)**：
- ❌ 不實作「重新綁定 OAuth」（複雜度高，用戶體驗差）
- ❌ 不實作「手機+安全問題」（安全性低）

---

## 使用者故事

### Story 1：Email OTP 密碼重設（3 點）

**作為** 忘記密碼的用戶
**我想要** 透過 Email 接收 OTP 來重設密碼
**以便** 恢復帳號存取

**驗收標準**：
- [ ] 用戶可以在忘記密碼頁面選擇「Email 驗證」
- [ ] 輸入 Email 後收到 OTP（6 位數字）
- [ ] OTP 有效期 10 分鐘
- [ ] 驗證 OTP 成功後可設定新密碼
- [ ] 新密碼更新到資料庫

**技術任務**：
1. 重構 `/src/app/forgot-password/page.tsx`
   - 新增選擇驗證方式（Email/手機）
   - Email 流程：輸入 Email → 驗證 OTP → 設定新密碼
2. 建立 `/src/app/api/auth/reset-password/send-email-otp/route.ts`
   - 生成 6 位數 OTP
   - 儲存 OTP 到 Redis 或記憶體（有效期 10 分鐘）
   - 使用 Resend 或 SendGrid 發送 Email
3. 建立 `/src/app/api/auth/reset-password/verify-email-otp/route.ts`
   - 驗證 OTP 是否正確
   - 驗證是否過期
   - 回傳驗證 token
4. 重構 `/src/app/api/auth/reset-password/route.ts`
   - 接收驗證 token 和新密碼
   - 驗證 token 有效性
   - 更新密碼（bcrypt hash）

### Story 2：手機 OTP 密碼重設（已實作）（1 點）

**作為** 忘記密碼的用戶
**我想要** 透過手機接收 OTP 來重設密碼
**以便** 恢復帳號存取

**驗收標準**：
- [ ] 用戶可以在忘記密碼頁面選擇「手機驗證」
- [ ] 輸入手機號碼後使用 Firebase Phone Auth 發送 OTP
- [ ] 驗證 OTP 成功後可設定新密碼

**技術任務**：
1. 更新 `/src/app/forgot-password/page.tsx`
   - 確保手機流程完整
   - 統一 UI 風格

### Story 3：客服表單（4 點）

**作為** 無法使用 OTP 的用戶
**我想要** 透過客服表單請求協助
**以便** 由客服人員協助重設密碼

**驗收標準**：
- [ ] 忘記密碼頁面提供「無法接收驗證碼？」連結
- [ ] 點擊後導向客服表單頁面
- [ ] 表單包含：Email、手機號碼、帳號資訊、問題描述
- [ ] 提交後發送通知給客服團隊
- [ ] 顯示「已提交，客服將在 24 小時內回覆」訊息

**技術任務**：
1. 建立 `/src/app/support/password-reset/page.tsx`
   - 客服表單頁面
   - 包含必要欄位和說明
2. 建立 `/src/app/api/support/password-reset/route.ts`
   - 接收表單資料
   - 發送通知 Email 給客服團隊
   - 儲存請求記錄到資料庫（可選）

---

## 技術規格

### Email OTP 流程圖

```
用戶點擊「忘記密碼」
→ 選擇「Email 驗證」
→ 輸入 Email
→ POST /api/auth/reset-password/send-email-otp
  → 生成 OTP（6 位數）
  → 儲存到 Redis（key: email, value: OTP, TTL: 10min）
  → 發送 Email（使用 Resend/SendGrid）
→ 用戶輸入 OTP
→ POST /api/auth/reset-password/verify-email-otp
  → 驗證 OTP 正確性
  → 生成重設 token（JWT，有效期 15 分鐘）
  → 回傳 reset token
→ 用戶設定新密碼
→ POST /api/auth/reset-password
  → 驗證 reset token
  → 更新密碼（bcrypt hash）
  → 回傳成功
```

### OTP 儲存方案

**選項 1：Redis**（推薦）
```typescript
// 儲存 OTP
await redis.setex(`otp:email:${email}`, 600, otp);  // 10 分鐘

// 驗證 OTP
const storedOtp = await redis.get(`otp:email:${email}`);
if (storedOtp === inputOtp) {
  await redis.del(`otp:email:${email}`);  // 刪除已使用的 OTP
  return true;
}
```

**選項 2：記憶體 Map**（開發環境）
```typescript
// 簡單的記憶體儲存
const otpStore = new Map<string, { otp: string; expiry: number }>();

// 儲存 OTP
otpStore.set(email, {
  otp: generatedOtp,
  expiry: Date.now() + 10 * 60 * 1000  // 10 分鐘
});

// 驗證 OTP
const data = otpStore.get(email);
if (data && data.otp === inputOtp && Date.now() < data.expiry) {
  otpStore.delete(email);
  return true;
}
```

### Email 服務選擇

**推薦：Resend**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: '密碼重設驗證碼',
  html: `
    <h1>密碼重設</h1>
    <p>您的驗證碼是：<strong>${otp}</strong></p>
    <p>此驗證碼將在 10 分鐘後失效。</p>
  `
});
```

---

## 檔案清單

### 新建檔案

1. **`/src/app/api/auth/reset-password/send-email-otp/route.ts`**
   - 發送 Email OTP API

2. **`/src/app/api/auth/reset-password/verify-email-otp/route.ts`**
   - 驗證 Email OTP API

3. **`/src/app/support/password-reset/page.tsx`**
   - 客服表單頁面

4. **`/src/app/api/support/password-reset/route.ts`**
   - 客服表單提交 API

5. **`/src/lib/otp.ts`**
   - OTP 生成和驗證工具函式

6. **`/src/lib/email.ts`**
   - Email 發送工具函式

### 重構檔案

7. **`/src/app/forgot-password/page.tsx`**
   - 新增選擇驗證方式
   - 整合 Email OTP 流程

8. **`/src/app/api/auth/reset-password/route.ts`**
   - 統一密碼重設邏輯
   - 支援 Email 和手機兩種方式

---

## 技術決策

### TD-013: 使用 Email OTP 而非重設連結

**決策**：使用 Email OTP 而非傳統的重設連結

**理由**：
- 對齊 web-hubble 的 ADR-004 決策
- OTP 更簡單，用戶不需要點擊連結
- 避免 URL 參數暴露風險
- 統一 OTP 驗證流程（Email 和手機都用 OTP）

**影響**：
- 需實作 OTP 儲存機制（Redis 或記憶體）
- OTP 有效期管理
- Email 服務整合

### TD-014: 客服表單作為後備方案

**決策**：提供客服表單作為無法接收 OTP 的後備方案

**理由**：
- 符合 ADR-004 的建議
- 處理特殊情況（手機遺失、Email 無法接收等）
- 提升用戶體驗和客服效率

**影響**：
- 需客服團隊手動處理
- 需建立客服流程和 SOP
- 可能需要後台管理介面（未來）

### TD-015: Redis 用於 OTP 儲存

**決策**：生產環境使用 Redis 儲存 OTP，開發環境使用記憶體 Map

**理由**：
- Redis 支援 TTL，自動清理過期 OTP
- Redis 在多伺服器環境中共享資料
- 開發環境用記憶體簡化設定

**影響**：
- 生產環境需部署 Redis
- 開發環境需實作記憶體 Map 邏輯
- 需環境變數控制使用哪種儲存

---

## 測試策略

### 單元測試

1. **OTP 生成測試**
   - 測試 OTP 為 6 位數字
   - 測試 OTP 唯一性

2. **OTP 驗證測試**
   - 測試正確 OTP 驗證成功
   - 測試錯誤 OTP 驗證失敗
   - 測試過期 OTP 驗證失敗

### 整合測試

3. **Email OTP 流程測試**
   - 測試發送 OTP Email
   - 測試驗證 OTP
   - 測試重設密碼

4. **客服表單測試**
   - 測試表單提交成功
   - 測試客服通知 Email 發送

### E2E 測試

5. **完整密碼重設流程**
   - 點擊「忘記密碼」
   - 選擇 Email 驗證
   - 輸入 Email
   - 接收並輸入 OTP
   - 設定新密碼
   - 使用新密碼登入

---

## 驗收標準（Definition of Done）

### 功能完整性
- [ ] Email OTP 密碼重設功能正常
- [ ] 手機 OTP 密碼重設功能正常
- [ ] 客服表單功能正常
- [ ] OTP 有效期管理正常

### 代碼品質
- [ ] TypeScript 型別完整
- [ ] Email 模板設計美觀
- [ ] 錯誤處理完善

### 測試
- [ ] 單元測試通過
- [ ] 整合測試通過
- [ ] E2E 測試通過

### 文件
- [ ] 更新 CLAUDE.md
- [ ] 客服 SOP 文件
- [ ] 密碼重設流程圖

---

## 風險管理

### 風險 1：Email 送達率
**影響**：高
**機率**：中
**描述**：OTP Email 可能進入垃圾郵件

**應對方案**：
- 使用可靠的 Email 服務（Resend/SendGrid）
- 設定 SPF、DKIM、DMARC 記錄
- 清楚的寄件人名稱和主旨

### 風險 2：OTP 暴力破解
**影響**：中
**機率**：低
**描述**：惡意用戶嘗試暴力破解 OTP

**應對方案**：
- 限制 OTP 嘗試次數（3 次）
- 實作 rate limiting
- 監控異常行為

### 風險 3：客服處理延遲
**影響**：中
**機率**：中
**描述**：客服表單處理可能延遲

**應對方案**：
- 清楚告知處理時間（24 小時）
- 自動回覆 Email 確認收到
- 建立客服工單系統（未來）

---

## 參考資源

### 相關 ADR
- [ADR-004: 後端密碼儲存](../../web-hubble/docs/auth/decisions/adr-004-password-storage-backend.md)

### Email 服務
- [Resend 文件](https://resend.com/docs)
- [SendGrid 文件](https://docs.sendgrid.com/)

### 內部文件
- [Sprint 1: 核心架構](./sprint-01-core-jwt.md)
- [當前密碼重設實作](../AUTHENTICATION_STATUS.md)

---

## 更新記錄

- 2025-11-21：Sprint 5 初始規劃完成
