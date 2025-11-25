import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

/**
 * 刪除 Firebase Authentication 中的測試用戶
 *
 * 用於清理測試時建立的 Firebase Auth 用戶
 *
 * POST /api/dev/delete-firebase-users
 * {
 *   "phoneNumbers": ["+886929000001", "+886929000002", ...]
 * }
 */

export async function POST(req: NextRequest) {
  try {
    const { phoneNumbers } = await req.json();

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return NextResponse.json(
        { success: false, error: 'phoneNumbers 必須是陣列' },
        { status: 400 }
      );
    }

    const results = [];

    // 逐一查找並刪除每個手機號碼對應的 Firebase 用戶
    for (const phoneNumber of phoneNumbers) {
      try {
        // 使用 Firebase Admin SDK 查找用戶
        const userRecord = await adminAuth.getUserByPhoneNumber(phoneNumber);

        // 刪除用戶
        await adminAuth.deleteUser(userRecord.uid);

        results.push({
          phoneNumber,
          success: true,
          uid: userRecord.uid,
        });

        console.log(`✅ 已刪除 Firebase 用戶: ${phoneNumber} (UID: ${userRecord.uid})`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          results.push({
            phoneNumber,
            success: true,
            message: '用戶不存在（已經被刪除）',
          });
        } else {
          results.push({
            phoneNumber,
            success: false,
            error: error.message,
          });
          console.error(`❌ 刪除失敗: ${phoneNumber}`, error.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: phoneNumbers.length,
        deleted: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
      },
    });
  } catch (error: any) {
    console.error('❌ 批量刪除 Firebase 用戶錯誤:', error);
    return NextResponse.json(
      { success: false, error: error.message || '刪除失敗' },
      { status: 500 }
    );
  }
}
