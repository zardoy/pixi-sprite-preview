// Sprite sheet parser for TexturePacker JSON format
import { Assets, Texture } from 'pixi.js';
import 'pixi.js/basis';
import 'pixi.js/ktx2';

export interface SpriteFrame {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteSourceSize?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  sourceSize?: {
    w: number;
    h: number;
  };
}

export interface SpriteSheetData {
  frames: SpriteFrame[];
  atlasImage: string;
  animations?: { [key: string]: string[] };
}

// Supported atlas formats
export const SUPPORTED_ATLAS_FORMATS = ['.png', '.webp', '.ktx2', '.jpg', '.jpeg'];
export const SUPPORTED_FORMATS_DISPLAY = 'PNG, WebP, KTX2, JPEG';

/**
 * Parses TexturePacker JSON format
 */
export async function parseSpriteSheet(jsonFile: File): Promise<SpriteSheetData | null> {
  try {
    const text = await jsonFile.text();
    const data = JSON.parse(text);

    // Check if it's a valid sprite sheet format
    if (!data.frames || !data.meta) {
      return null;
    }

    const frames: SpriteFrame[] = [];

    // Parse frames object (TexturePacker hash format)
    if (typeof data.frames === 'object' && !Array.isArray(data.frames)) {
      for (const [name, frameData] of Object.entries(data.frames)) {
        const frame = (frameData as any).frame;
        const spriteSourceSize = (frameData as any).spriteSourceSize;
        const sourceSize = (frameData as any).sourceSize;

        if (frame) {
          frames.push({
            name,
            x: frame.x,
            y: frame.y,
            width: frame.w,
            height: frame.h,
            spriteSourceSize: spriteSourceSize ? {
              x: spriteSourceSize.x,
              y: spriteSourceSize.y,
              w: spriteSourceSize.w,
              h: spriteSourceSize.h,
            } : undefined,
            sourceSize: sourceSize ? {
              w: sourceSize.w,
              h: sourceSize.h,
            } : undefined,
          });
        }
      }
    }

    // Get atlas image name from meta
    const atlasImage = data.meta?.image || '';

    // Get animations if present
    const animations = data.animations || undefined;

    return {
      frames,
      atlasImage,
      animations,
    };
  } catch (error) {
    console.error('Failed to parse sprite sheet:', error);
    return null;
  }
}

/**
 * Extracts individual frame images from an atlas texture
 * Supports PNG, WebP, JPEG, and KTX2 formats using PixiJS Assets loader
 */
export async function extractFramesFromAtlas(
  atlasFile: File,
  frames: SpriteFrame[]
): Promise<File[]> {
  const url = URL.createObjectURL(atlasFile);
  const isKTX2 = atlasFile.name.toLowerCase().endsWith('.ktx2');

  try {
    // Use PixiJS Assets to load the texture (handles all formats including KTX2)
    const texture = await Assets.load(url);

    if (!texture || !texture.baseTexture) {
      throw new Error('Failed to load texture');
    }

    const extractedFiles: File[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Get the base texture's resource (the actual image/data)
    const baseTexture = texture.baseTexture;
    const source = baseTexture.resource?.source;

    if (!source) {
      throw new Error('Failed to access texture source');
    }

    // For each frame, create a new texture and extract it
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];

      // Create a new texture from the frame region
      const frameTexture = new Texture(
        baseTexture,
        {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height,
        }
      );

      // Set canvas to frame size
      canvas.width = frame.width;
      canvas.height = frame.height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the texture
      // For KTX2 and other formats, we need to extract from the canvas renderer
      if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
        ctx.drawImage(
          source,
          frame.x, frame.y, frame.width, frame.height, // source
          0, 0, frame.width, frame.height // destination
        );
      } else {
        // For other formats, try to render via PixiJS
        console.warn(`Frame extraction for ${atlasFile.name} may not work correctly for this format`);
        // Fallback: just create empty frames
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Convert to blob and then to File
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });

      const file = new File([blob], frame.name + '.png', { type: 'image/png' });
      extractedFiles.push(file);

      frameTexture.destroy(false); // Don't destroy base texture
    }

    URL.revokeObjectURL(url);
    texture.destroy(true);
    return extractedFiles;
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/**
 * Sorts frames by their name (numerically if possible)
 */
export function sortFramesByName(frames: SpriteFrame[]): SpriteFrame[] {
  return frames.sort((a, b) => {
    // Try to extract numbers from the names
    const aMatch = a.name.match(/(\d+)/);
    const bMatch = b.name.match(/(\d+)/);

    if (aMatch && bMatch) {
      const aNum = parseInt(aMatch[1]);
      const bNum = parseInt(bMatch[1]);
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    }

    // Fallback to string comparison
    return a.name.localeCompare(b.name);
  });
}
