import { useEffect, useRef, useState } from "react";
import { Application, Assets, Sprite, Texture } from "pixi.js";
import { Controls } from "./Controls";
import { toast } from "sonner";

interface AnimationViewerProps {
  files: File[];
  onBack: () => void;
}

export const AnimationViewer = ({ files, onBack }: AnimationViewerProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spriteRef = useRef<Sprite | null>(null);
  const texturesRef = useRef<Texture[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [fps, setFps] = useState(24);
  const [bgColor, setBgColor] = useState("#1a1625");
  const [interpolate, setInterpolate] = useState(false);

  // Sort files by name to ensure correct sequence
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const totalFrames = sortedFiles.length;

  useEffect(() => {
    const initPixi = async () => {
      if (!canvasRef.current) return;

      const app = new Application();
      await app.init({
        background: bgColor,
        resizeTo: canvasRef.current,
        antialias: true,
      });

      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Load textures
      const textures: Texture[] = [];
      for (const file of sortedFiles) {
        const url = URL.createObjectURL(file);
        const texture = await Assets.load(url);
        textures.push(texture);
      }
      texturesRef.current = textures;

      if (textures.length > 0) {
        const sprite = new Sprite(textures[0]);
        sprite.anchor.set(0.5);
        sprite.position.set(app.screen.width / 2, app.screen.height / 2);
        
        // Scale sprite to fit canvas while maintaining aspect ratio
        const scale = Math.min(
          app.screen.width / sprite.width * 0.8,
          app.screen.height / sprite.height * 0.8
        );
        sprite.scale.set(scale);
        
        app.stage.addChild(sprite);
        spriteRef.current = sprite;

        toast.success(`Loaded ${textures.length} frames`);
      }
    };

    initPixi();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (appRef.current) {
        appRef.current.destroy(true);
      }
      texturesRef.current.forEach(texture => texture.destroy(true));
    };
  }, [sortedFiles]);

  // Update background color
  useEffect(() => {
    if (appRef.current) {
      appRef.current.renderer.background.color = bgColor;
    }
  }, [bgColor]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !spriteRef.current || texturesRef.current.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const frameDuration = 1000 / fps;
    
    const animate = (currentTime: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const elapsed = currentTime - lastTimeRef.current;

      if (elapsed >= frameDuration) {
        setCurrentFrame((prev) => {
          let next = prev + 1;
          if (next >= totalFrames) {
            if (loop) {
              next = 0;
            } else {
              setIsPlaying(false);
              return prev;
            }
          }
          return next;
        });
        lastTimeRef.current = currentTime;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, fps, loop, totalFrames]);

  // Update sprite texture when frame changes
  useEffect(() => {
    if (spriteRef.current && texturesRef.current[currentFrame]) {
      spriteRef.current.texture = texturesRef.current[currentFrame];
    }
  }, [currentFrame]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setCurrentFrame((prev) => (prev > 0 ? prev - 1 : totalFrames - 1));
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setCurrentFrame((prev) => (prev < totalFrames - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalFrames]);

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
    lastTimeRef.current = 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Controls
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        loop={loop}
        onLoopChange={setLoop}
        fps={fps}
        onFpsChange={setFps}
        currentFrame={currentFrame}
        totalFrames={totalFrames}
        onFrameChange={handleFrameChange}
        bgColor={bgColor}
        onBgColorChange={setBgColor}
        interpolate={interpolate}
        onInterpolateChange={setInterpolate}
        onBack={onBack}
      />
      <div ref={canvasRef} className="flex-1" />
    </div>
  );
};
