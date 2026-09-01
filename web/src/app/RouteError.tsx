import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

type Props = { children: ReactNode };
type State = { failed: boolean };

export class RouteError extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 32, fontFamily: "Inter, system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, letterSpacing: "-0.03em", marginBottom: 10 }}>This page failed to load</h1>
          <p style={{ color: "#5b6170", lineHeight: 1.5, marginBottom: 22 }}>Refresh, or go back to the homepage and try again.</p>
          <Link to="/" style={{ fontWeight: 700 }}>Back to home</Link>
        </div>
      </main>
    );
  }
}
