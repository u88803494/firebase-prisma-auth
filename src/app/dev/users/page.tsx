'use client';

import { useEffect, useState } from 'react';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 載入用戶列表
  const loadUsers = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/dev/delete-user');
      const data = await res.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setMessage({ type: 'error', text: data.error || '載入失敗' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '載入失敗' });
    } finally {
      setLoading(false);
    }
  };

  // 刪除所有用戶
  const handleDeleteAll = async () => {
    if (!confirm('確定要刪除所有用戶嗎？')) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/dev/delete-user?all=true', {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setUsers([]);
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.error || '刪除失敗' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '刪除失敗' });
    } finally {
      setLoading(false);
    }
  };

  // 刪除特定用戶
  const handleDeleteUser = async (email: string) => {
    if (!confirm(`確定要刪除用戶 ${email} 嗎？`)) return;

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dev/delete-user?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setUsers(users.filter(u => u.email !== email));
        setMessage({ type: 'success', text: '用戶已刪除' });
      } else {
        setMessage({ type: 'error', text: data.error || '刪除失敗' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '刪除失敗' });
    } finally {
      setLoading(false);
    }
  };

  // 初始載入
  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">用戶管理</h1>
          <p className="text-gray-600">查看和管理系統中的所有用戶</p>
        </div>

        {/* 操作按鈕 */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>載入中...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>重新載入</span>
              </>
            )}
          </button>

          <button
            onClick={handleDeleteAll}
            disabled={loading || users.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span>🗑️</span>
            <span>刪除所有用戶</span>
          </button>
        </div>

        {/* 警告提示 */}
        <div className="mb-6 p-4 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <p className="font-semibold mb-1">刪除功能說明</p>
              <p className="text-sm mb-2">
                <strong>本頁面刪除：</strong>僅移除 Prisma 資料庫中的用戶記錄
              </p>
              <p className="text-sm">
                <strong>注意：</strong>在{' '}
                <a
                  href="https://console.firebase.google.com/project/your-firebase-project-id/authentication/users"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900 font-medium"
                >
                  Firebase Console
                </a>{' '}
                刪除用戶後，需要手動在此頁面刪除對應的資料庫記錄。
              </p>
            </div>
          </div>
        </div>

        {/* 訊息提示 */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 用戶列表 */}
        {users.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      電話號碼
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      顯示名稱
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      驗證狀態
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      建立時間
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                        #{user.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.phoneNumber || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {user.displayName || <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {user.googleId && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                              Google
                            </span>
                          )}
                          {user.facebookId && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              Facebook
                            </span>
                          )}
                          {user.lineId && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              LINE
                            </span>
                          )}
                          {!user.googleId && !user.facebookId && !user.lineId && (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {user.emailVerified && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              ✓ Email
                            </span>
                          )}
                          {user.phoneVerified && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              ✓ Phone
                            </span>
                          )}
                          {!user.emailVerified && !user.phoneVerified && (
                            <span className="text-gray-400">未驗證</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleString('zh-TW')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleDeleteUser(user.email)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">👤</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">目前沒有用戶</h3>
              <p className="text-gray-600">系統中尚未有任何用戶資料</p>
            </div>
          </div>
        )}

        {/* 統計資訊 */}
        {users.length > 0 && (
          <div className="mt-6 text-sm text-gray-600">
            共 {users.length} 位用戶
          </div>
        )}
      </div>
    </div>
  );
}
