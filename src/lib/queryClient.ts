import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query Client 配置
 *
 * 全域設定：
 * - staleTime: 5 分鐘（資料被視為新鮮的時間）
 * - cacheTime: 10 分鐘（快取保留時間）
 * - retry: 失敗後重試 1 次
 * - refetchOnWindowFocus: 視窗重新聚焦時自動重新取得資料
 */

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 資料保持新鮮的時間（毫秒）
      staleTime: 1000 * 60 * 5, // 5 分鐘

      // 快取資料保留時間（毫秒）
      gcTime: 1000 * 60 * 10, // 10 分鐘（舊版 cacheTime）

      // 失敗後重試次數
      retry: 1,

      // 視窗重新聚焦時重新取得資料
      refetchOnWindowFocus: true,

      // 視窗重新連線時重新取得資料
      refetchOnReconnect: true,

      // 元件掛載時重新取得資料（若資料已過期）
      refetchOnMount: true,
    },
    mutations: {
      // Mutation 失敗後重試次數
      retry: 0,
    },
  },
});

/**
 * Query Keys 集中管理
 *
 * 統一管理所有 Query 的 key，方便維護和避免重複
 */
export const queryKeys = {
  // 認證相關
  auth: {
    // 當前用戶資訊
    user: ['auth', 'user'] as const,
    // Token 驗證
    verify: ['auth', 'verify'] as const,
  },
  // 可以擴充其他功能的 query keys
  // user: {
  //   profile: (uid: string) => ['user', 'profile', uid] as const,
  // },
} as const;
