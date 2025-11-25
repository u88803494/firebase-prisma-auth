// Firebase Phone Authentication Helper
// 用於綁定電話號碼到現有 OAuth 用戶

import {
  RecaptchaVerifier,
  linkWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * 設置 reCAPTCHA 驗證器（invisible 模式）
 *
 * @param containerId - reCAPTCHA 容器的 DOM ID
 * @returns RecaptchaVerifier 實例
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  // 清除已存在的 reCAPTCHA（避免重複初始化）
  const existingContainer = document.getElementById(containerId);
  if (existingContainer) {
    existingContainer.innerHTML = '';
  }

  const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible', // invisible 模式：用戶體驗更好
    callback: () => {
      console.log('✅ reCAPTCHA solved');
    },
    'expired-callback': () => {
      console.warn('⚠️ reCAPTCHA expired, please try again');
    },
  });

  return recaptchaVerifier;
}

/**
 * 發送 OTP 到指定電話號碼（綁定到現有 OAuth 用戶）
 *
 * ✅ 統一使用 linkWithPhoneNumber 將電話號碼綁定到已登入的 OAuth 用戶
 * 適用於所有 OAuth 提供商：Google、Facebook、LINE（OIDC）
 *
 * @param phoneNumber - 完整的電話號碼（包含國碼，例如：+886912345678）
 * @param recaptchaVerifier - reCAPTCHA 驗證器實例
 * @returns ConfirmationResult - 用於後續驗證 OTP
 *
 * @throws 如果用戶未登入或發送失敗
 */
export async function sendPhoneOTP(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('用戶未登入，無法綁定電話號碼');
    }

    console.log('📱 發送 OTP 到:', phoneNumber);

    // 使用 linkWithPhoneNumber 綁定電話到現有用戶
    // Firebase 會自動發送 SMS（或使用測試號碼）
    const confirmationResult = await linkWithPhoneNumber(
      currentUser,
      phoneNumber,
      recaptchaVerifier
    );

    console.log('✅ OTP 已發送');

    return confirmationResult;
  } catch (error: any) {
    console.error('❌ 發送 OTP 失敗:', error);

    // 處理常見錯誤
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('電話號碼格式不正確');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('請求過於頻繁，請稍後再試');
    } else if (error.code === 'auth/provider-already-linked') {
      throw new Error('此帳號已綁定電話號碼');
    } else if (error.code === 'auth/credential-already-in-use') {
      throw new Error('此電話號碼已被其他帳號使用');
    }

    throw error;
  }
}

/**
 * 驗證 OTP 碼
 *
 * @param confirmationResult - sendPhoneOTP 返回的 ConfirmationResult
 * @param otpCode - 6 位數 OTP 驗證碼
 * @returns 更新後的 Firebase User（包含 phone provider）
 *
 * @throws 如果 OTP 驗證失敗
 */
export async function verifyPhoneOTP(
  confirmationResult: ConfirmationResult,
  otpCode: string
) {
  try {
    console.log('🔍 驗證 OTP:', otpCode);

    // Firebase 自動驗證 OTP
    const result = await confirmationResult.confirm(otpCode);

    console.log('✅ OTP 驗證成功');

    // result.user 現在同時擁有 OAuth Provider 和 Phone Provider
    // 例如：
    // providerData: [
    //   { providerId: 'google.com', ... },
    //   { providerId: 'phone', phoneNumber: '+886912345678' }
    // ]

    return result.user;
  } catch (error: any) {
    console.error('❌ OTP 驗證失敗:', error);

    // 處理常見錯誤
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('驗證碼錯誤');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('驗證碼已過期，請重新發送');
    }

    throw error;
  }
}

/**
 * 清理 reCAPTCHA 實例
 *
 * @param recaptchaVerifier - 要清理的 reCAPTCHA 驗證器
 */
export function cleanupRecaptcha(recaptchaVerifier: RecaptchaVerifier | null) {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
  }
}
