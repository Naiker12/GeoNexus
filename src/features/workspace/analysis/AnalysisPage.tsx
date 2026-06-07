import { AnalysisHeader } from "@/features/workspace/analysis/AnalysisHeader"
import { AnalysisMetrics } from "@/features/workspace/analysis/AnalysisMetrics"
import { AnalysisRunsTable } from "@/features/workspace/analysis/AnalysisRunsTable"
import { AnalysisSidePanels } from "@/features/workspace/analysis/AnalysisSidePanels"
import { TokenChart } from "@/features/workspace/analysis/TokenChart"

export function AnalysisPage() {
  return (
    <section className="relative z-10 h-[calc(100svh-3.5rem)] overflow-auto px-3 py-3 sm:px-5 sm:py-4">
      <div className="mx-auto grid w-full max-w-[110rem] gap-3">
        <AnalysisHeader />
        <AnalysisMetrics />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="grid min-w-0 gap-3">
            <TokenChart />
            <AnalysisRunsTable />
          </div>
          <AnalysisSidePanels />
        </div>
      </div>
    </section>
  )
}
