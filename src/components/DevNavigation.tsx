'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useAuth, useLogout } from '@/hooks/useAuth';

/**
 * 全局導航選單
 */
export default function DevNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const firebaseUser = auth.currentUser;

  // 檢查是否為當前頁面
  const isActive = (path: string) => pathname === path;

  // 登出處理
  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        router.push('/login');
      },
    });
  };

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">🔐 Firebase Auth POC</span>
          </div>

          {/* 右側：所有連結 + 用戶資訊 + 登入/登出 */}
          <div className="flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              首頁
            </Link>

            {isAuthenticated && (
              <Link
                href="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
            )}

            <Link
              href="/dev/users"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dev/users')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              👥 用戶管理
            </Link>

            <div className="ml-2 h-6 w-px bg-gray-600"></div>

            {/* 用戶資訊 + 登入/登出 */}
            {isAuthenticated ? (
              <>
                {/* 用戶頭像 */}
                {firebaseUser?.photoURL && (
                  <img
                    src={firebaseUser.photoURL}
                    alt={firebaseUser.displayName || '用戶'}
                    className="w-8 h-8 rounded-full border-2 border-gray-600 ml-2"
                  />
                )}

                {/* 用戶名稱 */}
                <div className="hidden md:block text-right ml-2">
                  <p className="text-sm font-medium text-white">
                    {firebaseUser?.displayName || user?.email?.split('@')[0] || '用戶'}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email}</p>
                </div>

                {/* 登出按鈕 */}
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="ml-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoggingOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">登出中</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span className="hidden sm:inline">登出</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              /* 登入按鈕 */
              <Link
                href="/login"
                className="ml-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">登入</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
