import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 text-center">
          <div className="max-w-md w-full bg-surface border border-border p-8 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertOctagon size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-primary mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-primary/60 mb-6 font-sans">
              An unexpected error occurred. We have logged the error details. Please reload the application.
            </p>
            {this.state.error && (
              <div className="bg-background border border-border text-left p-4 rounded-md mb-6 overflow-auto max-h-32 text-xs font-mono text-danger">
                {this.state.error.toString()}
              </div>
            )}
            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-surface font-medium py-2.5 px-4 rounded-md transition-all active:scale-[0.98] select-none"
            >
              <RotateCcw size={16} />
              Reset & Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
