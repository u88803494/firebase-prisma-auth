// Firebase Auth Helper - 後端 Token 驗證
// 使用 Firebase REST API（臨時方案，直到 Admin SDK 可用）

interface FirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  providerData: Array<{
    providerId: string;
    uid: string;
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }>;
}

interface VerifyTokenResponse {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
}

/**
 * 使用 Firebase REST API 驗證 ID Token
 *
 * 注意：這是臨時方案，正式環境應使用 Firebase Admin SDK
 * 詳見：docs/ISSUES.md #1
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<VerifyTokenResponse> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!apiKey) {
      throw new Error('Firebase API key not configured');
    }

    // 使用 Firebase Auth REST API 驗證 token
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || 'Token verification failed',
      };
    }

    // 取得用戶資料
    const userData = data.users?.[0];
    if (!userData) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    // 轉換為標準格式
    const user: FirebaseUser = {
      uid: userData.localId,
      email: userData.email || '',
      emailVerified: userData.emailVerified || false,
      displayName: userData.displayName,
      photoURL: userData.photoUrl,
      phoneNumber: userData.phoneNumber,
      // 將 REST API 的 providerUserInfo 轉換為標準 providerData 格式
      // REST API 使用 federatedId，需要映射為 uid
      providerData: (userData.providerUserInfo || []).map((provider: any) => ({
        providerId: provider.providerId,
        uid: provider.federatedId, // 關鍵：REST API 的 federatedId → 標準的 uid
        displayName: provider.displayName,
        email: provider.email,
        phoneNumber: provider.phoneNumber,
        photoURL: provider.photoUrl,
      })),
    };

    return {
      success: true,
      user,
    };
  } catch (error) {
    console.error('Token verification error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 從 providerData 中取得 OAuth Provider ID
 */
export function getOAuthProviderId(user: FirebaseUser): string | null {
  const oauthProviders = ['google.com', 'facebook.com', 'line.com'];

  const provider = user.providerData.find((p) =>
    oauthProviders.includes(p.providerId)
  );

  return provider?.uid || null;
}

/**
 * 從 providerData 中取得 Provider 類型
 */
export function getProviderType(user: FirebaseUser): string | null {
  const provider = user.providerData.find((p) =>
    ['google.com', 'facebook.com', 'line.com'].includes(p.providerId)
  );

  return provider?.providerId || null;
}
