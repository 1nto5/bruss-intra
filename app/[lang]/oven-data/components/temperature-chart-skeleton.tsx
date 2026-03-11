import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dictionary } from "../lib/dict";

interface TemperatureChartSkeletonProps {
  dict: Dictionary;
}

export default function TemperatureChartSkeleton({
  dict,
}: TemperatureChartSkeletonProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.temperatureChart.title}</CardTitle>
        <CardDescription>
          <span className="text-muted-foreground">
            {dict.temperatureChart.loadingData}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[500px] w-full" />
      </CardContent>
    </Card>
  );
}
