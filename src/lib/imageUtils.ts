/**
 * Utility for client-side image compression and safe processing
 * Keeps images lightweight (typically 40KB - 120KB) for fast instant rendering and Firestore storage.
 */

export interface ProcessedImage {
  id: string;
  url: string; // Base64 data URL
  fileName: string;
  width: number;
  height: number;
  sizeBytes: number;
  uploadedAt: string;
}

export async function compressAndProcessImage(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.8
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    // Only accept valid image files
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserving dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context not supported.'));
        }

        // Clean white background for transparent PNG conversions
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight WebP or JPEG
        const outputFormat = file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputFormat, quality);

        const id = 'img_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const approxBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          id,
          url: dataUrl,
          fileName: file.name,
          width,
          height,
          sizeBytes: approxBytes,
          uploadedAt: new Date().toISOString()
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export async function compressImageFile(
  file: File,
  maxDimension: number = 1200,
  quality: number = 0.8
): Promise<string> {
  const result = await compressAndProcessImage(file, maxDimension, quality);
  return result.url;
}

