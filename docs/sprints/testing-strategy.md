# 測試策略

本文件定義整個專案的測試策略，涵蓋單元測試、整合測試、E2E 測試等各層級的測試方法和工具選擇。

---

## 測試金字塔

```
           /\
          /  \         E2E Tests (5%)
         /____\        ← 最少但最重要
        /      \
       / 整合測試 \      Integration Tests (15%)
      /__________\     ← 驗證元件間互動
     /            \
    /   單元測試    \   Unit Tests (80%)
   /________________\  ← 最多最快速
```

**原則**：
- 單元測試：快速、大量、覆蓋率高
- 整合測試：適量、驗證關鍵流程
- E2E 測試：少量、覆蓋核心場景

---

## 測試工具

### 單元測試和整合測試

**工具**：Jest + React Testing Library

**安裝**：
```bash
pnpm add -D jest @testing-library/react @testing-library/jest-dom
pnpm add -D @testing-library/user-event
pnpm add -D jest-environment-jsdom
```

**配置**：`jest.config.js`
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80
    }
  }
};
```

---

### E2E 測試

**工具**：Chrome DevTools MCP（已整合）

**優勢**：
- 使用 Claude Code 的 Chrome DevTools MCP
- 自動化瀏覽器操作
- 快照和截圖功能
- 已在專案中使用（密碼重設測試）

**範例**：
```typescript
// 使用 Chrome DevTools MCP 進行測試
// 1. list_pages - 列出頁面
// 2. navigate_page - 導航到登入頁
// 3. take_snapshot - 取得頁面快照
// 4. fill - 填寫表單
// 5. click - 點擊按鈕
// 6. wait_for - 等待導向完成
```

---

## 單元測試策略

### JWT 工具測試

**檔案**：`/src/lib/jwt.test.ts`

**測試案例**：
```typescript
describe('JWT Utils', () => {
  describe('generateToken', () => {
    it('should generate valid JWT', () => {
      const payload = {
        uid: 'test_uid',
        email: 'test@example.com',
        phoneNumber: '+886912345678'
      };
      const token = generateToken(payload);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should include correct payload', () => {
      const payload = {
        uid: 'test_uid',
        email: 'test@example.com',
        phoneNumber: '+886912345678'
      };
      const token = generateToken(payload);
      const decoded = verifyToken(token);
      expect(decoded?.uid).toBe('test_uid');
      expect(decoded?.email).toBe('test@example.com');
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateToken({ uid: 'test' });
      const result = verifyToken(token);
      expect(result).toBeTruthy();
    });

    it('should reject invalid token', () => {
      const result = verifyToken('invalid_token');
      expect(result).toBeNull();
    });

    it('should reject expired token', () => {
      // Mock expired token
      const expiredToken = jwt.sign(
        { uid: 'test' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );
      const result = verifyToken(expiredToken);
      expect(result).toBeNull();
    });
  });
});
```

---

### Auth Middleware 測試

**檔案**：`/src/lib/middleware/auth.test.ts`

**測試案例**：
```typescript
describe('Auth Middleware', () => {
  it('should authenticate valid token', async () => {
    const token = generateToken({ uid: 'test' });
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await verifyAuth(request);
    expect(result.authenticated).toBe(true);
    expect(result.user?.uid).toBe('test');
  });

  it('should reject missing token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test');
    const result = await verifyAuth(request);
    expect(result.authenticated).toBe(false);
  });

  it('should reject invalid token', async () => {
    const request = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        Authorization: 'Bearer invalid_token'
      }
    });
    const result = await verifyAuth(request);
    expect(result.authenticated).toBe(false);
  });
});
```

---

### Zustand Store 測試

**檔案**：`/src/stores/authStore.test.ts`

**測試案例**：
```typescript
describe('Auth Store', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear();
    // 重置 store
    useAuthStore.getState().logout();
  });

  it('should login successfully', () => {
    const user = { uid: 'test', email: 'test@example.com' };
    const token = 'test_token';

    useAuthStore.getState().login(token, user);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(user);
    expect(state.token).toBe(token);
  });

  it('should persist token in localStorage', () => {
    const token = 'test_token';
    const user = { uid: 'test' };

    useAuthStore.getState().login(token, user);

    expect(localStorage.getItem('token')).toBe(token);
  });

  it('should logout successfully', () => {
    // Setup
    useAuthStore.getState().login('token', { uid: 'test' });

    // Logout
    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });
});
```

---

## 整合測試策略

### API 路由測試

**檔案**：`/src/app/api/auth/login-phone/route.test.ts`

**測試案例**：
```typescript
describe('POST /api/auth/login-phone', () => {
  it('should login with correct credentials', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/login-phone', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '+886912345002',
          password: 'password123'
        })
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBeTruthy();
    expect(data.user).toBeTruthy();
  });

  it('should reject incorrect password', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/login-phone', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '+886912345002',
          password: 'wrong_password'
        })
      })
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it('should reject non-existent user', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/login-phone', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: '+886999999999',
          password: 'password123'
        })
      })
    );

    expect(response.status).toBe(404);
  });
});
```

---

### OAuth 流程測試

**檔案**：`/src/app/api/auth/oauth/verify-token/route.test.ts`

**測試案例**：
```typescript
describe('POST /api/auth/oauth/verify-token', () => {
  it('should verify valid Firebase token', async () => {
    // Mock Firebase Admin SDK
    jest.spyOn(adminAuth, 'verifyIdToken').mockResolvedValue({
      uid: 'firebase_uid',
      email: 'test@example.com',
      firebase: { sign_in_provider: 'google.com' }
    } as any);

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/oauth/verify-token', {
        method: 'POST',
        body: JSON.stringify({
          firebaseToken: 'valid_firebase_token'
        })
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.token).toBeTruthy();
    expect(data.user).toBeTruthy();
  });

  it('should return needsRegistration for new user', async () => {
    // Mock: Firebase token valid but user not in database
    jest.spyOn(adminAuth, 'verifyIdToken').mockResolvedValue({
      uid: 'new_firebase_uid',
      email: 'new@example.com',
      firebase: { sign_in_provider: 'google.com' }
    } as any);

    const response = await POST(
      new NextRequest('http://localhost:3000/api/auth/oauth/verify-token', {
        method: 'POST',
        body: JSON.stringify({
          firebaseToken: 'valid_firebase_token'
        })
      })
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.needsRegistration).toBe(true);
    expect(data.firebaseUser).toBeTruthy();
  });
});
```

---

## E2E 測試策略

### 使用 Chrome DevTools MCP

**測試流程範例**：手機登入完整流程

```
1. list_pages → 確認頁面列表
2. select_page(0) → 選擇第一個頁面
3. navigate_page({ type: 'url', url: 'http://localhost:3000/login' })
4. wait_for({ text: '登入' })
5. take_snapshot() → 取得登入頁快照
6. fill({ uid: 'phone-input', value: '+886912345002' })
7. fill({ uid: 'password-input', value: 'password123' })
8. click({ uid: 'login-button' })
9. wait_for({ text: 'Dashboard' })
10. take_snapshot() → 驗證導向 Dashboard
```

### E2E 測試案例清單

#### Sprint 1: 手機/Email 登入
- [ ] 手機+密碼登入成功
- [ ] Email+密碼登入成功
- [ ] 錯誤密碼登入失敗
- [ ] 登入後導向 Dashboard
- [ ] Dashboard 顯示用戶資訊
- [ ] 重新整理頁面保持登入狀態
- [ ] 登出功能正常

#### Sprint 2: OAuth 登入與註冊
- [ ] Google OAuth 登入（已註冊用戶）
- [ ] Google OAuth 註冊（新用戶）
- [ ] OAuth 註冊綁定手機流程
- [ ] OAuth 註冊完成後登入

#### Sprint 3: 個人資料完善
- [ ] 首次登入導向個人資料完善頁
- [ ] 填寫個人資料並提交
- [ ] 完善後導向 Dashboard
- [ ] 再次登入不再要求完善

#### Sprint 4: 多平台綁定
- [ ] 綁定 OAuth 平台成功
- [ ] 解綁 OAuth 平台成功
- [ ] 最後一種方式無法解綁
- [ ] 設定密碼成功

#### Sprint 5: 密碼重設
- [ ] Email OTP 密碼重設完整流程
- [ ] 手機 OTP 密碼重設完整流程
- [ ] 客服表單提交成功

---

## 測試資料管理

### 測試用戶資料

**手機註冊用戶**：
```javascript
{
  phoneNumber: '+886912345002',
  email: 'test.phone@example.com',
  password: 'password123',
  displayName: '測試用戶',
  uid: 'test_phone_uid'
}
```

**OAuth 用戶（有密碼）**：
```javascript
{
  phoneNumber: '+886912345678',
  email: 'test.oauth@example.com',
  password: 'password123',
  googleId: 'google_test_id',
  displayName: 'OAuth 測試用戶',
  uid: 'test_oauth_uid'
}
```

**OAuth 用戶（無密碼）**：
```javascript
{
  phoneNumber: '+886987654321',
  email: 'test.oauth.nopass@example.com',
  password: null,
  googleId: 'google_test_id_2',
  displayName: 'OAuth 無密碼用戶',
  uid: 'test_oauth_nopass_uid'
}
```

### 測試資料庫設定

**開發環境**：
- 使用獨立的測試資料庫：`prisma/test.db`
- 每次測試前清空資料庫
- 執行 seed script 建立測試資料

**Seed Script**：`prisma/seed.test.ts`
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 清空資料庫
  await prisma.user.deleteMany();

  // 建立測試用戶
  await prisma.user.createMany({
    data: [
      {
        uid: 'test_phone_uid',
        phoneNumber: '+886912345002',
        email: 'test.phone@example.com',
        password: await bcrypt.hash('password123', 10),
        phoneVerified: true,
        emailVerified: true
      },
      // ... 其他測試用戶
    ]
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 持續整合（CI）

### GitHub Actions 配置

**檔案**：`.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Run tests
        run: pnpm test
        env:
          DATABASE_URL: "file:./test.db"
          JWT_SECRET: ${{ secrets.JWT_SECRET_TEST }}

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/coverage-final.json
```

---

## 測試執行指令

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest --testPathPattern=\\.test\\.(ts|tsx)$",
    "test:integration": "jest --testPathPattern=\\.integration\\.test\\.(ts|tsx)$",
    "test:e2e": "echo 'E2E tests run via Chrome DevTools MCP'"
  }
}
```

