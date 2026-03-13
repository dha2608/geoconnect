import { useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';

/** Map tile layers that trigger light glass theme */
const LIGHT_TILES = new Set(['street', 'light', 'satellite']);

export function ToastProvider() {
  const tileLayer = useSelector((state) => state.map.tileLayer);
  const isLight = LIGHT_TILES.has(tileLayer);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: isLight ? 'rgba(255, 255, 255, 0.82)' : 'rgba(15, 21, 32, 0.9)',
          backdropFilter: 'blur(20px)',
          color: isLight ? '#1a1a2e' : '#f1f5f9',
          border: isLight ? '1px solid rgba(255, 255, 255, 0.45)' : '1px solid rgba(59, 130, 246, 0.12)',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: isLight
            ? '0 4px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)'
            : '0 4px 16px rgba(0,0,0,0.3)',
          transition: 'background 0.35s ease, color 0.35s ease, border-color 0.35s ease',
        },
        success: { iconTheme: { primary: '#10b981', secondary: isLight ? '#1a1a2e' : '#f1f5f9' } },
        error: { iconTheme: { primary: '#ef4444', secondary: isLight ? '#1a1a2e' : '#f1f5f9' } },
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
