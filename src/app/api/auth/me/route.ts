import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';

/**
 * 取得用戶資料 API
 *
 * 流程：
 * 1. 驗證 Firebase ID Token
 * 2. 從 Prisma 查詢用戶完整資料
 * 3. 回傳用戶資料（包含所有 Provider ID）
 *
 * 請求格式：
 * GET /api/auth/me
 * Authorization: Bearer <Firebase ID Token>
 *
 * 回應格式：
 * {
 *   "success": true,
 *   "user": {
 *     "uid": "...",
 *     "email": "...",
 *     "phoneNumber": "...",
 *     "displayName": "...",
 *     "photoURL": "...",
 *     "emailVerified": true,
 *     "phoneVerified": true,
 *     "googleId": "...",
 *     "facebookId": "...",
 *     "lineId": "...",
 *     "hasPassword": true
 *   }
 * }
 */

export async function GET(req: NextRequest) {
  try {
    // ────────────────────────────────
    // 1. 驗證 Authorization Header
    // ────────────────────────────────
    const authHeader = req.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '缺少 Authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // ────────────────────────────────
    // 2. 驗證 Firebase ID Token
    // ────────────────────────────────
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('❌ Firebase ID Token 驗證失敗:', error);
      return NextResponse.json(
        { success: false, error: 'ID Token 無效或已過期' },
        { status: 401 }
      );
    }

    const { uid } = decodedToken;

    // ────────────────────────────────
    // 3. 從 Prisma 查詢用戶資料
    // ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        email: true,
        phoneNumber: true,
        displayName: true,
        photoURL: true,
        emailVerified: true,
        phoneVerified: true,
        googleId: true,
        facebookId: true,
        lineId: true,
        password: true, // 僅用於判斷是否設定密碼
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用戶不存在' },
        { status: 404 }
      );
    }

    // ────────────────────────────────
    // 4. 回傳用戶資料（不包含密碼 hash）
    // ────────────────────────────────
    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        googleId: user.googleId,
        facebookId: user.facebookId,
        lineId: user.lineId,
        hasPassword: user.password !== null, // 是否設定密碼（不回傳 hash）
      },
    });
  } catch (error: any) {
    console.error('❌ 取得用戶資料 API 錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '取得用戶資料失敗',
      },
      { status: 500 }
    );
  }
}
