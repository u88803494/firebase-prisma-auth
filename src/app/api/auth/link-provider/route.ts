import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';

/**
 * Provider 綁定 API
 *
 * 流程：
 * 1. 前端使用 Firebase linkWithPopup 完成 OAuth 綁定
 * 2. 取得新的 ID Token（包含最新的 providerData）
 * 3. 呼叫此 API 同步更新 Prisma 資料庫
 *
 * 請求格式：
 * POST /api/auth/link-provider
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
 *     "googleId": "...",
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
    // 4. 從 Firebase Admin SDK 獲取最新的用戶資料
    // ────────────────────────────────
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUser(uid);
    } catch (error) {
      console.error('❌ 無法取得 Firebase 用戶資料:', error);
      return NextResponse.json(
        { success: false, error: '無法取得用戶資料' },
        { status: 500 }
      );
    }

    // ────────────────────────────────
    // 5. 從 providerData 提取 Provider ID
    // ────────────────────────────────
    const providerIdMap: Record<string, string> = {
      google: 'google.com',
      facebook: 'facebook.com',
      line: 'oidc.line',
    };

    const firebaseProviderId = providerIdMap[provider];
    const providerInfo = firebaseUser.providerData.find(
      (p) => p.providerId === firebaseProviderId
    );

    if (!providerInfo) {
      return NextResponse.json(
        {
          success: false,
          error: `Firebase 中未找到 ${provider} 綁定資料，請確認已完成 Firebase linkWithPopup`,
        },
        { status: 400 }
      );
    }

    const providerId = providerInfo.uid;

    console.log(`🔗 準備綁定 ${provider}: providerId=${providerId}, uid=${uid}`);

    // ────────────────────────────────
    // 6. 檢查 Provider ID 是否已被其他用戶使用
    // ────────────────────────────────
    const providerKey = `${provider}Id` as 'googleId' | 'facebookId' | 'lineId';

    const existingUser = await prisma.user.findUnique({
      where:
        provider === 'google' ? { googleId: providerId } :
        provider === 'facebook' ? { facebookId: providerId } :
        { lineId: providerId }
    });

    if (existingUser && existingUser.uid !== uid) {
      console.error(`❌ Provider ID 衝突: ${providerKey}=${providerId} 已被 ${existingUser.uid} 使用`);
      return NextResponse.json(
        {
          success: false,
          error: `此 ${provider.toUpperCase()} 帳號已被其他用戶綁定`,
        },
        { status: 409 }
      );
    }

    // ────────────────────────────────
    // 7. 更新 Prisma User 記錄
    // ────────────────────────────────
    const updatedUser = await prisma.user.update({
      where: { uid },
      data: { [providerKey]: providerId },
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

    console.log(`✅ 成功綁定 ${provider}: uid=${uid}, ${providerKey}=${providerId}`);

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('❌ Provider 綁定 API 錯誤:', error);

    // 處理 Prisma 唯一約束錯誤
    if (error.code === 'P2002') {
      const target = error.meta?.target?.[0];
      return NextResponse.json(
        {
          success: false,
          error: `此 ${target} 已被其他用戶使用`,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || '綁定失敗，請稍後再試',
      },
      { status: 500 }
    );
  }
}
