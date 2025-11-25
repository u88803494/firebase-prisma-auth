'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, linkWithPopup, unlink, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

type Provider = 'google' | 'facebook' | 'line';

interface UserData {
  uid: string;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  googleId: string | null;
  facebookId: string | null;
  lineId: string | null;
  hasPassword: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [actionLoading, setActionLoading] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 取得用戶資料
  const fetchUserData = async () => {
    try {
      if (!auth.currentUser) {
        router.push('/login');
        return;
      }

      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (!response.ok) {
        throw new Error('取得用戶資料失敗');
      }

      const data = await response.json();
      setUser(data.user);
      setLoading(false);
    } catch (err: any) {
      console.error('取得用戶資料錯誤:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.push('/login');
      } else {
        fetchUserData();
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 綁定 Provider
  const handleLink = async (provider: Provider) => {
    setError(null);
    setSuccess(null);
    setActionLoading(provider);

    try {
      if (!auth.currentUser) {
        throw new Error('請先登入');
      }

      // 確認
      const confirmed = confirm(`確定要綁定 ${provider.toUpperCase()} 帳號？`);
      if (!confirmed) {
        setActionLoading(null);
        return;
      }

      // 取得對應的 Provider
      let authProvider;
      if (provider === 'google') {
        authProvider = new GoogleAuthProvider();
      } else if (provider === 'facebook') {
        authProvider = new FacebookAuthProvider();
      } else if (provider === 'line') {
        authProvider = new OAuthProvider('oidc.line');
      } else {
        throw new Error('不支援的 Provider');
      }

      // 1. Firebase 端綁定（Popup）
      console.log(`🔗 開始綁定 ${provider}...`);
      const result = await linkWithPopup(auth.currentUser, authProvider);
      console.log(`✅ Firebase 綁定成功:`, result.user.providerData);

      // 2. 取得新的 ID Token（包含更新的 providerData）
      const idToken = await result.user.getIdToken(true); // forceRefresh

      // 3. 呼叫後端同步 Prisma
      const response = await fetch('/api/auth/link-provider', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '綁定失敗');
      }

      console.log(`✅ Prisma 同步成功`);
      setSuccess(`成功綁定 ${provider.toUpperCase()} 帳號！`);

      // 刷新用戶資料
      await fetchUserData();
    } catch (err: any) {
      // 處理特定的 Firebase 錯誤
      if (err.code === 'auth/popup-closed-by-user') {
        // 用戶關閉 popup 視為取消操作，不顯示錯誤
        console.log(`ℹ️ 用戶取消綁定 ${provider}`);
        return; // 靜默返回
      }

      if (err.code === 'auth/cancelled-popup-request') {
        // 多個 popup 請求時自動取消前一個，不顯示錯誤
        console.log(`ℹ️ 取消前一個 popup 請求`);
        return; // 靜默返回
      }

      if (err.code === 'auth/popup-blocked') {
        setError('瀏覽器阻擋了彈出視窗，請允許彈出視窗後再試');
        return;
      }

      if (err.code === 'auth/account-exists-with-different-credential') {
        setError('此 Email 已被其他登入方式使用，請先解除原有綁定');
        return;
      }

      console.error(`❌ 綁定 ${provider} 失敗:`, err);
      setError(err.message || `綁定 ${provider.toUpperCase()} 失敗`);
    } finally {
      setActionLoading(null);
    }
  };

  // 解綁 Provider
  const handleUnlink = async (provider: Provider) => {
    setError(null);
    setSuccess(null);
    setActionLoading(provider);

    try {
      if (!auth.currentUser) {
        throw new Error('請先登入');
      }

      // 二次確認
      const confirmed = confirm(
        `確定要解除 ${provider.toUpperCase()} 綁定？\n\n` +
        `解除後將無法使用此方式登入。`
      );
      if (!confirmed) {
        setActionLoading(null);
        return;
      }

      // 1. 呼叫後端 API（會檢查是否能解綁）
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/auth/unlink-provider', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ provider })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '解除綁定失敗');
      }

      // 2. Firebase 端解綁
      const providerIdMap: Record<Provider, string> = {
        google: 'google.com',
        facebook: 'facebook.com',
        line: 'oidc.line'
      };

      const firebaseProviderId = providerIdMap[provider];
      await unlink(auth.currentUser, firebaseProviderId);

      console.log(`✅ 解除綁定 ${provider} 成功`);
      setSuccess(`成功解除 ${provider.toUpperCase()} 綁定`);

      // 刷新用戶資料
      await fetchUserData();
    } catch (err: any) {
      console.error(`❌ 解除綁定 ${provider} 失敗:`, err);
      setError(err.message || `解除 ${provider.toUpperCase()} 綁定失敗`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // 會被 redirect 到登入頁
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">帳號設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            管理您的登入方式和帳號資訊
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            ❌ {error}
          </div>
        )}

        {/* 成功訊息 */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            ✅ {success}
          </div>
        )}

        {/* 基本資訊 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">基本資訊</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="text-black font-medium">{user.email || '未設定'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">手機號碼:</span>
              <span className="text-black font-medium">{user.phoneNumber || '未設定'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">顯示名稱:</span>
              <span className="text-black font-medium">{user.displayName || '未設定'}</span>
            </div>
          </div>
        </div>

        {/* 已綁定的登入方式 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">已綁定的登入方式</h2>
          <div className="space-y-3">
            {/* 密碼 */}
            {user.hasPassword && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold">
                    🔒
                  </div>
                  <div>
                    <p className="text-black font-medium">手機 + 密碼</p>
                    <p className="text-xs text-gray-500">傳統登入方式</p>
                  </div>
                </div>
                <span className="text-green-600 text-sm font-medium">✓ 已設定</span>
              </div>
            )}

