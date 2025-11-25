import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import prisma from '@/lib/prisma';
import { generateToken, JWTPayload } from '@/lib/jwt';

/**
 * OAuth Token 驗證 API（雙層 JWT 架構）
 *
 * 流程：
 * 1. 接收前端傳來的 Firebase ID Token（OAuth 登入成功後取得）
 * 2. 使用 Firebase Admin SDK 驗證 ID Token
 * 3. 檢查用戶是否存在於資料庫
 *    - 若不存在：建立新用戶記錄
 *    - 若存在：檢查是否需要更新資料
 * 4. 生成 Backend JWT
 * 5. 回傳 Backend JWT 和用戶資訊
 *
 * 請求格式：
 * POST /api/auth/oauth/verify-token
 * {
 *   "idToken": "Firebase ID Token"
 * }
 *
 * 回應格式：
 * {
 *   "token": "Backend JWT",
 *   "user": {
 *     "uid": "firebase_uid",
 *     "email": "user@example.com",
 *     "phoneNumber": "+886912345678",
 *     "emailVerified": true,
 *     "phoneVerified": true,
 *     "displayName": "User Name",
 *     "photoURL": "https://example.com/photo.jpg",
 *     "googleId": "...",
 *     "facebookId": "...",
 *     "lineId": "..."
 *   },
 *   "isNewUser": false
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📥 收到請求:', { hasIdToken: !!body.idToken });
    const { idToken } = body;

    // 驗證必填欄位
    if (!idToken) {
      console.error('❌ 缺少 idToken');
      return NextResponse.json(
        { success: false, error: 'ID Token 為必填' },
        { status: 400 }
      );
    }

    // 使用 Firebase Admin SDK 驗證 ID Token
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

    // 🔍 LOG 完整的 Token 資料（用於研究 LINE 提供哪些資訊）
    console.log('🔍 完整 decodedToken:', JSON.stringify(decodedToken, null, 2));

    const {
      uid,
      email,
      phone_number,
      name, // displayName
      picture, // photoURL
      firebase: { sign_in_provider: providerType, identities },
    } = decodedToken;

    console.log('🔍 解析結果:', {
      uid,
      email: email || '(無)',
      phone_number: phone_number || '(無)',
      name: name || '(無)',
      picture: picture || '(無)',
      providerType,
      identities: identities || {}
    });

    // ✅ 允許沒有 email（LINE 用戶會在註冊完成頁面手動輸入）
    // Google/Facebook 通常會提供 email

    // 獲取 Provider ID
    let providerId: string | undefined;
    if (identities && providerType) {
      const providerSpecificIdentities = identities[providerType];
      if (providerSpecificIdentities && providerSpecificIdentities.length > 0) {
        providerId = providerSpecificIdentities[0];
      }
    }

    // 準備更新或建立用戶的數據
    const userDataToUpdate: any = {
      email: email || null,  // ✅ LINE 用戶可能沒有 email
      emailVerified: !!email,  // 只有有 email 才標記為已驗證
      displayName: name || null,
      photoURL: picture || null,
      lastLoginAt: new Date(),
    };

    // 如果是手機號碼登入的 OAuth (例如 LINE 可能帶手機號碼)，則更新
    if (phone_number) {
      // 標準化手機號碼（移除所有空格）
      userDataToUpdate.phoneNumber = phone_number.replace(/\s+/g, '');
      userDataToUpdate.phoneVerified = true;
    }

    // 🔒 檢查 Provider ID 是否已被其他用戶使用
    const providerKey =
      providerType === 'google.com' ? 'googleId' :
      providerType === 'facebook.com' ? 'facebookId' : 'lineId';

    if (providerId) {
      const existingUser = await prisma.user.findUnique({
        where:
          providerType === 'google.com' ? { googleId: providerId } :
          providerType === 'facebook.com' ? { facebookId: providerId } :
          { lineId: providerId }
      });

      // 如果此 Provider ID 已被其他用戶使用，拒絕登入
      if (existingUser && existingUser.uid !== uid) {
        console.error(`❌ Provider ID 衝突: ${providerKey}=${providerId} 已被 ${existingUser.uid} 使用`);
        return NextResponse.json({
          success: false,
          error: `此 ${providerType} 帳號已被其他用戶綁定`
        }, { status: 409 });
      }
    }

    // 根據 providerType 設置對應的 providerId
    if (providerType === 'google.com') {
      userDataToUpdate.googleId = providerId;
    } else if (providerType === 'facebook.com') {
      userDataToUpdate.facebookId = providerId;
    } else if (providerType === 'oidc.line') { // ✅ LINE OIDC Provider ID
      userDataToUpdate.lineId = providerId;
    }


    // 檢查用戶是否存在
    let user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        email: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        displayName: true,
        photoURL: true,
        googleId: true,
        facebookId: true,
        lineId: true,
      },
    });

    let isNewUser = false;

    if (!user) {
      // 若用戶不存在，建立新用戶
      user = await prisma.user.create({
        data: {
          uid,
          // 確保 password 為 null，因為這是 OAuth 用戶
          password: null,
          createdAt: new Date(),
          ...userDataToUpdate,
        },
        select: {
          uid: true,
          email: true,
          phoneNumber: true,
          emailVerified: true,
          phoneVerified: true,
          displayName: true,
          photoURL: true,
          googleId: true,
          facebookId: true,
          lineId: true,
        },
      });
      isNewUser = true;
      console.log('✅ 建立新 OAuth 用戶:', email || `(LINE: ${uid})`);
    } else {
      // 若用戶存在，更新用戶資料
      user = await prisma.user.update({
        where: { uid },
        data: {
          ...userDataToUpdate,
        },
        select: {
          uid: true,
          email: true,
          phoneNumber: true,
          emailVerified: true,
          phoneVerified: true,
          displayName: true,
          photoURL: true,
          googleId: true,
          facebookId: true,
          lineId: true,
        },
      });
      console.log('🔄 更新 OAuth 用戶資訊:', email || `(LINE: ${uid})`);
    }

    // 生成 Backend JWT
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      displayName: user.displayName || undefined,
      photoURL: user.photoURL || undefined,
      googleId: user.googleId || undefined,
      facebookId: user.facebookId || undefined,
      lineId: user.lineId || undefined,
    });

    return NextResponse.json({
      token,
      user,
      isNewUser,
    });
  } catch (error) {
    console.error('❌ OAuth Token 驗證 API 錯誤:', error);

    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
