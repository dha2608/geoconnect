import { Component } from 'react';

export default class SectionErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.name || 'Section'}] Error:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-accent-danger/10 border border-accent-danger/20 flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p className="text-sm font-medium text-txt-primary mb-1">
            {this.props.name || 'This section'} encountered an error
          </p>
          <p className="text-xs text-txt-muted mb-3">
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
