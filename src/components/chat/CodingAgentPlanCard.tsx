import * as React from "react";
import { CheckCircle2, Edit3, FileText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CodingPlan } from "@/types/coding-agent";

interface CodingAgentPlanCardProps {
  plan: CodingPlan;
  onConfirm: () => void;
  onEdit: () => void;
}

export function CodingAgentPlanCard({
  plan,
  onConfirm,
  onEdit,
}: CodingAgentPlanCardProps) {
  return (
    <Card className="w-full max-w-xl border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">📋 Plan de construcción</CardTitle>
        </div>
        <CardDescription className="text-sm">
          {plan.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Stack:</span>
            <span className="font-medium">{plan.stack}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Tiempo:</span>
            <span className="font-medium">{plan.estimatedTime}</span>
          </div>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Archivos:</span>
          <ul className="mt-1 ml-2 list-disc space-y-1">
            {plan.files.map((file, i) => (
              <li key={i} className="font-medium">{file}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={onEdit} className="text-xs h-8">
            <Edit3 className="h-3 w-3 mr-1" />
            Modificar
          </Button>
          <Button size="sm" onClick={onConfirm} className="text-xs h-8">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Confirmar y construir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
