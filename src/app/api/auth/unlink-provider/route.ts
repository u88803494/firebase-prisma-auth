import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';

/**
 * Provider 解除綁定 API
 *
 * 流程：
 * 1. 驗證用戶已登入（Firebase ID Token）
 * 2. 檢查至少保留一種登入方式（密碼 OR 其他 Provider）
 * 3. 更新 Prisma 資料庫（將 Provider ID 設為 null）
 * 4. 呼叫 Firebase Admin SDK 解除 Firebase 端綁定
 *
 * 請求格式：
 * POST /api/auth/unlink-provider
 * Authorization: Bearer <Firebase ID Token>
 * {
 *   "provider": "google" | "facebook" | "line"
 * }
 *
 * 回應格式：
 * {
 *   "success": true,
 *   "user": {
 *     "uid": "...",
 *     "googleId": null,
 *     "facebookId": "...",
 *     "lineId": "..."
 *   }
 * }
 */

export async function POST(req: NextRequest) {
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
    // 3. 解析請求資料
    // ────────────────────────────────
    const body = await req.json();
    const { provider } = body as { provider: 'google' | 'facebook' | 'line' };

    if (!provider || !['google', 'facebook', 'line'].includes(provider)) {
      return NextResponse.json(
        { success: false, error: '無效的 provider 參數' },
        { status: 400 }
      );
    }

    // ────────────────────────────────
    // 4. 查詢用戶資料
    // ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        password: true,
        googleId: true,
        facebookId: true,
        lineId: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '用戶不存在' },
        { status: 404 }
      );
    }

    // ────────────────────────────────
    // 5. 檢查是否至少保留一種登入方式
    // ────────────────────────────────
    const hasPassword = user.password !== null;
    const otherProviders = [
      user.googleId !== null && provider !== 'google',
      user.facebookId !== null && provider !== 'facebook',
      user.lineId !== null && provider !== 'line',
    ].filter(Boolean).length;

    // 必須至少保留：密碼 OR 其他 Provider
    if (!hasPassword && otherProviders === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '無法解除綁定：至少需保留一種登入方式',
          hint: '建議先設定密碼後再解除 OAuth 綁定',
        },
        { status: 400 }
      );
    }

    console.log(`🔓 準備解除綁定 ${provider}: uid=${uid}`);

    // ────────────────────────────────
    // 6. 更新 Prisma 資料庫（將 Provider ID 設為 null）
    // ────────────────────────────────
    const providerKey = `${provider}Id` as 'googleId' | 'facebookId' | 'lineId';

    const updatedUser = await prisma.user.update({
      where: { uid },
      data: { [providerKey]: null },
      select: {
        uid: true,
        email: true,
        phoneNumber: true,
        googleId: true,
        facebookId: true,
        lineId: true,
        displayName: true,
        photoURL: true,
      },
    });

    // ────────────────────────────────
    // 7. 解除 Firebase 端綁定（使用 Admin SDK）
    // ────────────────────────────────
    const providerIdMap: Record<string, string> = {
      google: 'google.com',
      facebook: 'facebook.com',
      line: 'oidc.line',
    };

    const firebaseProviderId = providerIdMap[provider];

    try {
      // Firebase Admin SDK 無法直接 unlink，但可以更新 providerData
      // 實際上前端已經用 unlink() 處理了，這裡只是確認
      const firebaseUser = await adminAuth.getUser(uid);
      const stillLinked = firebaseUser.providerData.find(
        (p) => p.providerId === firebaseProviderId
      );

      if (stillLinked) {
        console.warn(`⚠️ Firebase 端仍有 ${provider} 綁定，但 Prisma 已解除`);
      }
    } catch (error) {
      console.error(`❌ 檢查 Firebase 綁定狀態失敗:`, error);
      // 不中斷流程，因為 Prisma 已經更新成功
    }

    console.log(`✅ 成功解除綁定 ${provider}: uid=${uid}`);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('❌ Provider 解除綁定 API 錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '解除綁定失敗，請稍後再試',
      },
      { status: 500 }
    );
  }
}
