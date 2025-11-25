'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

type Step = 'phone' | 'verification' | 'password';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 清理 reCAPTCHA（組件卸載時）
  useEffect(() => {
    return () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.log('清理 reCAPTCHA');
        }
        (window as any).recaptchaVerifier = null;
      }
    };
  }, []);

  // Step 1: 手機號碼
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 2: OTP 相關
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  // Step 3: 新密碼
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 1: 發送 OTP（含前置檢查）
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 🆕 前置檢查：驗證手機號碼是否可用於重設密碼
      const checkRes = await fetch('/api/auth/check-phone-for-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error || '檢查手機號碼失敗');
        setLoading(false);
        return;
      }

      // 手機號碼未註冊
      if (!checkData.exists) {
        setError('此手機號碼尚未註冊，請先註冊帳號');
        setLoading(false);
        return;
      }

      // 手機號碼已註冊但未驗證
      if (!checkData.phoneVerified) {
        setError('手機號碼尚未驗證，無法重設密碼。請聯繫客服或重新註冊。');
        setLoading(false);
        return;
      }

      // ✅ 手機號碼有效，開始發送 OTP
      // 清理舊的 reCAPTCHA（避免重複初始化）
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.log('清理舊 reCAPTCHA');
        }
        (window as any).recaptchaVerifier = null;
      }

      // 設置新的 reCAPTCHA
      const recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA 驗證成功
            console.log('reCAPTCHA 驗證成功');
          },
          'expired-callback': () => {
            // reCAPTCHA 過期
            console.log('reCAPTCHA 過期');
          }
        }
      );
      (window as any).recaptchaVerifier = recaptchaVerifier;

      const result = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setConfirmationResult(result);
      setStep('verification');
      setLoading(false);
    } catch (err: any) {
      console.error('❌ 發送 OTP 錯誤:', err);
      setError(err.message || '發送驗證碼失敗，請稍後再試');

      // 清理失敗的 reCAPTCHA
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          console.log('清理失敗的 reCAPTCHA');
        }
        (window as any).recaptchaVerifier = null;
      }

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
      await confirmationResult.confirm(verificationCode);
      setStep('password');
      setLoading(false);
    } catch (err: any) {
      console.error('❌ 驗證 OTP 錯誤:', err);
      setError(err.message || '驗證失敗，請確認驗證碼是否正確');
      setLoading(false);
    }
  };

  // Step 3: 重設密碼
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('密碼與確認密碼不符');
      return;
    }

    if (newPassword.length < 6) {
      setError('密碼至少需要 6 個字元');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || '重設密碼失敗');
        setLoading(false);
        return;
      }

      // 成功，導向登入頁面
      alert('密碼重設成功！請使用新密碼登入');
      router.push('/login');
    } catch (err: any) {
      console.error('❌ 重設密碼錯誤:', err);
      setError(err.message || '重設密碼失敗，請稍後再試');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            重設密碼
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone' && '輸入手機號碼'}
            {step === 'verification' && '驗證手機號碼'}
            {step === 'password' && '設定新密碼'}
          </p>
        </div>

        {/* 進度指示器 */}
        <div className="flex items-center justify-center space-x-4">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === 'phone'
                ? 'bg-blue-600 text-white'
                : 'bg-green-500 text-white'
            }`}
          >
            {step !== 'phone' ? '✓' : '1'}
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === 'verification'
                ? 'bg-blue-600 text-white'
                : step === 'password'
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            {step === 'password' ? '✓' : '2'}
          </div>
          <div className="w-12 h-1 bg-gray-300"></div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              step === 'password'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-600'
            }`}
          >
            3
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Step 1: 輸入手機號碼 */}
        {step === 'phone' && (
          <form className="mt-8 space-y-6" onSubmit={handleSendOTP}>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                手機號碼
              </label>
              <input
                id="phoneNumber"
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="+886912345678"
              />
              <p className="mt-1 text-sm text-gray-500">
                請包含國碼，例如：+886912345678
              </p>
            </div>

            <div id="recaptcha-container"></div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '發送中...' : '發送驗證碼'}
            </button>
          </form>
        )}

        {/* Step 2: 驗證 OTP */}
        {step === 'verification' && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <p className="text-sm text-gray-600">
              我們已發送驗證碼到 <span className="font-medium">{phoneNumber}</span>
            </p>

            <div>
              <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                驗證碼
              </label>
              <input
                id="verificationCode"
                type="text"
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="請輸入 6 位數驗證碼"
                maxLength={6}
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? '驗證中...' : '驗證並繼續'}
              </button>
              <button
                type="button"
                onClick={() => setStep('phone')}
                disabled={loading}
                className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                返回修改手機號碼
              </button>
            </div>
          </form>
        )}

        {/* Step 3: 設定新密碼 */}
        {step === 'password' && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <p className="text-sm text-green-600">
              ✓ 手機號碼已驗證：<span className="font-medium">{phoneNumber}</span>
            </p>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                新密碼
              </label>
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="至少 6 個字元"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                確認密碼
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-black placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="再次輸入密碼"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '重設中...' : '完成重設'}
            </button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            返回登入
          </Link>
        </div>
      </div>
    </div>
  );
}
