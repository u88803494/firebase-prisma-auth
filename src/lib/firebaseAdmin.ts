import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK 初始化
 *
 * 認證方式優先順序：
 * 1. Service Account Key (FIREBASE_SERVICE_ACCOUNT_KEY 環境變數)
 * 2. Application Default Credentials (ADC)
 *
 * Service Account Key 設定（推薦本地開發，不會過期）：
 * ```bash
 * # 1. 從 Firebase Console 下載 Service Account JSON
 * # 2. 設定環境變數
 * export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
 * ```
 *
 * ADC 設定（會過期，需定期重新登入）：
 * ```bash
 * gcloud auth application-default login
 * gcloud config set project your-firebase-project-id
 * ```
 */

if (!admin.apps.length) {
  // 優先使用 Service Account Key（不會過期）
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin SDK 已使用 Service Account Key 初始化');
    } catch (error) {
      console.error('❌ Service Account Key 解析失敗:', error);
      throw error;
    }
  } else {
    // 回退到 ADC
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'your-firebase-project-id',
      credential: admin.credential.applicationDefault(),
    });
    console.log('⚠️  Firebase Admin SDK 已使用 ADC 初始化（憑證可能過期）');
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin;
