import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * 開發用：刪除用戶 API
 *
 * 用於快速清理測試資料
 * ⚠️ 生產環境請移除此 API
 *
 * 注意：目前僅刪除 Prisma 資料庫記錄
 * （Firebase Admin SDK 需要 Service Account 金鑰才能刪除 Firebase 用戶）
 */
export async function DELETE(request: NextRequest) {
  try {
    // ────────────────────────────────
    // 環境檢查（僅開發環境可用）
    // ────────────────────────────────
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '此 API 僅限開發環境使用' },
        { status: 403 }
      );
    }

    // ────────────────────────────────
    // 解析請求參數
    // ────────────────────────────────
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const uid = searchParams.get('uid');
    const deleteAll = searchParams.get('all') === 'true';

    // ────────────────────────────────
    // 刪除所有用戶
    // ────────────────────────────────
    if (deleteAll) {
      // 刪除 Prisma 資料庫中的用戶記錄
      const result = await prisma.user.deleteMany();

      return NextResponse.json({
        success: true,
        message: `已刪除所有用戶（共 ${result.count} 筆）`,
        deletedCount: result.count,
      });
    }

    // ────────────────────────────────
    // 根據條件刪除用戶
    // ────────────────────────────────
    if (!email && !uid) {
      return NextResponse.json(
        { error: '請提供 email、uid 或 all=true 參數' },
        { status: 400 }
      );
    }

    // 構建查詢條件
    const where: any = {};
    if (email) where.email = email;
    if (uid) where.uid = uid;

    // 先查詢用戶是否存在
    const user = await prisma.user.findFirst({ where });

    if (!user) {
      return NextResponse.json(
        { error: '找不到符合條件的用戶' },
        { status: 404 }
      );
    }

    // 刪除 Prisma 資料庫中的用戶記錄
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({
      success: true,
      message: '用戶已刪除',
      deletedUser: {
        id: user.id,
        email: user.email,
        uid: user.uid,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '刪除失敗',
      },
      { status: 500 }
    );
  }
}

/**
 * GET 方法：列出所有用戶（開發用）
 */
export async function GET() {
  try {
    // 環境檢查
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '此 API 僅限開發環境使用' },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        uid: true,
        email: true,
        phoneNumber: true,
        displayName: true,
        googleId: true,
        facebookId: true,
        lineId: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('List users error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '查詢失敗',
      },
      { status: 500 }
    );
  }
}
