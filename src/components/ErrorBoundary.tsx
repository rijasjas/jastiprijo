import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Clear error state and reload
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  handleRetry = () => {
    // Just clear error state to retry rendering
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Terjadi Kesalahan</AlertTitle>
              <AlertDescription>
                Aplikasi mengalami error yang tidak terduga. Silakan coba refresh halaman atau hubungi support jika masalah berlanjut.
              </AlertDescription>
            </Alert>
            
            {/* Error details for development */}
            {import.meta.env.DEV && this.state.error && (
              <Alert>
                <AlertTitle>Error Details (Development Only)</AlertTitle>
                <AlertDescription>
                  <pre className="text-xs overflow-auto max-h-40 mt-2 p-2 bg-muted rounded">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex space-x-2">
              <Button onClick={this.handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
              <Button onClick={this.handleReload} className="flex-1">
                Refresh Halaman
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;



