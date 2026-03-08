import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON error response to extract message
    try {
      const errorData = JSON.parse(text);
      if (errorData.message) {
        throw new Error(errorData.message);
      }
      // If JSON but no message, use the whole text
      throw new Error(text);
    } catch (e) {
      // If JSON parsing fails, check if it's already a simple message
      if (typeof e === 'object' && e instanceof SyntaxError) {
        // Not JSON, use text as is
        throw new Error(text);
      }
      // Re-throw if it's our custom error with message
      throw e;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const authQueryFn = getQueryFn({ on401: "returnNull" });

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30 * 1000,
      retry: (failureCount) => failureCount < 3,
    },
    mutations: {
      retry: false,
    },
  },
});
