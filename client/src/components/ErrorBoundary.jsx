import { Component } from 'react';

// Detect chunk/module load failures (stale deployments, network issues)
function isChunkLoadError(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Loading chunk') ||
    msg.includes('Loading CSS chunk') ||
    error.name === 'ChunkLoadError'
  );
}

const RELOAD_KEY = 'geoconnect_chunk_reload';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);

    // Auto-reload once on chunk load failure (stale deployment)
    if (isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem(RELOAD_KEY);
      const now = Date.now();
      // Only auto-reload if we haven't reloaded in the last 10 seconds
      if (!lastReload || now - Number(lastReload) > 10000) {
        sessionStorage.setItem(RELOAD_KEY, String(now));
        window.location.reload();
        return;
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showStack: false });
  };

  toggleStack = () => {
    this.setState((prev) => ({ showStack: !prev.showStack }));
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, showStack } = this.state;
      const isDev = import.meta.env.DEV;
      const isChunk = isChunkLoadError(error);

      return (
        <div
          className="h-screen w-screen flex items-center justify-center overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          {/* Aurora background */}
          <div className="aurora-bg" />

          {/* Glass card */}
          <div
            className="glass relative z-10 w-full max-w-lg mx-4 rounded-2xl p-8 flex flex-col items-center gap-6 shadow-2xl"
          >
            {/* Warning icon */}
            <div
              className="flex items-center justify-center w-20 h-20 rounded-full bg-accent-warning/12 border border-accent-warning/35"
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="text-accent-warning"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="currentColor"
                  fillOpacity="0.08"
                />
                <line
                  x1="12" y1="9" x2="12" y2="13"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="currentColor" />
              </svg>
            </div>

            {/* Heading */}
            <div className="text-center">
              <h1 className="text-2xl font-heading font-bold mb-2 text-txt-primary tracking-tight">
                {isChunk ? 'App Updated' : 'Something went wrong'}
              </h1>
              <p className="text-sm font-body leading-relaxed text-txt-secondary">
                {isChunk
                  ? 'A new version is available. Please reload to get the latest updates.'
                  : error?.message || 'An unexpected error occurred. Please try again or return home.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={isChunk ? () => window.location.reload() : this.handleReset}
                className="flex-1 py-2.5 px-5 rounded-xl font-body font-semibold text-sm text-white transition-all duration-200 hover:brightness-110 active:scale-95 bg-gradient-to-r from-accent-primary to-accent-violet shadow-lg shadow-accent-violet/25"
              >
                {isChunk ? 'Reload Now' : 'Try Again'}
              </button>
              {!isChunk && (
                <a
                  href="/"
                  className="flex-1 py-2.5 px-5 rounded-xl font-body font-semibold text-sm text-center text-txt-secondary transition-all duration-200 hover:brightness-110 active:scale-95 bg-accent-violet/10 border border-accent-violet/25"
                >
                  Go Home
                </a>
              )}
            </div>

            {/* Dev-only: collapsible stack trace */}
            {isDev && (error || errorInfo) && (
              <div className="w-full">
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-2 text-xs mb-2 transition-colors duration-150 text-txt-secondary font-body"
                >
                  <svg
                    width="12" height="12" viewBox="0 0 24 24" fill="none"
                    style={{
                      transform: showStack ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <polyline
                      points="9 18 15 12 9 6"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                  {showStack ? 'Hide' : 'Show'} error details (dev only)
                </button>

                {showStack && (
                  <div
                    className="rounded-xl p-4 overflow-auto max-h-52 text-xs font-mono leading-relaxed bg-base/85 border border-accent-violet/12 text-accent-danger"
                  >
                    {error && (
                      <p className="mb-2 font-semibold text-accent-danger/80">
                        {error.toString()}
                      </p>
                    )}
                    {errorInfo?.componentStack && (
                      <pre className="whitespace-pre-wrap break-words text-txt-secondary">
                        {errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
