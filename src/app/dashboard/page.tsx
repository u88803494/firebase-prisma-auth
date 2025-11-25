'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useRequireAuth, useLogout } from '@/hooks/useAuth';

export default function DashboardPage() {
  const router = useRouter();

  // 使用 TanStack Query hooks 管理認證狀態
  const { user: authUser, isLoading } = useRequireAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();

  // 取得 Firebase 用戶資訊（用於顯示 displayName, photoURL 等）
  const firebaseUser = auth.currentUser;

  // ────────────────────────────────
  // 登出處理
  // ────────────────────────────────
  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push('/login');
      },
    });
  };

  // ────────────────────────────────
  // Loading 狀態
  // ────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" suppressHydrationWarning>
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ────────────────────────────────
  // 主要介面
  // ────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50" suppressHydrationWarning>
      {/* 導航列 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo / 標題 */}
            <div className="flex items-center">
              <span className="text-xl font-bold text-gray-900">🔐 Firebase Auth POC</span>
            </div>

            {/* 導航連結 */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/settings')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                ⚙️ 帳號設定
              </button>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoggingOut ? '登出中...' : '登出'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 歡迎訊息 */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-6">
            {firebaseUser?.photoURL && (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || '用戶'}
                className="w-20 h-20 rounded-full border-4 border-blue-100"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                歡迎回來，{firebaseUser?.displayName || authUser?.email || '用戶'}！
              </h2>
              <p className="text-gray-600">
                您已成功登入系統
              </p>
            </div>
          </div>
        </div>

        {/* 用戶資訊卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 用戶資訊 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              用戶資訊
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">UID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {authUser?.uid}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {authUser?.email}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">手機號碼</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {authUser?.phoneNumber || '未設定'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Email 驗證狀態
                </dt>
                <dd className="mt-1">
                  {authUser?.emailVerified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      已驗證
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      未驗證
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  手機驗證狀態
                </dt>
                <dd className="mt-1">
                  {authUser?.phoneVerified ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      已驗證
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      未驗證
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Provider 資訊（僅 OAuth 用戶） */}
          {firebaseUser && firebaseUser.providerData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                登入方式
              </h3>
              <div className="space-y-3">
                {firebaseUser.providerData.map((provider, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {provider.providerId === 'google.com'
                          ? 'Google'
                          : provider.providerId === 'facebook.com'
                            ? 'Facebook'
                            : provider.providerId === 'line.com'
                              ? 'LINE'
                              : provider.providerId}
                      </p>
                      <p className="text-xs text-gray-500">
                        {provider.email || provider.phoneNumber || provider.uid}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 測試資訊 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎉 認證系統測試成功！
          </h3>
          <p className="text-blue-700 mb-4">
            您已成功登入，使用雙層 JWT 架構（Backend JWT + TanStack Query）管理認證狀態。
          </p>
          <div className="bg-white rounded p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">
              已完成的功能：
            </p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>✅ Google / Facebook / LINE OAuth 登入</li>
              <li>✅ 手機號碼 + 密碼登入</li>
              <li>✅ Email + 密碼登入</li>
              <li>✅ 雙層 JWT 架構（Firebase ID Token → Backend JWT）</li>
              <li>✅ TanStack Query 狀態管理（自動快取與重新驗證）</li>
              <li>✅ 認證狀態保護（useRequireAuth）</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
