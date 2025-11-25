import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/jwt';

/**
 * Email + 密碼登入 API
 *
 * 流程：
 * 1. 驗證 Email 和密碼
 * 2. 生成 Backend JWT
 * 3. 回傳 JWT 和用戶資訊
 *
 * 請求格式：
 * POST /api/auth/login-email
 * {
 *   "email": "user@example.com",
 *   "password": "userPassword"
 * }
 *
 * 回應格式：
 * {
 *   "token": "eyJhbGc...",
 *   "user": {
 *     "uid": "firebase_uid",
 *     "email": "user@example.com",
 *     "phoneNumber": "+886912345678",
 *     "emailVerified": true,
 *     "phoneVerified": true
 *   }
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    // 驗證必填欄位
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email 和密碼為必填' },
        { status: 400 }
      );
    }

    // 查詢用戶（使用 Email）
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        uid: true,
        email: true,
        phoneNumber: true,
        password: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    // 檢查用戶是否存在
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Email 或密碼錯誤' },
        { status: 401 }
      );
    }

    // 檢查密碼是否存在
    if (!user.password) {
      return NextResponse.json(
        { success: false, error: '此帳號尚未設定密碼' },
        { status: 400 }
      );
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Email 或密碼錯誤' },
        { status: 401 }
      );
    }

    // 生成 Backend JWT
    const token = generateToken({
      uid: user.uid,
      email: user.email,
      phoneNumber: user.phoneNumber,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
    });

    // 回傳成功結果（不含密碼）
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('❌ Email 登入 API 錯誤:', error);

    return NextResponse.json(
      { success: false, error: '伺服器錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}
