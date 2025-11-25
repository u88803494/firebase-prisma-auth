import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateToken } from '@/lib/jwt';

/**
 * 手機號碼註冊 API（雙層 JWT 架構）
 *
 * 流程：
 * 1. 前端已透過 Firebase Phone Auth 驗證手機號碼（OTP）
 * 2. 創建 Prisma 用戶記錄
 * 3. 生成 Backend JWT
 *
 * 請求格式：
 * POST /api/auth/register-phone
 * {
 *   "uid": "firebase-uid",
 *   "email": "user@example.com",
 *   "phoneNumber": "+886912345678",
 *   "password": "userPassword",
 *   "displayName": "User Name" // 選填
 * }
 *
 * 回應格式：
 * {
 *   "token": "eyJhbGc...", // Backend JWT
 *   "user": {
 *     "uid": "firebase-uid",
 *     "email": "user@example.com",
 *     "phoneNumber": "+886912345678",
 *     "emailVerified": false,
 *     "phoneVerified": true
 *   }
 * }
 */

export async function POST(req: NextRequest) {
  try {
    let { uid, email, phoneNumber, password, displayName } = await req.json();

    // 驗證必填欄位
    if (!uid || !email || !phoneNumber || !password) {
      return NextResponse.json(
        { success: false, error: '所有欄位為必填（displayName 除外）' },
        { status: 400 }
      );
    }

    // 標準化手機號碼（移除所有空格）
    phoneNumber = phoneNumber.replace(/\s+/g, '');

    // 檢查 Email 是否已被使用
    const existingEmailUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmailUser) {
      return NextResponse.json(
        { success: false, error: '此 Email 已被註冊' },
        { status: 409 }
      );
    }

    // 檢查手機號碼是否已被使用
    const existingPhoneUser = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingPhoneUser) {
      return NextResponse.json(
        { success: false, error: '此手機號碼已被註冊' },
        { status: 409 }
      );
    }

    // Hash 密碼
    const hashedPassword = await bcrypt.hash(password, 10);

    // 創建用戶
    const newUser = await prisma.user.create({
      data: {
        uid,
        email,
        phoneNumber,
        password: hashedPassword,
        displayName: displayName || null,
        phoneVerified: true, // 已透過 OTP 驗證
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: {
        uid: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
        emailVerified: true,
      },
    });

    // 生成 Backend JWT
    const token = generateToken({
      uid: newUser.uid,
      email: newUser.email,
      phoneNumber: newUser.phoneNumber,
      emailVerified: newUser.emailVerified,
      phoneVerified: newUser.phoneVerified,
    });

    return NextResponse.json({
      token,
      user: newUser,
    });
  } catch (error: any) {
    console.error('❌ 手機註冊 API 錯誤:', error);

    // 處理 Prisma 唯一約束錯誤
    if (error.code === 'P2002') {
      const target = error.meta?.target?.[0];
      if (target === 'email') {
        return NextResponse.json(
          { success: false, error: '此 Email 已被註冊' },
          { status: 409 }
        );
      }
      if (target === 'phoneNumber') {
        return NextResponse.json(
          { success: false, error: '此手機號碼已被註冊' },
          { status: 409 }
        );
      }
      if (target === 'uid') {
        return NextResponse.json(
          { success: false, error: '此 Firebase UID 已存在' },
          { status: 409 }
        );
      }
    }

    // 處理 Firebase Admin SDK 錯誤
    if (error.message?.includes('ADC')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Firebase Admin SDK 認證失敗，請確認 ADC 已設定',
          details: '執行：gcloud auth application-default login',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, error: '註冊失敗，請稍後再試' },
      { status: 500 }
    );
  }
}