### 執行測試

**所有測試**：
```bash
pnpm test
```

**僅單元測試**：
```bash
pnpm test:unit
```

**僅整合測試**：
```bash
pnpm test:integration
```

**測試覆蓋率**：
```bash
pnpm test:coverage
```

**Watch 模式**（開發時）：
```bash
pnpm test:watch
```

---

## 測試覆蓋率目標

### 全域目標

- **行覆蓋率（Lines）**：> 80%
- **函式覆蓋率（Functions）**：> 70%
- **分支覆蓋率（Branches）**：> 70%
- **語句覆蓋率（Statements）**：> 80%

### 關鍵模組目標

**核心工具（高優先級）**：
- `/src/lib/jwt.ts`：> 95%
- `/src/lib/middleware/auth.ts`：> 95%
- `/src/lib/otp.ts`：> 90%

**API 路由（高優先級）**：
- `/src/app/api/auth/*`：> 85%

**前端元件（中優先級）**：
- `/src/components/*`：> 70%
- `/src/app/*/page.tsx`：> 70%

**Store（中優先級）**：
- `/src/stores/*`：> 80%

---

## 測試最佳實踐

### 測試命名規範

```typescript
describe('ComponentOrFunction', () => {
  describe('specificMethod', () => {
    it('should do something when condition', () => {
      // 測試邏輯
    });
  });
});
```

