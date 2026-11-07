import React, { useEffect } from "react";
import { useLocation, useRouteError } from "react-router-dom";
import ErrorFallback from "@/components/ErrorFallback";
import { reportRenderError } from "@/lib/report-render-error";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    reportRenderError(error, errorInfo.componentStack);
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      this.handleReset();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleReset}
          isFullScreen={this.props.isFullScreen}
        />
      );
    }
    return this.props.children;
  }
}

export const RouteErrorBoundary = ({ isFullScreen, children }) => {
  const { pathname } = useLocation();
  return (
    <ErrorBoundary resetKey={pathname} isFullScreen={isFullScreen}>
      {children}
    </ErrorBoundary>
  );
};

export const RouteErrorPage = () => {
  const error = useRouteError();

  useEffect(() => {
    reportRenderError(error);
  }, [error]);

  return <ErrorFallback error={error} isFullScreen />;
};
