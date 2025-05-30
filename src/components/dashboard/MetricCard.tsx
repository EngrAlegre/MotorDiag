import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusIndicator } from './StatusIndicator';
import type { DiagnosticStatus } from '@/lib/types';

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
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {IconComponent && <IconComponent className="h-5 w-5 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 animate-pulse bg-muted rounded-md" />
        ) : (
          <div className="text-3xl font-bold text-foreground">
            {value}
            {unit && <span className="text-xl text-muted-foreground ml-1">{unit}</span>}
          </div>
        )}
        {status && (
          <div className="mt-2">
            <StatusIndicator status={status} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
