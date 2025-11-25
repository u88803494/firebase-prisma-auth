import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 檢查手機號碼是否可用於密碼重設
 *
 * 請求格式：
 * POST /api/auth/check-phone-for-reset
 * {
 *   "phoneNumber": "+886912345678"
 * }
 *
 * 回應格式：
 * {
 *   "success": true,
 *   "exists": true,
 *   "phoneVerified": true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────
    // 1. 解析請求資料
    // ────────────────────────────────
    const body = await request.json();
    let { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: '缺少手機號碼' },
        { status: 400 }
      );
    }

    // 標準化手機號碼（移除所有空格）
    phoneNumber = phoneNumber.replace(/\s+/g, '');

    // ────────────────────────────────
    // 2. 檢查 Prisma 資料庫
    // ────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        phoneVerified: true,
      },
    });

    // 手機號碼未註冊
    if (!user) {
      return NextResponse.json({
        success: true,
        exists: false,
        error: '此手機號碼尚未註冊',
      });
    }

    // 手機號碼已註冊但未驗證
    if (!user.phoneVerified) {
      return NextResponse.json({
        success: true,
        exists: true,
        phoneVerified: false,
        error: '手機號碼尚未驗證，請先完成驗證流程',
      });
    }

    // 手機號碼已註冊且已驗證（可以重設密碼）
    return NextResponse.json({
      success: true,
      exists: true,
      phoneVerified: true,
    });
  } catch (error: any) {
    console.error('❌ 檢查手機號碼錯誤:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '檢查手機號碼失敗',
      },
      { status: 500 }
    );
  }
}
