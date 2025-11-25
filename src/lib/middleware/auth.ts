import { NextRequest } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/jwt';

/**
 * 認證結果介面
 */
export interface AuthResult {
  authenticated: boolean;
  user: JWTPayload | null;
}

/**
 * 驗證請求中的 JWT Token
 *
 * 從 Authorization header 中提取並驗證 JWT Token
 * 格式：Authorization: Bearer <token>
 *
 * @param request - Next.js Request 物件
 * @returns 認證結果，包含 authenticated 狀態和用戶資訊
 *
 * @example
 * export async function GET(request: NextRequest) {
 *   const authResult = await verifyAuth(request);
 *
 *   if (!authResult.authenticated) {
 *     return NextResponse.json(
 *       { error: 'Unauthorized' },
 *       { status: 401 }
 *     );
 *   }
 *
 *   // 使用 authResult.user 取得用戶資訊
 *   const { uid, email } = authResult.user;
 *   // ...
 * }
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  // 從 Authorization header 取得 token
  const authHeader = request.headers.get('Authorization');

  // 檢查 header 是否存在且格式正確
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authenticated: false,
      user: null
    };
  }

  // 提取 token（移除 "Bearer " 前綴）
  const token = authHeader.substring(7);

  // 驗證 token
  const user = verifyToken(token);

  if (!user) {
    return {
      authenticated: false,
      user: null
    };
  }

  return {
    authenticated: true,
    user
  };
}

/**
 * 從 token 中取得用戶 UID
 * 如果 token 無效，回傳 null
 *
 * @param request - Next.js Request 物件
 * @returns 用戶 UID 或 null
 */
export async function getUserIdFromToken(request: NextRequest): Promise<string | null> {
  const authResult = await verifyAuth(request);
  return authResult.authenticated ? authResult.user!.uid : null;
}
