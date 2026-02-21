import toast, { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'rgba(15, 21, 32, 0.9)',
          backdropFilter: 'blur(20px)',
          color: '#f1f5f9',
          border: '1px solid rgba(59, 130, 246, 0.12)',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
        },
        success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
        error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
      }}
    />
  );
}

export const showToast = {
  success: (msg) => toast.success(msg),
  error: (msg) => toast.error(msg),
  info: (msg) => toast(msg, { icon: 'ℹ️' }),
  loading: (msg) => toast.loading(msg),
  dismiss: (id) => toast.dismiss(id),
};

export default toast;
