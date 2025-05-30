
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusIndicator } from './StatusIndicator';
import type { DiagnosticStatus } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  iconName: keyof typeof LucideIcons;
  status?: DiagnosticStatus;
  isLoading?: boolean;
}

export function MetricCard({ title, value, unit, iconName, status, isLoading = false }: MetricCardProps) {
  const IconComponent = LucideIcons[iconName] as LucideIcon;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {IconComponent && <IconComponent className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/5 mb-2" /> 
            <Skeleton className="h-4 w-1/3" />
          </>
        ) : (
          <>
            <div className="text-2xl md:text-3xl font-bold text-foreground">
              {value}
              {unit && <span className="text-lg md:text-xl text-muted-foreground ml-1">{unit}</span>}
            </div>
            {status && (
            <div className="mt-1 md:mt-2">
                <StatusIndicator status={status} />
            </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
