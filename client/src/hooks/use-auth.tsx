import { useQuery } from "@tanstack/react-query";
import { authQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['/api/auth/me'],
    queryFn: authQueryFn,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch,
  };
}
