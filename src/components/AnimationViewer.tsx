import { useEffect, useRef, useState } from "react";
import { Application, Sprite, Texture } from "pixi.js";
import "pixi.js/basis";
import "pixi.js/ktx2";
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
  const nextSpriteRef = useRef<Sprite | null>(null); // For interpolation
  const texturesRef = useRef<Texture[]>([]);
  const blobUrlsRef = useRef<string[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hasInitializedRef = useRef<boolean>(false);
  const interpolationProgressRef = useRef<number>(0);

  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [fps, setFps] = useState(24);
  const [bgColor, setBgColor] = useState("#1a1625");
  const [interpolate, setInterpolate] = useState(false);
  const [scale, setScale] = useState(1.0);

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
          console.log(`Creating sprites with first texture...`);
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

          // Create next sprite for interpolation (initially hidden)
          const nextSprite = new Sprite(textures[0]);
          nextSprite.anchor.set(0.5);
          nextSprite.position.set(app.screen.width / 2, app.screen.height / 2);
          nextSprite.scale.set(scale);
          nextSprite.alpha = 0; // Start invisible
          nextSprite.visible = false;

          console.log(`Applied scale: ${scale}`);

          app.stage.addChild(sprite);
          app.stage.addChild(nextSprite);
          spriteRef.current = sprite;
          nextSpriteRef.current = nextSprite;

          console.log(`Sprites added to stage, rendering...`);
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

  // Update sprite scale
  useEffect(() => {
    if (spriteRef.current && nextSpriteRef.current && appRef.current) {
      const baseScale = Math.min(
        appRef.current.screen.width / spriteRef.current.texture.width * 0.8,
        appRef.current.screen.height / spriteRef.current.texture.height * 0.8
      );
      const newScale = baseScale * scale;
      spriteRef.current.scale.set(newScale);
      nextSpriteRef.current.scale.set(newScale);
      appRef.current.render();
    }
  }, [scale]);

  // Animation loop with interpolation support
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

      // Only interpolate if enabled, we have multiple frames, and sprites exist
      if (interpolate && totalFrames > 1 && spriteRef.current && nextSpriteRef.current) {
        // Calculate interpolation progress (0 to 1 within frame duration)
        const progress = Math.min(elapsed / frameDuration, 1);
        interpolationProgressRef.current = progress;

        // Keep the current sprite always visible at full opacity
        // Fade in the next sprite on top
        // This prevents darkening since we always have a fully opaque base
        spriteRef.current.alpha = 1;
        spriteRef.current.visible = true;

        nextSpriteRef.current.alpha = progress; // Fade from 0 to 1
        nextSpriteRef.current.visible = progress > 0.01; // Hide if nearly invisible

        // Render the interpolation
        if (appRef.current) {
          appRef.current.render();
        }
      } else if (spriteRef.current && nextSpriteRef.current) {
        // Ensure proper alpha when not interpolating
        spriteRef.current.alpha = 1;
        spriteRef.current.visible = true;
        nextSpriteRef.current.alpha = 0;
        nextSpriteRef.current.visible = false;
      }

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
        interpolationProgressRef.current = 0;
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, fps, loop, totalFrames, interpolate]);

  // Update sprite textures when frame changes
  useEffect(() => {
    if (spriteRef.current && texturesRef.current[currentFrame]) {
      spriteRef.current.texture = texturesRef.current[currentFrame];
      spriteRef.current.alpha = 1;

      // Setup next sprite for interpolation
      if (nextSpriteRef.current && interpolate) {
        const nextFrameIndex = (currentFrame + 1) % totalFrames;
        nextSpriteRef.current.texture = texturesRef.current[nextFrameIndex];
        nextSpriteRef.current.alpha = 0;
      } else if (nextSpriteRef.current) {
        // Hide next sprite when not interpolating
        nextSpriteRef.current.alpha = 0;
      }

      // Force render
      if (appRef.current) {
        appRef.current.render();
      }
    }
  }, [currentFrame, interpolate, totalFrames]);

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
      } else if (e.code === "KeyR") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalFrames, onBack]);

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
        scale={scale}
        onScaleChange={setScale}
        onBack={onBack}
      />
      <div ref={canvasRef} className="flex-1" />
    </div>
  );
};
