'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { saveToken } from '@/lib/api/auth';
import Link from 'next/link';

type Step = 'phone' | 'verification' | 'details';

export default function ManualRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: 手機號碼
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2: OTP 相關
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [firebaseUid, setFirebaseUid] = useState('');

  // Step 3: 詳細資料
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Step 1: 發送 OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ✨ 檢查手機號碼是否已被使用
      const checkResponse = await fetch('/api/auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.error || '檢查手機號碼失敗');
      }

      if (checkData.exists) {
        throw new Error('此手機號碼已被註冊，請使用其他號碼或直接登入');
      }

      // 設置 reCAPTCHA
      if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible',
          }
        );
      }

      const appVerifier = (window as any).recaptchaVerifier;

      // 發送 OTP
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setStep('verification');
      setLoading(false);
    } catch (err: any) {
      console.error('❌ 發送 OTP 錯誤:', err);
      setError(err.message || '發送驗證碼失敗，請稍後再試');
      setLoading(false);
    }
  };

  // Step 2: 驗證 OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 驗證 OTP
      const userCredential = await confirmationResult.confirm(verificationCode);
      const firebaseUser = userCredential.user;

      // 儲存 Firebase UID，進入下一步填寫詳細資料
      setFirebaseUid(firebaseUser.uid);
      setStep('details');
      setLoading(false);
    } catch (err: any) {
      console.error('❌ 驗證 OTP 錯誤:', err);
      setError(err.message || '驗證失敗，請確認驗證碼是否正確');
      setLoading(false);
    }
  };

  // Step 3: 完成註冊
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 驗證密碼
    if (password !== confirmPassword) {
      setError('密碼與確認密碼不符');
      return;
    }

    if (password.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }

    setLoading(true);

    try {
      // 呼叫 API 創建用戶
      const res = await fetch('/api/auth/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: firebaseUid,
          email,
          phoneNumber,
          password,
          displayName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || '註冊失敗');
        setLoading(false);
        return;
      }

      // 儲存 Backend JWT
      saveToken(data.token);

      // 註冊成功，導向 Dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('❌ 註冊錯誤:', err);
      setError(err.message || '註冊失敗，請稍後再試');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            手機號碼註冊
          </h1>
          <p className="text-gray-600">
            {step === 'phone' && '輸入手機號碼'}
            {step === 'verification' && '驗證手機號碼'}
            {step === 'details' && '設定帳號資訊'}
          </p>
        </div>

        {/* 進度指示 */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'phone' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}>
              {step === 'phone' ? '1' : '✓'}
            </div>
            <div className={`w-12 h-0.5 ${
              step === 'verification' || step === 'details' ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'verification' ? 'bg-blue-600 text-white' :
              step === 'details' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              {step === 'details' ? '✓' : '2'}
            </div>
            <div className={`w-12 h-0.5 ${
              step === 'details' ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: 輸入手機號碼 */}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
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
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-500">請包含國碼，例如：+886912345678</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>發送中...</span>
                </>
              ) : (
                <span>發送驗證碼</span>
              )}
            </button>
          </form>
        )}

        {/* Step 2: 驗證 OTP */}
        {step === 'verification' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                我們已發送驗證碼到 <strong>{phoneNumber}</strong>
              </p>
            </div>

            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                驗證碼
              </label>
              <input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="請輸入 6 位數驗證碼"
                required
                disabled={loading}
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 text-center text-2xl tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>驗證中...</span>
                </>
              ) : (
                <span>驗證並繼續</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              disabled={loading}
              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              返回修改手機號碼
            </button>
          </form>
        )}

        {/* Step 3: 填寫詳細資料 */}
        {step === 'details' && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
              <p className="text-sm text-green-800">
                ✓ 手機號碼已驗證：<strong>{phoneNumber}</strong>
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* 顯示名稱 */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                顯示名稱（選填）
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="您的名稱"
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* 密碼 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 個字元"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* 確認密碼 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                確認密碼
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次輸入密碼"
                required
                disabled={loading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>註冊中...</span>
                </>
              ) : (
                <span>完成註冊</span>
              )}
            </button>
          </form>
        )}

        {/* reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* 已有帳號連結 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          已有帳號？
          <Link href="/login" className="ml-1 text-blue-600 hover:text-blue-700 font-medium">
            立即登入
          </Link>
        </div>
      </div>
    </div>
  );
}