            {/* Google */}
            {user.googleId && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    G
                  </div>
                  <div>
                    <p className="text-black font-medium">Google</p>
                    <p className="text-xs text-gray-500">OAuth 社群登入</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink('google')}
                  disabled={actionLoading === 'google'}
                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'google' ? '處理中...' : '解除綁定'}
                </button>
              </div>
            )}

            {/* Facebook */}
            {user.facebookId && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    F
                  </div>
                  <div>
                    <p className="text-black font-medium">Facebook</p>
                    <p className="text-xs text-gray-500">OAuth 社群登入</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink('facebook')}
                  disabled={actionLoading === 'facebook'}
                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'facebook' ? '處理中...' : '解除綁定'}
                </button>
              </div>
            )}

            {/* LINE */}
            {user.lineId && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    L
                  </div>
                  <div>
                    <p className="text-black font-medium">LINE</p>
                    <p className="text-xs text-gray-500">OAuth 社群登入</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnlink('line')}
                  disabled={actionLoading === 'line'}
                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'line' ? '處理中...' : '解除綁定'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 綁定其他登入方式 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">綁定其他登入方式</h2>
          <div className="space-y-3">
            {/* Google */}
            {!user.googleId && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    G
                  </div>
                  <div>
                    <p className="text-black font-medium">Google</p>
                    <p className="text-xs text-gray-500">使用 Google 帳號登入</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLink('google')}
                  disabled={actionLoading === 'google'}
                  className="px-4 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'google' ? '綁定中...' : '綁定 Google'}
                </button>
              </div>
            )}

            {/* Facebook */}
            {!user.facebookId && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    F
                  </div>
                  <div>
                    <p className="text-black font-medium">Facebook</p>
                    <p className="text-xs text-gray-500">使用 Facebook 帳號登入</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLink('facebook')}
                  disabled={actionLoading === 'facebook'}
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'facebook' ? '綁定中...' : '綁定 Facebook'}
                </button>
              </div>
            )}

            {/* LINE */}
            {!user.lineId && (
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    L
                  </div>
                  <div>
                    <p className="text-black font-medium">LINE</p>
                    <p className="text-xs text-gray-500">使用 LINE 帳號登入</p>
                  </div>
                </div>
                <button
                  onClick={() => handleLink('line')}
                  disabled={actionLoading === 'line'}
                  className="px-4 py-2 text-sm text-white bg-green-500 rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === 'line' ? '綁定中...' : '綁定 LINE'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 返回按鈕 */}
        <div className="flex justify-center space-x-4">
          <Link
            href="/dashboard"
            className="px-6 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            返回 Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
