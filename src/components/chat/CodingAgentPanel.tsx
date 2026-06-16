import * as React from "react";
import { X, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCodingAgent } from "@/contexts/CodingAgentContext";
import { CodingAgentTimeline } from "./CodingAgentTimeline";
import { CodingAgentFileExplorer } from "./CodingAgentFileExplorer";
import { CodingAgentPreview } from "./CodingAgentPreview";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CodingAgentPanel() {
  const codingAgent = useCodingAgent();
  const [activeTab, setActiveTab] = React.useState("timeline");

  const handleClose = () => {
    codingAgent.toggleCodingMode();
  };

  if (!codingAgent.state.isActive) {
    return null;
  }

  return (
    <div className="w-full min-w-[400px] max-w-[500px] border-l bg-background flex flex-col animate-in slide-in-from-right">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Coding Agent
            </h2>
            <p className="text-xs text-muted-foreground capitalize">
              {codingAgent.state.phase}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col"
      >
        <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
          <TabsTrigger value="timeline" className="text-xs">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="files" className="text-xs">
            Archivos
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="timeline"
          className="flex-1 overflow-y-auto m-0 p-0"
        >
          <CodingAgentTimeline steps={codingAgent.state.steps} />
        </TabsContent>

        <TabsContent
          value="files"
          className="flex-1 overflow-hidden m-0 p-0"
        >
          <CodingAgentFileExplorer
            files={codingAgent.state.files}
            activeFile={codingAgent.state.activeFile}
            onFileSelect={codingAgent.setActiveFile}
          />
        </TabsContent>

        <TabsContent
          value="preview"
          className="flex-1 overflow-hidden m-0 p-0"
        >
          <CodingAgentPreview
            previewUrl={codingAgent.state.previewUrl}
            activeFile={codingAgent.state.activeFile}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
