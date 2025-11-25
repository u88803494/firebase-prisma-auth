import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/middleware/auth';

/**
 * GET /api/auth/verify
 *
 * 驗證 JWT Token 是否有效
 * 主要用於 TanStack Query 的 useAuth hook
 *
 * Headers:
 *   Authorization: Bearer <token>
 *
 * 回傳：
 *   - 200: Token 有效，回傳用戶資訊
 *   - 401: Token 無效或缺少
 */
export async function GET(request: NextRequest) {
  try {
    // 使用 middleware 驗證 token
    const authResult = await verifyAuth(request);

    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing token' },
        { status: 401 }
      );
    }

    // 回傳用戶資訊
    return NextResponse.json(authResult.user, { status: 200 });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
