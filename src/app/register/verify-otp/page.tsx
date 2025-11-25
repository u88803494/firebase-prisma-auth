'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * OTP 驗證頁面（已廢棄）
 *
 * 現在整個 Phone Auth 流程都在 /register/complete 頁面中完成
 * 此頁面僅用於重定向
 */
export default function VerifyOTPPage() {
  const router = useRouter();

  useEffect(() => {
    // 重定向到註冊完成頁面
    router.replace('/register/complete');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}
