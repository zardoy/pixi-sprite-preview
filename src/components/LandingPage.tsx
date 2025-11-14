import { Upload, FolderOpen, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRef } from "react";
import { toast } from "sonner";
import { parseSpriteSheet, extractFramesFromAtlas, sortFramesByName, SUPPORTED_FORMATS_DISPLAY } from "@/lib/spriteSheetParser";

interface LandingPageProps {
  onFolderSelect: (files: File[]) => void;
}

export const LandingPage = ({ onFolderSelect }: LandingPageProps) => {
  const folderInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: File[]) => {
    // Check for JSON sprite sheet + atlas combination
    const jsonFile = files.find(f => f.name.endsWith('.json'));

    if (jsonFile) {
      toast.loading('Processing sprite sheet...');

      try {
        const sheetData = await parseSpriteSheet(jsonFile);

        if (sheetData && sheetData.atlasImage) {
          // Find the atlas image file
          const atlasFileName = sheetData.atlasImage.toLowerCase();
          const atlasBaseName = atlasFileName.replace(/\.(png|webp|ktx2|jpg|jpeg)$/, '');

          const atlasFile = files.find(f => {
            const fileName = f.name.toLowerCase();
            // Exact match
            if (fileName === atlasFileName) return true;
            // Base name match with any supported extension
            const fileBaseName = fileName.replace(/\.(png|webp|ktx2|jpg|jpeg)$/, '');
            return fileBaseName === atlasBaseName;
          });

          if (atlasFile) {
            toast.loading(`Extracting ${sheetData.frames.length} frames from atlas...`);

            // Sort frames by name/number
            const sortedFrames = sortFramesByName(sheetData.frames);

            // Extract frames from atlas
            const extractedFrames = await extractFramesFromAtlas(atlasFile, sortedFrames);

            toast.dismiss();
            toast.success(`Loaded ${extractedFrames.length} frames from sprite sheet`);
            onFolderSelect(extractedFrames);
            return;
          } else {
            toast.dismiss();
            toast.error(`Atlas image "${atlasFileName}" not found in files`);
            return;
          }
        }
      } catch (error) {
        toast.dismiss();
        console.error('Error processing sprite sheet:', error);
        toast.error('Failed to process sprite sheet');
        return;
      }
    }

    // Regular image files (including KTX2 which might not have proper MIME type)
    const imageFiles = files.filter(file =>
      file.type.startsWith("image/") ||
      file.name.match(/\.(png|jpg|jpeg|webp|gif|ktx2)$/i)
    );

    if (imageFiles.length > 0) {
      onFolderSelect(imageFiles);
    } else {
      toast.error("No image files found in selection");
    }
  };

  const handleFolderInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
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
            files.push(file);
          }
        }

        if (files.length > 0) {
          await processFiles(files);
        } else {
          toast.error("No files found in folder");
        }
      } else {
        // Fallback to folder input
        folderInputRef.current?.click();
      }
    } catch (err: any) {
      // If user cancels or API not available in iframe, use fallback
      if (err.name === "SecurityError" || err.name === "AbortError") {
        // User cancelled, do nothing
      } else {
        console.error("Error selecting folder:", err);
        toast.error("Error selecting folder");
      }
    }
  };

  const handleFilesClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
              files.push(file);
            }
          }
        } else {
          // Get dropped files
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
    }

    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-secondary relative">
      {/* Folder picker input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept="image/*,.json,.ktx2,.png,.webp,.jpg,.jpeg"
        onChange={handleFolderInputChange}
        className="hidden"
        {...({ webkitdirectory: "", directory: "" } as any)}
      />
      {/* File picker input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.json,.ktx2,.png,.webp,.jpg,.jpeg"
        onChange={handleFileInputChange}
        className="hidden"
      />
      {/* ZARDOY Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-[20rem] font-bold italic text-white opacity-[0.03] select-none tracking-wider" style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}>
          ZARDOY
        </div>
      </div>
      <Card className="max-w-2xl w-full p-12 text-center border-2 border-dashed border-border hover:border-primary/50 transition-colors relative z-10">
        <div
          onDrop={handleDrop as any}
          onDragOver={handleDragOver as any}
          onDragEnter={handleDragEnter as any}
          onDragLeave={handleDragLeave as any}
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
              Load sprite sequences or JSON atlases (.json + atlas)
            </p>
            <p className="text-sm text-muted-foreground">
              Supports: {SUPPORTED_FORMATS_DISPLAY}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Drag and drop files/folder here or
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleFolderClick}
                size="lg"
                className="gap-2 font-semibold"
              >
                <FolderOpen className="w-5 h-5" />
                Select Folder
              </Button>
              <Button
                onClick={handleFilesClick}
                size="lg"
                variant="outline"
                className="gap-2 font-semibold"
              >
                <FileImage className="w-5 h-5" />
                Select Files
              </Button>
            </div>
          </div>

          <div className="pt-6 border-t border-border space-y-2">
            <p className="text-sm text-accent flex items-center justify-center gap-2">
              <span className="font-semibold">💡 Tip:</span>
              <span className="text-muted-foreground">
                For sprite atlases, select both the .json and atlas file together
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">R</kbd> to reset,
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground mx-1">Space</kbd> to play/pause,
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground mx-1">←→</kbd> for frame navigation
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
