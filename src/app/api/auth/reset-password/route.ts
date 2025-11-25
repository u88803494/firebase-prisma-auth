import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * 密碼重設 API
 *
 * 透過已驗證的手機號碼重設密碼
 */
export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────
    // 解析請求參數
    // ────────────────────────────────
    let { phoneNumber, newPassword } = await request.json();

    // 驗證必要欄位
    if (!phoneNumber || !newPassword) {
      return NextResponse.json(
        { success: false, error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // 驗證密碼強度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: '密碼至少需要 6 個字元' },
        { status: 400 }
      );
    }

    // 標準化手機號碼（移除所有空格）
    phoneNumber = phoneNumber.replace(/\s+/g, '');

    // ────────────────────────────────
    // 查詢用戶是否存在
    // ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: '此手機號碼尚未註冊' },
        { status: 404 }
      );
    }

    // 驗證手機號碼是否已驗證
    if (!user.phoneVerified) {
      return NextResponse.json(
        { success: false, error: '手機號碼尚未驗證，無法重設密碼' },
        { status: 403 }
      );
    }

    // ────────────────────────────────
    // 雜湊新密碼
    // ────────────────────────────────
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ────────────────────────────────
    // 更新密碼
    // ────────────────────────────────
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ 密碼重設成功: ${user.phoneNumber} (${user.email})`);

    return NextResponse.json({
      success: true,
      message: '密碼重設成功',
    });
  } catch (error) {
    console.error('❌ 密碼重設 API 錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '密碼重設失敗',
      },
      { status: 500 }
    );
  }
}
