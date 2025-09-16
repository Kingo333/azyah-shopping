import { Button } from "@/components/ui/button";
import { Blocks, Sparkles, Camera, Gift } from "lucide-react";

interface ToySectionProps {
  modalOpen?: boolean;
  setModalOpen?: (open: boolean) => void;
}

export default function ToySection({ modalOpen, setModalOpen }: ToySectionProps) {
  const handleOpenToyAI = () => {
    setModalOpen?.(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-full">
          <Blocks className="h-8 w-8 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Toy AI Replica</h2>
          <p className="text-muted-foreground">
            Transform fashion items into adorable AI-generated toy replicas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold">Upload Photo</h3>
              <p className="text-sm text-muted-foreground">Take or upload fashion item photos</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">AI Processing</h3>
              <p className="text-sm text-muted-foreground">Watch AI create toy versions</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Download & Share</h3>
              <p className="text-sm text-muted-foreground">Save your cute toy replicas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg"
          onClick={handleOpenToyAI}
          className="px-8"
        >
          <Blocks className="h-4 w-4 mr-2" />
          Create Toy Replica
        </Button>
      </div>
    </div>
  );
}