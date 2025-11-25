import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebaseAuth';
import { prisma } from '@/lib/prisma';

/**
 * OAuth 用戶綁定手機號碼 API
 *
 * 在 Firebase Phone Auth 驗證成功後，更新資料庫中的用戶電話號碼
 * 注意：不再處理密碼設定，OAuth 用戶無需設定密碼即可完成註冊
 */
export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────
    // 1. 取得 Authorization Header
    // ────────────────────────────────
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: '缺少 Authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];

    // ────────────────────────────────
    // 2. 驗證 Firebase Token
    // ────────────────────────────────
    const tokenResult = await verifyFirebaseToken(idToken);

    if (!tokenResult.success || !tokenResult.user) {
      return NextResponse.json(
        { error: tokenResult.error || 'Token 驗證失敗' },
        { status: 401 }
      );
    }

    const firebaseUser = tokenResult.user;

    // ────────────────────────────────
    // 3. 解析請求資料
    // ────────────────────────────────
    const body = await request.json();
    let { uid, phoneNumber, email } = body;

    // 驗證 UID 是否匹配
    if (uid !== firebaseUser.uid) {
      return NextResponse.json(
        { error: 'UID 不匹配' },
        { status: 403 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: '缺少電話號碼' },
        { status: 400 }
      );
    }

    // 標準化手機號碼（移除所有空格）
    phoneNumber = phoneNumber.replace(/\s+/g, '');

    // ✅ 驗證 Email（必填且格式正確）
    if (!email) {
      return NextResponse.json(
        { error: '缺少 Email' },
        { status: 400 }
      );
    }

    // 驗證 Email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Email 格式不正確' },
        { status: 400 }
      );
    }

    // ────────────────────────────────
    // 4. 檢查電話號碼和 Email 是否已被使用
    // ────────────────────────────────
    const existingPhoneUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingPhoneUser && existingPhoneUser.uid !== uid) {
      return NextResponse.json(
        { error: '此電話號碼已被其他帳號使用' },
        { status: 409 }
      );
    }

    // ✅ 檢查 Email 唯一性
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser && existingEmailUser.uid !== uid) {
      return NextResponse.json(
        { error: '此 Email 已被其他帳號使用' },
        { status: 409 }
      );
    }

    // ────────────────────────────────
    // 5. 更新或建立用戶記錄（統一從 firebaseUser 取得資訊）
    // ────────────────────────────────
    // ✅ 從 firebaseUser.providerData 取得 OAuth Provider ID
    const googleProvider = firebaseUser.providerData.find((p) => p.providerId === 'google.com');
    const facebookProvider = firebaseUser.providerData.find((p) => p.providerId === 'facebook.com');
    const lineProvider = firebaseUser.providerData.find((p) => p.providerId === 'oidc.line');

    const user = await prisma.user.upsert({
      where: { uid },
      update: {
        phoneNumber,
        phoneVerified: true, // Firebase 已驗證
        email,  // ✅ 更新 email（LINE 用戶手動輸入）
        emailVerified: !!firebaseUser.email,  // 只有 OAuth 提供的 email 才標記為已驗證
      },
      create: {
        uid: firebaseUser.uid,
        email,  // ✅ 使用前端傳入的 email
        phoneNumber,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        emailVerified: !!firebaseUser.email,  // OAuth 提供的才驗證
        phoneVerified: true,
        // 根據 providerData 設置 OAuth ID（所有提供商統一處理）
        googleId: googleProvider?.uid,
        facebookId: facebookProvider?.uid,
        lineId: lineProvider?.uid, // LINE OIDC Provider
      },
    });

    // ────────────────────────────────
    // 6. 返回成功回應
    // ────────────────────────────────
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        phoneNumber: user.phoneNumber,
        displayName: user.displayName,
        photoURL: user.photoURL,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
    });
  } catch (error) {
    console.error('Update phone error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '更新電話號碼失敗',
      },
      { status: 500 }
    );
  }
}
