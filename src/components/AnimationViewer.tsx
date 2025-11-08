import { useEffect, useRef, useState } from "react";
import { Application, Sprite, Texture } from "pixi.js";
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
  const blobUrlsRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [fps, setFps] = useState(24);
  const [bgColor, setBgColor] = useState("#1a1625");
  const [interpolate, setInterpolate] = useState(false);

  // Sort files by name to ensure correct sequence (memoize to prevent re-sorts)
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));
  const totalFrames = sortedFiles.length;

  // Initialize PixiJS only once
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initPixi = async () => {
      if (!canvasRef.current) return;

      try {
        const app = new Application();
        await app.init({
          background: bgColor,
          resizeTo: canvasRef.current,
          antialias: true,
        });

        if (!canvasRef.current) return;
        canvasRef.current.appendChild(app.canvas);
        appRef.current = app;

        console.log(`Starting to load ${sortedFiles.length} textures...`);

        // Load textures by creating Image elements first, then textures
        const textures: Texture[] = [];
        const blobUrls: string[] = [];
        
        for (let i = 0; i < sortedFiles.length; i++) {
          const file = sortedFiles[i];
          try {
            console.log(`Loading frame ${i + 1}/${sortedFiles.length}: ${file.name}`);
            const url = URL.createObjectURL(file);
            blobUrls.push(url);
            
            // Load image first
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = url;
            });
            
            console.log(`Image loaded for ${file.name}, creating texture...`);
            
            // Create texture from loaded image
            const texture = Texture.from(img);
            textures.push(texture);
            
            console.log(`Texture created successfully for frame ${i + 1}`);
          } catch (err) {
            console.error(`Failed to load texture from ${file.name}:`, err);
          }
        }
        
        console.log(`All textures loaded: ${textures.length} total`);
        texturesRef.current = textures;
        blobUrlsRef.current = blobUrls;

        if (textures.length > 0) {
          console.log(`Creating sprite with first texture...`);
          const sprite = new Sprite(textures[0]);
          sprite.anchor.set(0.5);
          sprite.position.set(app.screen.width / 2, app.screen.height / 2);
          
          console.log(`Sprite dimensions: ${sprite.width}x${sprite.height}`);
          console.log(`Canvas dimensions: ${app.screen.width}x${app.screen.height}`);
          
          // Scale sprite to fit canvas while maintaining aspect ratio
          const scale = Math.min(
            app.screen.width / sprite.width * 0.8,
            app.screen.height / sprite.height * 0.8
          );
          sprite.scale.set(scale);
          
          console.log(`Applied scale: ${scale}`);
          
          app.stage.addChild(sprite);
          spriteRef.current = sprite;

          console.log(`Sprite added to stage, rendering...`);
          app.render();

          toast.success(`Loaded ${textures.length} frames`);
        } else {
          console.error("No textures were loaded successfully");
          toast.error("Failed to load any frames");
        }
      } catch (err) {
        console.error("Error initializing PixiJS:", err);
        toast.error("Failed to initialize animation viewer");
      }
    };

    initPixi();

    return () => {
      hasInitializedRef.current = false;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: false });
        } catch (err) {
          console.error("Error destroying PixiJS app:", err);
        }
      }
      // Clean up textures
      texturesRef.current.forEach(texture => {
        try {
          if (texture) {
            texture.destroy(true);
          }
        } catch (err) {
          console.error("Error destroying texture:", err);
        }
      });
      texturesRef.current = [];
      
      // Clean up blob URLs
      blobUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error("Error revoking blob URL:", err);
        }
      });
      blobUrlsRef.current = [];
    };
  }, []); // Only run once

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
