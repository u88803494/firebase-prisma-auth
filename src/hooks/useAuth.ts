import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  verifyToken,
  loginWithPhone,
  loginWithEmail,
  verifyOAuthToken,
  logout as apiLogout,
  getToken,
} from '@/lib/api/auth';
import { queryKeys } from '@/lib/queryClient';
import type { JWTPayload } from '@/lib/jwt';

/**
 * useAuth Hook
 *
 * 提供認證狀態和用戶資訊
 * 使用 TanStack Query 自動管理快取和重新驗證
 *
 * @example
 * const { user, isLoading, isAuthenticated } = useAuth();
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (!isAuthenticated) return <LoginPage />;
 * return <div>歡迎，{user.email}</div>;
 */
export function useAuth() {
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery<JWTPayload>({
    queryKey: queryKeys.auth.user,
    queryFn: verifyToken,
    // 只有當 localStorage 有 token 時才執行查詢
    enabled: typeof window !== 'undefined' && !!getToken(),
    // Token 驗證失敗時不重試
    retry: false,
    // 5 分鐘內視為新鮮資料
    staleTime: 1000 * 60 * 5,
  });

  return {
    user: user ?? null,
    isLoading,
    isError,
    error,
    isAuthenticated: !!user && !isError,
  };
}

/**
 * useLoginWithPhone Hook
 *
 * 手機號碼 + 密碼登入
 *
 * @example
 * const { mutate: login, isPending } = useLoginWithPhone();
 *
 * const handleSubmit = () => {
 *   login(
 *     { phoneNumber: '+886912345678', password: '123456' },
 *     {
 *       onSuccess: () => router.push('/dashboard'),
 *       onError: (error) => setError(error.message),
 *     }
 *   );
 * };
 */
export function useLoginWithPhone() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ phoneNumber, password }: { phoneNumber: string; password: string }) =>
      loginWithPhone(phoneNumber, password),
    onSuccess: (data) => {
      // 更新 React Query cache
      queryClient.setQueryData(queryKeys.auth.user, data.user);
      // 預取資料，確保快取是最新的
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * useLoginWithEmail Hook
 *
 * Email + 密碼登入
 *
 * @example
 * const { mutate: login, isPending } = useLoginWithEmail();
 *
 * const handleSubmit = () => {
 *   login(
 *     { email: 'user@example.com', password: '123456' },
 *     {
 *       onSuccess: () => router.push('/dashboard'),
 *       onError: (error) => setError(error.message),
 *     }
 *   );
 * };
 */
export function useLoginWithEmail() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginWithEmail(email, password),
    onSuccess: (data) => {
      // 更新 React Query cache
      queryClient.setQueryData(queryKeys.auth.user, data.user);
      // 預取資料，確保快取是最新的
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * useVerifyOAuthToken Hook
 *
 * 驗證 OAuth Token（雙層 JWT 架構）
 *
 * @example
 * const { mutate: verifyToken, isPending } = useVerifyOAuthToken();
 *
 * // OAuth 登入成功後
 * const handleOAuthSuccess = async (user: FirebaseUser) => {
 *   const idToken = await user.getIdToken();
 *   verifyToken(
 *     { idToken },
 *     {
 *       onSuccess: (data) => {
 *         if (data.isNewUser) {
 *           router.push('/register/complete');
 *         } else {
 *           router.push('/dashboard');
 *         }
 *       },
 *     }
 *   );
 * };
 */
export function useVerifyOAuthToken() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ idToken }: { idToken: string }) => verifyOAuthToken(idToken),
    onSuccess: (data) => {
      // 更新 React Query cache
      queryClient.setQueryData(queryKeys.auth.user, data.user);
      // 預取資料，確保快取是最新的
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.user });
    },
  });
}

/**
 * useLogout Hook
 *
 * 登出功能
 *
 * @example
 * const { mutate: logout } = useLogout();
 *
 * const handleLogout = () => {
 *   logout(undefined, {
 *     onSuccess: () => router.push('/login'),
 *   });
 * };
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: apiLogout,
    onSuccess: () => {
      // 清除所有認證相關的快取
      queryClient.removeQueries({ queryKey: queryKeys.auth.user });
      queryClient.clear();
    },
  });
}

/**
 * useRequireAuth Hook
 *
 * 保護需要登入的頁面
 * 若未登入則自動導向登入頁
 *
 * @example
 * export default function DashboardPage() {
 *   const { user, isLoading } = useRequireAuth();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *
 *   return <div>歡迎，{user.email}</div>;
 * }
 */
export function useRequireAuth() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  // 若未登入且載入完成，導向登入頁
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
