import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DialogProvider } from '@/shared/components/Dialog.jsx';
import { ToastHost, toast } from '@/shared/components/Toast.jsx';

/**
 * Every mutation reports its outcome with a toast:
 * - success: `meta.success` (string, or a function of the result); no toast when absent.
 * - failure: the error message, unless `meta.silentError` is set.
 */
const mutationCache = new MutationCache({
  onSuccess: (data, vars, _ctx, mutation) => {
    const msg = mutation.meta?.success;
    const text = typeof msg === 'function' ? msg(data, vars) : msg;
    if (text) toast(text, { type: 'ok' });
  },
  onError: (error, _vars, _ctx, mutation) => {
    if (mutation.meta?.silentError) return;
    toast(error?.message || 'Thao tác thất bại, vui lòng thử lại', { type: 'error' });
  },
});

const queryClient = new QueryClient({
  mutationCache,
  defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: 1 } },
});

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        {children}
        <ToastHost />
      </DialogProvider>
    </QueryClientProvider>
  );
}
