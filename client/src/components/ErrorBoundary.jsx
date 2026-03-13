import { Component } from 'react';

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
              className="flex items-center justify-center w-20 h-20 rounded-full"
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1.5px solid rgba(245,158,11,0.35)',
              }}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                  stroke="#f59e0b"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="rgba(245,158,11,0.08)"
                />
                <line
                  x1="12"
                  y1="9"
                  x2="12"
                  y2="13"
                  stroke="#f59e0b"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="17" r="1" fill="#f59e0b" />
              </svg>
            </div>

            {/* Heading */}
            <div className="text-center">
              <h1
                className="text-2xl font-bold mb-2"
                style={{
                  fontFamily: 'Syne, sans-serif',
                  color: '#f1f5f9',
                  letterSpacing: '-0.01em',
                }}
              >
                Something went wrong
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: 'DM Sans, sans-serif', color: '#94a3b8' }}
              >
                {error?.message
                  ? error.message
                  : 'An unexpected error occurred. Please try again or return home.'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-5 rounded-xl font-semibold text-sm transition-all duration-200 hover:brightness-110 active:scale-95"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                  color: '#f1f5f9',
                  boxShadow: '0 0 18px rgba(59,130,246,0.28)',
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                className="flex-1 py-2.5 px-5 rounded-xl font-semibold text-sm text-center transition-all duration-200 hover:brightness-110 active:scale-95"
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  background: 'rgba(59,130,246,0.10)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  color: '#94a3b8',
                }}
              >
                Go Home
              </a>
            </div>

            {/* Dev-only: collapsible stack trace */}
            {isDev && (error || errorInfo) && (
              <div className="w-full">
                <button
                  onClick={this.toggleStack}
                  className="flex items-center gap-2 text-xs mb-2 transition-colors duration-150"
                  style={{ color: '#94a3b8', fontFamily: 'DM Sans, sans-serif' }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    style={{
                      transform: showStack ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <polyline
                      points="9 18 15 12 9 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {showStack ? 'Hide' : 'Show'} error details (dev only)
                </button>

                {showStack && (
                  <div
                    className="rounded-xl p-4 overflow-auto max-h-52 text-xs leading-relaxed"
                    style={{
                      background: 'rgba(8,11,18,0.85)',
                      border: '1px solid rgba(59,130,246,0.12)',
                      fontFamily: 'monospace',
                      color: '#f87171',
                    }}
                  >
                    {error && (
                      <p className="mb-2 font-semibold" style={{ color: '#fca5a5' }}>
                        {error.toString()}
                      </p>
                    )}
                    {errorInfo?.componentStack && (
                      <pre className="whitespace-pre-wrap break-words" style={{ color: '#94a3b8' }}>
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
