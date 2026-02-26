import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ChartErrorStateProps {
  error?: unknown;
  resetErrorBoundary?: () => void;
}

export default function ChartErrorState({
  error,
  resetErrorBoundary
}: ChartErrorStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          Temperature Data Error
        </CardTitle>
        <CardDescription>
          Unable to load temperature data for this process
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-[200px] flex-col items-center justify-center gap-4 text-center">
          <div className="text-gray-600">
            {error instanceof Error ? error.message : 'An unexpected error occurred while loading the chart data.'}
          </div>
          {resetErrorBoundary && (
            <button
              onClick={resetErrorBoundary}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}