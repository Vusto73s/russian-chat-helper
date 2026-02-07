import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  chartIndex: number;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`Chart ${this.props.chartIndex + 1} error:`, error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card">
          <AlertTriangle className="h-8 w-8 text-yellow-500" />
          <p className="text-sm text-muted-foreground">
            График {this.props.chartIndex + 1} — ошибка отображения
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Восстановить
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
