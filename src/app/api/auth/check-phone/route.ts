import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { prisma } from '@/lib/prisma';

/**
 * 檢查手機號碼是否已被使用 API
 *
 * 請求格式：
 * POST /api/auth/check-phone
 * {
 *   "phoneNumber": "+886912345678"
 * }
 *
 * 回應格式：
 * {
 *   "success": true,
 *   "exists": false  // false 表示手機號碼可用，true 表示已被使用
 * }
 *
 * 或
 * {
 *   "success": true,
 *   "exists": true,
 *   "source": "database"  // 或 "firebase"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // ────────────────────────────────
    // 1. 解析請求資料
    // ────────────────────────────────
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: '缺少手機號碼' },
        { status: 400 }
      );
    }

    // ────────────────────────────────
    // 2. 檢查 Prisma 資料庫
    // ────────────────────────────────
    const existingInDatabase = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (existingInDatabase) {
      return NextResponse.json({
        success: true,
        exists: true,
        source: 'database',
      });
    }

    // ────────────────────────────────
    // 3. 檢查 Firebase Authentication
    // ────────────────────────────────
    try {
      const firebaseUser = await adminAuth.getUserByPhoneNumber(phoneNumber);

      // 找到了用戶 = 手機號碼已被使用
      return NextResponse.json({
        success: true,
        exists: true,
        source: 'firebase',
      });
    } catch (error: any) {
      // Firebase 拋出 auth/user-not-found 錯誤 = 手機號碼可用
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({
          success: true,
          exists: false,
        });
      }

      // 其他 Firebase 錯誤（如無效格式）
      if (error.code === 'auth/invalid-phone-number') {
        return NextResponse.json(
          { success: false, error: '無效的手機號碼格式' },
          { status: 400 }
        );
      }

      // 未預期的 Firebase 錯誤
      throw error;
    }
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
