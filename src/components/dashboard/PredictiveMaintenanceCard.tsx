
'use client';

import type { DiagnosticStatus } from '@/lib/types';
import { DiagnosticStatus as DS } from '@/lib/types'; // Import enum for value access
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, TriangleAlert } from 'lucide-react';

interface PredictiveMaintenanceCardProps {
  systemStatus: DiagnosticStatus;
}

const RECOMMENDATIONS: Record<DiagnosticStatus, { title: string; tips: string[]; icon?: React.ElementType }> = {
  [DS.CRITICAL]: {
    title: "Critical Alert - Action Required!",
    tips: [
      "System status is CRITICAL. Immediate attention is required.",
      "If riding, pull over safely as soon as possible.",
      "Check critical components like engine, brakes, and tire pressure.",
      "Consult a qualified mechanic before further use.",
    ],
    icon: TriangleAlert,
  },
  [DS.WARNING]: {
    title: "Warning - Check Soon",
    tips: [
      "System status is WARNING. Potential issues detected.",
      "Monitor the motorcycle's performance closely.",
      "Schedule a maintenance check at your earliest convenience.",
      "Refer to specific component warnings for more details.",
    ],
    icon: TriangleAlert,
  },
  [DS.NORMAL]: {
    title: "All Systems Normal",
    tips: [
      "All systems are operating normally.",
      "Continue with regular maintenance checks as scheduled.",
      "Enjoy your ride!",
    ],
  },
  [DS.UNKNOWN]: {
    title: "System Status Unknown",
    tips: [
      "The current system status is unknown.",
      "This may be due to a connection issue or data unavailability.",
      "Ensure the diagnostic tool is properly connected.",
    ],
  },
};

export function PredictiveMaintenanceCard({ systemStatus }: PredictiveMaintenanceCardProps) {
  const recommendations = RECOMMENDATIONS[systemStatus] || RECOMMENDATIONS[DS.UNKNOWN];
  const AlertIcon = recommendations.icon || Lightbulb;

  return (
    <Card className="col-span-1 lg:col-span-2 xl:col-span-full shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center">
          <Lightbulb className="h-6 w-6 mr-2 text-primary" />
          <CardTitle className="text-lg font-semibold text-foreground">System Recommendations</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {systemStatus === DS.CRITICAL || systemStatus === DS.WARNING ? (
          <Alert variant={systemStatus === DS.CRITICAL ? "destructive" : "default"} className={systemStatus === DS.WARNING ? "border-yellow-400 dark:border-yellow-600" : ""}>
            <AlertIcon className={`h-4 w-4 ${systemStatus === DS.WARNING ? "text-yellow-500" : ""}`} />
            <AlertTitle className={systemStatus === DS.WARNING ? "text-yellow-600 dark:text-yellow-400" : ""}>{recommendations.title}</AlertTitle>
            <AlertDescription>
              <ul className="space-y-2 mt-2">
                {recommendations.tips.map((tip, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <Lightbulb className="h-4 w-4 mr-2 mt-0.5 text-accent shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <h3 className="font-semibold text-md mb-2 text-foreground">{recommendations.title}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {recommendations.tips.map((tip, index) => (
                <li key={index} className="flex items-start">
                  <Lightbulb className="h-4 w-4 mr-2 mt-0.5 text-accent shrink-0" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
