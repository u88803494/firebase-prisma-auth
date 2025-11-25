import { JWTPayload } from '@/lib/jwt';

/**
 * Auth API Client
 *
 * 集中管理所有認證相關的 API 呼叫
 * 使用 Backend JWT 進行認證
 */

// ============================================
// 型別定義
// ============================================

export interface LoginResponse {
  token: string;
  user: JWTPayload;
}

export interface OAuthVerifyResponse {
  token: string;
  user: JWTPayload;
  isNewUser: boolean;
}

export interface ApiError {
  success: false;
  error: string;
}

// ============================================
// Token 管理
// ============================================

const TOKEN_KEY = 'auth_token';

/**
 * 儲存 JWT Token 到 localStorage
 */
export function saveToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * 從 localStorage 取得 JWT Token
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * 從 localStorage 移除 JWT Token
 */
export function removeToken(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * 取得 Authorization Header
 */
function getAuthHeader(): HeadersInit {
  const token = getToken();
  if (!token) {
    return {};
  }
  return {
    'Authorization': `Bearer ${token}`,
  };
}

// ============================================
// API 呼叫函式
// ============================================

/**
 * 驗證當前 Token 是否有效
 * 用於 TanStack Query 的 useAuth hook
 */
export async function verifyToken(): Promise<JWTPayload> {
  const token = getToken();

  if (!token) {
    throw new Error('No token found');
  }

  const res = await fetch('/api/auth/verify', {
    method: 'GET',
    headers: {
      ...getAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    // Token 無效，清除 localStorage
    removeToken();
    throw new Error('Token invalid or expired');
  }

  const user: JWTPayload = await res.json();
  return user;
}

/**
 * 手機號碼 + 密碼登入
 */
export async function loginWithPhone(
  phoneNumber: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login-phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, password }),
  });

  const data = await res.json();

  if (!res.ok || !data.token) {
    throw new Error(data.error || '登入失敗');
  }

  // 儲存 token 到 localStorage
  saveToken(data.token);

  return data;
}

/**
 * Email + 密碼登入
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await fetch('/api/auth/login-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok || !data.token) {
    throw new Error(data.error || '登入失敗');
  }

  // 儲存 token 到 localStorage
  saveToken(data.token);

  return data;
}

/**
 * 驗證 OAuth Token（雙層 JWT 架構）
 *
 * 流程：
 * 1. 前端完成 OAuth 登入，取得 Firebase ID Token
 * 2. 呼叫此 API，後端驗證 Firebase ID Token
 * 3. 後端生成 Backend JWT 並回傳
 */
export async function verifyOAuthToken(
  idToken: string
): Promise<OAuthVerifyResponse> {
  const res = await fetch('/api/auth/oauth/verify-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const data = await res.json();

  if (!res.ok || !data.token) {
    throw new Error(data.error || 'OAuth 驗證失敗');
  }

  // 儲存 token 到 localStorage
  saveToken(data.token);

  return data;
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  // 清除 localStorage 中的 token
  removeToken();

  // 如果需要呼叫後端 logout API（例如加入黑名單），可以在這裡加上
  // await fetch('/api/auth/logout', { method: 'POST', headers: getAuthHeader() });
}
