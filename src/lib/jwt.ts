import jwt from 'jsonwebtoken';

/**
 * JWT Payload 介面定義
 * 包含用戶的基本資訊和驗證狀態
 */
export interface JWTPayload {
  uid: string;                  // Firebase UID（全域唯一）
  email: string | null;         // 用戶 Email（LINE 用戶可能為 null）
  phoneNumber: string | null;   // 手機號碼（OAuth 用戶完成註冊前可能為 null）
  emailVerified: boolean;       // Email 驗證狀態
  phoneVerified: boolean;       // 手機驗證狀態
  displayName?: string;         // 顯示名稱（可選）
  photoURL?: string;            // 大頭照 URL（可選）
  googleId?: string;            // Google OAuth ID（可選）
  facebookId?: string;          // Facebook OAuth ID（可選）
  lineId?: string;              // LINE OAuth ID（可選）
  iat?: number;                 // Issued at（由 JWT 自動添加）
  exp?: number;                 // Expiration time（由 JWT 自動添加）
}

/**
 * 生成 JWT Token
 *
 * @param payload - 要編碼的用戶資訊
 * @returns JWT Token 字串
 *
 * @example
 * const token = generateToken({
 *   uid: 'firebase_uid_123',
 *   email: 'user@example.com',
 *   phoneNumber: '+886912345678',
 *   emailVerified: true,
 *   phoneVerified: true
 * });
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(payload, secret, {
    expiresIn: '7d',      // Token 有效期 7 天
    algorithm: 'HS256'    // 使用 HS256 演算法
  });
}

/**
 * 驗證並解碼 JWT Token
 *
 * @param token - 要驗證的 JWT Token
 * @returns 解碼後的 Payload，如驗證失敗則回傳 null
 *
 * @example
 * const payload = verifyToken(token);
 * if (payload) {
 *   console.log('User UID:', payload.uid);
 * } else {
 *   console.log('Invalid or expired token');
 * }
 */
export function verifyToken(token: string): JWTPayload | null {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256']
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Token 無效或過期
    return null;
  }
}
