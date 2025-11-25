import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-6xl w-full">
        {/* 標題區 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            🔐 Firebase Auth POC
          </h1>
          <p className="text-gray-600 text-lg">
            Firebase Authentication 整合測試系統
          </p>
        </div>

        {/* 功能卡片區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 登入 */}
          <Link
            href="/login"
            className="block p-6 bg-white border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-3">🔑</div>
            <h2 className="text-2xl font-bold mb-2 text-blue-600">登入</h2>
            <p className="text-gray-600">
              使用 OAuth（Google/Facebook/LINE）或手機號碼登入
            </p>
          </Link>

          {/* 註冊 */}
          <Link
            href="/register/manual"
            className="block p-6 bg-white border-2 border-green-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-3">📝</div>
            <h2 className="text-2xl font-bold mb-2 text-green-600">註冊</h2>
            <p className="text-gray-600">
              使用手機號碼註冊新帳號（OTP 驗證）
            </p>
          </Link>

          {/* 忘記密碼 */}
          <Link
            href="/forgot-password"
            className="block p-6 bg-white border-2 border-orange-200 rounded-xl hover:border-orange-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-3">🔓</div>
            <h2 className="text-2xl font-bold mb-2 text-orange-600">忘記密碼</h2>
            <p className="text-gray-600">
              透過手機號碼驗證重設密碼
            </p>
          </Link>

          {/* Dashboard */}
          <Link
            href="/dashboard"
            className="block p-6 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-3">📊</div>
            <h2 className="text-2xl font-bold mb-2 text-purple-600">Dashboard</h2>
            <p className="text-gray-600">
              查看個人資料和帳號資訊（需登入）
            </p>
          </Link>

          {/* 用戶管理 */}
          <Link
            href="/dev/users"
            className="block p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-3">👥</div>
            <h2 className="text-2xl font-bold mb-2 text-gray-600">用戶管理</h2>
            <p className="text-gray-600">
              開發用：查看和管理所有用戶資料
            </p>
          </Link>

          {/* OAuth 完成註冊 */}
          <Link
            href="/register/complete"
            className="block p-6 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-500 hover:shadow-lg transition-all"
          >
            <div className="text-4xl mb-3">✨</div>
            <h2 className="text-2xl font-bold mb-2 text-indigo-600">OAuth 註冊</h2>
            <p className="text-gray-600">
              完成 OAuth 登入後的註冊流程
            </p>
          </Link>
        </div>

        {/* 說明區 */}
        <div className="mt-12 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="text-lg font-bold mb-3 text-blue-900">📖 功能說明</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>OAuth 登入</strong>：支援 Google、Facebook、LINE</li>
            <li>✅ <strong>手機註冊</strong>：使用 Firebase Phone Auth（OTP 驗證）</li>
            <li>✅ <strong>密碼登入</strong>：手機號碼 + 密碼登入</li>
            <li>✅ <strong>密碼重設</strong>：透過 OTP 驗證重設密碼</li>
            <li>✅ <strong>混合架構</strong>：OAuth 用戶也可設定密碼</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
