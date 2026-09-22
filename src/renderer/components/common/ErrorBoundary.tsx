import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 rounded-lg bg-surface border border-hairline text-ink">
          <div className="w-12 h-12 rounded-full bg-accent-red-soft flex items-center justify-center mb-4 text-accent-red">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-medium mb-2">{this.props.fallbackTitle || 'Something went wrong'}</h2>
          <p className="text-sm text-mute max-w-md text-center mb-4">
            An unexpected error occurred while rendering this section.
          </p>
          {this.state.error && (
            <div className="bg-canvas border border-hairline p-3 rounded-md mb-6 max-w-lg w-full text-xs font-mono text-ash overflow-x-auto">
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-primary text-primary-text hover:bg-primary-pressed px-4 py-2 rounded-md font-medium text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
