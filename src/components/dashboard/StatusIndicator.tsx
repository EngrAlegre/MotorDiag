import type { DiagnosticStatus } from '@/lib/types';
import { STATUS_COLORS, STATUS_TEXT_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface StatusIndicatorProps {
  status: DiagnosticStatus;
  showText?: boolean;
}

export function StatusIndicator({ status, showText = true }: StatusIndicatorProps) {
  const dotColor = STATUS_COLORS[status] || 'bg-gray-500';
  const textColor = STATUS_TEXT_COLORS[status] || 'text-gray-300';

  return (
    <div className="flex items-center">
      <span className={cn('w-3 h-3 rounded-full mr-2 shrink-0', dotColor)} aria-hidden="true" />
      {showText && <span className={cn('text-sm font-medium', textColor)}>{status}</span>}
    </div>
  );
}
