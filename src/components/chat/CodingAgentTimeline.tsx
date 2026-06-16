import * as React from "react";
import { CheckCircle2, Loader2, AlertCircle, Circle } from "lucide-react";
import type { CodingStep } from "@/types/coding-agent";

interface CodingAgentTimelineProps {
  steps: CodingStep[];
}

export function CodingAgentTimeline({ steps }: CodingAgentTimelineProps) {
  const getStepIcon = (step: CodingStep) => {
    switch (step.status) {
      case "done":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "active":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-amber-500" />
        <span className="text-sm font-semibold text-foreground">
          Timeline de Construcción
        </span>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex gap-3 items-start ${
              index !== steps.length - 1
                ? "pb-4 border-l-2 border-gray-200 dark:border-gray-800 ml-[10px] pl-3"
                : ""
            }`}
          >
            <div className="mt-1 flex-shrink-0">{getStepIcon(step)}</div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium ${
                  step.status === "done"
                    ? "text-green-600 dark:text-green-400"
                    : step.status === "active"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {step.label}
              </p>
              {step.duration && step.status === "done" && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {step.duration}s
                </p>
              )}
              {step.details && step.details.length > 0 && step.status !== "pending" && (
                <div className="mt-2 space-y-1 pl-4">
                  {step.details.map((detail, i) => (
                    <p
                      key={i}
                      className="text-xs text-gray-600 dark:text-gray-400 font-mono"
                    >
                      {detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