**範例**：
```typescript
describe('JWT Utils', () => {
  describe('generateToken', () => {
    it('should generate valid token when payload is valid', () => {
      // ...
    });

    it('should throw error when payload is invalid', () => {
      // ...
    });
  });
});
```

### AAA 模式

**Arrange-Act-Assert**：
```typescript
it('should login successfully', () => {
  // Arrange - 準備測試資料
  const credentials = {
    phoneNumber: '+886912345002',
    password: 'password123'
  };

  // Act - 執行動作
  const result = login(credentials);

  // Assert - 驗證結果
  expect(result.success).toBe(true);
  expect(result.token).toBeTruthy();
});
```

### Mock 和 Stub

**Prisma Client Mock**：
```typescript
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'jest-mock-extended';

jest.mock('./lib/prisma', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>()
}));

beforeEach(() => {
  mockReset(prismaMock);
});
```

**Firebase Admin SDK Mock**：
```typescript
jest.mock('./lib/firebaseAdmin', () => ({
  adminAuth: {
    verifyIdToken: jest.fn()
  }
}));
```

---

## 參考資源

### 測試工具文件
- [Jest 官方文件](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Chrome DevTools MCP](https://github.com/anthropics/mcp-server-chrome)

### 內部文件
- [Sprint 計畫](./README.md)
- [遷移策略](./migration-strategy.md)

---

## 更新記錄

- 2025-11-21：初始版本
