import { Component } from "react";

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("UI error:", error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <p className="mb-4">Something went wrong. Please refresh the page.</p>
          <a href="/" className="text-green-700 underline">Back to dashboard</a>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;