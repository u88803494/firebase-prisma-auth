'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  setupRecaptcha,
  sendPhoneOTP,
  verifyPhoneOTP,
  cleanupRecaptcha,
} from '@/lib/firebasePhoneAuth';

function CompleteRegistrationPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(''); // ✅ Email 輸入（LINE 用戶手動填寫，Google/Facebook 預填且禁用）
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [initializing, setInitializing] = useState(true);

  // ✅ LINE 用戶現在也通過 Firebase OIDC，不需要特殊處理
  // lineOAuthData 已移除，統一使用 firebaseUser

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 取得當前 Firebase 用戶
  const firebaseUser = auth.currentUser;

  // ────────────────────────────────
  // Firebase 測試手機號碼列表
  // ────────────────────────────────
  const testPhoneNumbers = [
    { phone: '+886912345003', otp: '111111' },
    { phone: '+886912345002', otp: '123456' },
    { phone: '+886929000002', otp: '123456' },
    { phone: '+886929000001', otp: '123456' },
    { phone: '+886912345001', otp: '123456' },
    { phone: '+886929000004', otp: '123456' },
    { phone: '+886929000006', otp: '123456' },
    { phone: '+886929000005', otp: '123456' },
    { phone: '+886929013192', otp: '123456' },
    { phone: '+886939163302', otp: '123456' },
  ];

  // ────────────────────────────────
  // ✅ 不再需要從 URL 讀取 LINE OAuth 參數
  // LINE 用戶現在通過 Firebase OIDC，所有資料都在 firebaseUser 中
  // ────────────────────────────────

  // ────────────────────────────────
  // 檢查 Firebase 用戶是否已登入
  // ────────────────────────────────
  useEffect(() => {
    // ✅ 統一檢查：所有 OAuth 用戶（包括 LINE）都需要有 Firebase Session
    if (!firebaseUser) {
      // 未登入，導回登入頁
      router.push('/login');
      return;
    }

    // ✅ 設定 email 初始值（Google/Facebook 有 email，LINE 沒有）
    if (firebaseUser.email) {
      setEmail(firebaseUser.email);
    }

    // 已登入，完成初始化
    setInitializing(false);
  }, [firebaseUser, router]);

  // ────────────────────────────────
  // 初始化 reCAPTCHA
  // ────────────────────────────────
  useEffect(() => {
    if (initializing || !firebaseUser) return;

    // ✅ 初始化 reCAPTCHA（所有 OAuth 用戶統一處理）
    try {
      const verifier = setupRecaptcha('recaptcha-container');
      recaptchaVerifierRef.current = verifier;
    } catch (err) {
      console.error('reCAPTCHA setup failed:', err);
    }

    return () => {
      cleanupRecaptcha(recaptchaVerifierRef.current);
    };
  }, [initializing, firebaseUser]);

  // ────────────────────────────────
  // 重新發送倒數計時
  // ────────────────────────────────
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // ────────────────────────────────
  // 發送 OTP
  // ────────────────────────────────
  const handleSendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!phoneNumber || phoneNumber.length < 10) {
        throw new Error('請輸入正確的手機號碼');
      }

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
        throw new Error('此手機號碼已被註冊，請使用其他號碼');
      }

      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA 未初始化');
      }

      const confirmationResult = await sendPhoneOTP(
        phoneNumber,
        recaptchaVerifierRef.current
      );

      confirmationResultRef.current = confirmationResult;
      setStep('otp');
      setResendCountdown(60);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || '發送失敗');

      // 重置 reCAPTCHA
      cleanupRecaptcha(recaptchaVerifierRef.current);
      try {
        recaptchaVerifierRef.current = setupRecaptcha('recaptcha-container');
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────
  // 處理 OTP 輸入
  // ────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (index === 5 && value && newOtp.every(d => d)) {
      handleVerifyOTP(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      const newOtp = digits.split('');
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      handleVerifyOTP(digits);
    }
  };

  // ────────────────────────────────
  // 驗證 OTP 並完成註冊
  // ────────────────────────────────
  const handleVerifyOTP = async (otpCode?: string) => {
    const code = otpCode || otp.join('');
    if (code.length !== 6) {
      setError('請輸入完整的 6 位數驗證碼');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!confirmationResultRef.current) {
        throw new Error('請先發送驗證碼');
      }

      // Firebase 驗證 OTP
      // ✅ 所有 OAuth 用戶（包括 LINE）：驗證後會將手機號碼綁定到現有 Firebase User
      const verifiedUser = await verifyPhoneOTP(confirmationResultRef.current, code);

      // 取得最新的 ID Token
      const idToken = await verifiedUser.getIdToken();

      // 呼叫後端 API 更新資料庫（綁定手機號碼 + Email）
      // ✅ LINE 用戶資訊現在也在 firebaseUser 中，後端從 token 取得
      // ✅ Email 從前端傳入（LINE 用戶手動輸入，Google/Facebook 預填）
      const response = await fetch('/api/auth/update-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          uid: verifiedUser.uid,
          phoneNumber: verifiedUser.phoneNumber,
          email: email, // ✅ 加上 email
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '更新資料庫失敗');
      }

      // 完成註冊，導向 Dashboard
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || '驗證失敗');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };


  // ────────────────────────────────
  // 返回修改手機號碼
  // ────────────────────────────────
  const handleBackToPhone = () => {
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
    setError(null);
  };

  // ────────────────────────────────
  // Loading 狀態
  // ────────────────────────────────
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" suppressHydrationWarning>
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // ✅ 所有 OAuth 用戶（包括 LINE）都必須有 Firebase Session
  if (!firebaseUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" suppressHydrationWarning>
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* 主要註冊表單（保持原有居中佈局） */}
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4" suppressHydrationWarning>
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          {/* 標題 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 'phone' ? '完成註冊' : '驗證手機號碼'}
            </h1>
            <p className="text-gray-600">
              {step === 'phone'
                ? '請綁定您的手機號碼以完成註冊'
                : `我們已發送 6 位數驗證碼到 ${phoneNumber}`}
            </p>
          </div>

          {/* 用戶資訊預覽 */}
          {step === 'phone' && (
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg mb-6">
              {/* ✅ 統一從 firebaseUser 顯示資訊（包括 LINE 用戶） */}
              {firebaseUser.photoURL && (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || '用戶'}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div className="flex-1 min-w-0">
                {firebaseUser.displayName && (
                  <p className="font-medium text-gray-900 truncate">
                    {firebaseUser.displayName}
                  </p>
                )}
                {firebaseUser.email && (
                  <p className="text-sm text-gray-600 truncate">
                    {firebaseUser.email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* 步驟 1: 輸入手機號碼和 Email */}
          {step === 'phone' && (
            <form onSubmit={handleSendOTP} className="space-y-6">
              {/* ✅ Email 輸入欄位 */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={!!firebaseUser.email || loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
                {!!firebaseUser.email ? (
                  <p className="mt-2 text-sm text-gray-500">
                    此 Email 來自您的 OAuth 帳號，無法修改
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    請輸入您的 Email 地址
                  </p>
                )}
              </div>

              {/* 手機號碼輸入欄位 */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  手機號碼
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d+]/g, ''))}
                  placeholder="+886912345678"
                  disabled={loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  required
                />
                <p className="mt-2 text-sm text-gray-500">
                  請輸入完整的手機號碼（例如：+886912345003）
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !phoneNumber || !email}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>發送中...</span>
                  </>
                ) : (
                  <span>發送驗證碼</span>
                )}
              </button>
            </form>
          )}

          {/* 步驟 2: 驗證 OTP */}
          {step === 'otp' && (
            <div className="space-y-6">
              {/* OTP 輸入框 */}
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={loading}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                ))}
              </div>

              {/* 驗證按鈕 */}
              <button
                onClick={() => handleVerifyOTP()}
                disabled={loading || otp.join('').length !== 6}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>驗證中...</span>
                  </>
                ) : (
                  <span>驗證</span>
                )}
              </button>

              {/* 重新發送 / 返回 */}
              <div className="flex justify-between items-center text-sm">
                <button
                  onClick={handleBackToPhone}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                >
                  ← 修改手機號碼
                </button>

                {resendCountdown > 0 ? (
                  <span className="text-gray-600">{resendCountdown} 秒後可重新發送</span>
                ) : (
                  <button
                    onClick={() => handleSendOTP()}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    重新發送驗證碼
                  </button>
                )}
              </div>

              <p className="text-center text-sm text-gray-600">
                請在 5 分鐘內完成驗證
              </p>
            </div>
          )}


          {/* reCAPTCHA 容器 */}
          <div id="recaptcha-container"></div>
        </div>
      </div>

      {/* 測試手機號碼側邊欄（固定在右側） */}
      <div className="hidden lg:block fixed right-8 top-1/2 -translate-y-1/2 w-80 z-10">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            📱 測試手機號碼
          </h3>
          <p className="text-xs text-gray-600 mb-4">
            點擊號碼可自動填入
          </p>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {testPhoneNumbers.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  setPhoneNumber(item.phone);
                  setStep('phone');
                  setError(null);
                }}
                disabled={loading}
                className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="font-mono text-sm text-gray-900">
                  {item.phone}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  驗證碼: {item.otp}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// Wrap with Suspense to satisfy Next.js 15 useSearchParams requirement
export default function CompleteRegistrationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <CompleteRegistrationPageContent />
    </Suspense>
  );
}
