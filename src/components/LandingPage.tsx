import { Upload, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRef } from "react";
import { toast } from "sonner";

interface LandingPageProps {
  onFolderSelect: (files: File[]) => void;
}

export const LandingPage = ({ onFolderSelect }: LandingPageProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(file =>
      file.type.startsWith("image/")
    );

    if (files.length > 0) {
      onFolderSelect(files);
    } else {
      toast.error("No image files found in selection");
    }
  };

  const handleFolderClick = async () => {
    try {
      // Try File System Access API first (works in standalone browser, not in iframes)
      if ('showDirectoryPicker' in window) {
        // @ts-ignore - File System Access API
        const dirHandle = await window.showDirectoryPicker();
        const files: File[] = [];

        for await (const entry of dirHandle.values()) {
          if (entry.kind === "file") {
            const file = await entry.getFile();
            if (file.type.startsWith("image/")) {
              files.push(file);
            }
          }
        }

        if (files.length > 0) {
          onFolderSelect(files);
        } else {
          toast.error("No image files found in folder");
        }
      } else {
        // Fallback to file input
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      // If user cancels or API not available in iframe, use fallback
      if (err.name === "SecurityError" || err.name === "AbortError") {
        toast.info("Using file picker instead (multiple files selection)");
        fileInputRef.current?.click();
      } else {
        console.error("Error selecting folder:", err);
        toast.error("Error selecting folder");
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items);
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === "file") {
        // @ts-ignore - File System Access API
        const entry = await item.getAsFileSystemHandle?.();
        if (entry && entry.kind === "directory") {
          // @ts-ignore
          for await (const fileEntry of entry.values()) {
            if (fileEntry.kind === "file") {
              const file = await fileEntry.getFile();
              if (file.type.startsWith("image/")) {
                files.push(file);
              }
            }
          }
        } else if (item.kind === "file") {
          // Fallback for browsers that don't support getAsFileSystemHandle
          const file = item.getAsFile();
          if (file && file.type.startsWith("image/")) {
            files.push(file);
          }
        }
      }
    }

    if (files.length > 0) {
      onFolderSelect(files);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-secondary relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as any)}
      />
      {/* ZARDOY Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-[20rem] font-bold italic text-white opacity-[0.03] select-none tracking-wider" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
          ZARDOY
        </div>
      </div>
      <Card className="max-w-2xl w-full p-12 text-center border-2 border-dashed border-border hover:border-primary/50 transition-colors relative z-10">
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="space-y-8"
        >
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Upload className="w-10 h-10 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground">
              Sprite Animation Viewer
            </h1>
            <p className="text-lg text-muted-foreground">
              Load your sprite sequence and preview animations with full control
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Drag and drop a folder here or
            </p>
            <Button
              onClick={handleFolderClick}
              size="lg"
              className="gap-2 font-semibold"
            >
              <FolderOpen className="w-5 h-5" />
              Select Files
            </Button>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-sm text-accent flex items-center justify-center gap-2">
              <span className="font-semibold">💡 Tip:</span>
              <span className="text-muted-foreground">
                You can use this for side-by-side comparing with different sprites or settings
              </span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
