import { Button } from "@/components/ui/button";
import { Sparkles, Camera, Wand2, Image } from "lucide-react";

interface AiStudioSectionProps {
  modalOpen?: boolean;
  setModalOpen?: (open: boolean) => void;
}

export default function AiStudioSection({ modalOpen, setModalOpen }: AiStudioSectionProps) {
  const handleOpenStudio = () => {
    setModalOpen?.(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full">
          <Sparkles className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">AI Studio</h2>
          <p className="text-muted-foreground">
            Create stunning AI-generated fashion content and virtual try-on experiences
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl border bg-card space-y-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold">Virtual Try-On</h3>
              <p className="text-sm text-muted-foreground">See how outfits look on you with AI</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Wand2 className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-semibold">Style Generation</h3>
              <p className="text-sm text-muted-foreground">Generate new outfit combinations</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border bg-card space-y-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Image className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold">Image Enhancement</h3>
              <p className="text-sm text-muted-foreground">Enhance your fashion photos with AI</p>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Button 
          size="lg"
          onClick={handleOpenStudio}
          className="px-8"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Open AI Studio
        </Button>
      </div>
    </div>
  );
}