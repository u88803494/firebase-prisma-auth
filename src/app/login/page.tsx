'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import OAuthButtons from '@/components/auth/OAuthButtons';
import Link from 'next/link';
import { useLoginWithPhone } from '@/hooks/useAuth';
import { getToken } from '@/lib/api/auth';

export default function LoginPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // 使用 TanStack Query mutation
  const { mutate: login, isPending } = useLoginWithPhone();

  // 檢查是否已登入，若已登入則自動導向 Dashboard
  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace('/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  // ✅ LINE OIDC 不再需要 Custom Token 處理
  // Firebase 會自動處理 OIDC callback 並建立 session
  // 移除舊的 LINE Custom Token 相關邏輯

  // 手機號碼 + 密碼登入
  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    login(
      { phoneNumber, password },
      {
        onSuccess: () => {
          // 登入成功，導向 dashboard
          router.push('/dashboard');
        },
        onError: (err) => {
          setError(err.message || '登入失敗');
        },
      }
    );
  };

  // 檢查登入狀態時顯示載入畫面
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">檢查登入狀態...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo 或品牌區域 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            歡迎使用
          </h1>
          <p className="text-gray-600">
            使用 OAuth 快速登入或註冊
          </p>
        </div>

        {/* OAuth 登入區塊 */}
        <div className="mb-6">
          <OAuthButtons />
        </div>

        {/* 流程說明 */}
        <div className="py-4 px-4 bg-blue-50 rounded-lg border border-blue-200 mb-6">
          <p className="text-sm text-blue-800">
            💡 <strong>首次使用</strong>：完成 OAuth 認證後，需綁定手機號碼以完成註冊
          </p>
          <p className="text-sm text-blue-800 mt-1">
            🔄 <strong>再次登入</strong>：已註冊用戶可直接進入系統
          </p>
        </div>

        {/* 分隔線 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              其他登入方式
            </span>
          </div>
        </div>

        {/* 手機號碼 + 密碼登入表單 */}
        <form onSubmit={handlePhoneLogin} className="space-y-4">
          {/* 錯誤訊息 */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* 手機號碼輸入 */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              手機號碼
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+886912345678"
              required
              disabled={isPending}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* 密碼輸入 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              密碼
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              required
              disabled={isPending}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="mt-2 text-right">
              <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                忘記密碼？
              </Link>
            </div>
          </div>

          {/* 登入按鈕 */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>登入中...</span>
              </>
            ) : (
              <span>登入</span>
            )}
          </button>
        </form>

        {/* 註冊連結 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          還沒有帳號？
          <Link href="/register/manual" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">
            立即註冊
          </Link>
        </div>
      </div>
    </div>
  );
}
