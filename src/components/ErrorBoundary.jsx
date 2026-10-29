import React from "react";
import { Button } from "@/components/ui/button";
import i18next from "i18next";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <span className="text-3xl">!</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {i18next.t("component.errorBoundary.ui.somethingWentWrong")}
            </h1>
            <p className="text-muted-foreground text-sm">
              {this.state.error?.message || i18next.t("common.ui.unexpectedError")}
            </p>
            <Button onClick={this.handleReset}>
              {i18next.t("component.errorBoundary.ui.tryAgain")}
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
