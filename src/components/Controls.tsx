import { Play, Pause, SkipBack, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";

interface ControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  currentFrame: number;
  totalFrames: number;
  onFrameChange: (frame: number) => void;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  interpolate: boolean;
  onInterpolateChange: (interpolate: boolean) => void;
  onBack: () => void;
}

const BG_PRESETS = [
  { name: "Dark Purple", color: "#1a1625" },
  { name: "Charcoal", color: "#262626" },
  { name: "Navy", color: "#1a1f2e" },
  { name: "Forest", color: "#1f261f" },
  { name: "Brown", color: "#261f1a" },
  { name: "Teal", color: "#1a2426" },
];

const FPS_PRESETS = [10, 18, 24, 30, 60];

export const Controls = ({
  isPlaying,
  onPlayPause,
  loop,
  onLoopChange,
  fps,
  onFpsChange,
  currentFrame,
  totalFrames,
  onFrameChange,
  bgColor,
  onBgColorChange,
  interpolate,
  onInterpolateChange,
  onBack,
}: ControlsProps) => {
  const duration = ((totalFrames / fps) * 1000).toFixed(0);

  return (
    <Card className="p-6 rounded-none border-x-0 border-t-0 border-b border-border">
      <div className="flex flex-wrap gap-6 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={onPlayPause}
            size="lg"
            className="gap-2 font-semibold min-w-32"
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                Play
              </>
            )}
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox
              id="loop"
              checked={loop}
              onCheckedChange={onLoopChange}
            />
            <Label htmlFor="loop" className="cursor-pointer">
              Loop
            </Label>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Frame Rate</Label>
            <div className="flex gap-2">
              {FPS_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  onClick={() => onFpsChange(preset)}
                  variant={fps === preset ? "default" : "outline"}
                  size="sm"
                  className="min-w-12"
                >
                  {preset}
                </Button>
              ))}
              <Input
                type="number"
                value={fps}
                onChange={(e) => onFpsChange(Number(e.target.value))}
                className="w-20"
                min={1}
                max={120}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Duration: {duration}ms
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Frame {String(currentFrame + 1).padStart(2, "0")}/
              {String(totalFrames).padStart(2, "0")}
            </Label>
            <div className="flex items-center gap-2 min-w-48">
              <Slider
                value={[currentFrame]}
                onValueChange={(value) => onFrameChange(value[0])}
                max={totalFrames - 1}
                step={1}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Background</Label>
            <div className="flex gap-2 items-center">
              {BG_PRESETS.map((preset) => (
                <button
                  key={preset.color}
                  onClick={() => onBgColorChange(preset.color)}
                  className="w-8 h-8 rounded border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: preset.color,
                    borderColor: bgColor === preset.color ? "hsl(var(--primary))" : "transparent",
                  }}
                  title={preset.name}
                />
              ))}
              <Input
                type="color"
                value={bgColor}
                onChange={(e) => onBgColorChange(e.target.value)}
                className="w-12 h-8 p-1 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="interpolate"
              checked={interpolate}
              onCheckedChange={onInterpolateChange}
              disabled={totalFrames <= 1}
            />
            <Label
              htmlFor="interpolate"
              className={`text-xs ${totalFrames <= 1 ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              Interpolate Frames
              <span className="text-muted-foreground ml-1">
                {totalFrames <= 1 ? '(Needs 2+ frames)' : '(Experimental)'}
              </span>
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
};
