/**
 * compressImage — client-side image compression using Canvas API.
 *
 * Resizes and compresses images before upload to save bandwidth.
 * No external dependencies — uses browser-native APIs only.
 *
 * @param {File} file           — The image File object from an <input> or drop
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1920]   — Max pixel width
 * @param {number} [options.maxHeight=1920]  — Max pixel height
 * @param {number} [options.quality=0.8]     — JPEG/WebP quality (0–1)
 * @param {string} [options.type='image/jpeg'] — Output MIME type
 * @returns {Promise<File>}  — Compressed File (smaller or original if already small)
 */
export default function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    type = 'image/jpeg',
  } = options;

  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return Promise.resolve(file);
  }

  // Skip already-small files (< 500 KB)
  if (file.size < 500 * 1024) {
    return Promise.resolve(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Draw to canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file); // fallback to original if conversion fails
            return;
          }

          // Only use compressed version if it's actually smaller
          if (blob.size >= file.size) {
            resolve(file);
            return;
          }

          // Preserve original filename with new extension
          const ext = type === 'image/webp' ? '.webp' : '.jpg';
          const name = file.name.replace(/\.[^.]+$/, ext);
          const compressed = new File([blob], name, { type, lastModified: Date.now() });
          resolve(compressed);
        },
        type,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = url;
  });
}

/**
 * compressImages — compress an array of Files.
 *
 * @param {File[]} files     — Array of image Files
 * @param {Object} [options] — Same options as compressImage
 * @returns {Promise<File[]>}
 */
export async function compressImages(files, options = {}) {
  return Promise.all(files.map((f) => compressImage(f, options)));
}
