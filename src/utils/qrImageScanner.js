import jsQR from 'jsqr';

/**
 * Attempts to extract an MR Number from a QR code present in an image file.
 * Returns null if no QR code is found (which is normal for non-QR images).
 *
 * @param {File|Blob} file - The image file to analyze.
 * @returns {Promise<string|null>} - Resolved MR Number string or null.
 */
export async function extractMrNumberFromImage(file) {
  if (!file || typeof file !== 'object') return null;

  const isImage = file.type?.startsWith('image/') || /\.(bmp|png|jpe?g|webp|tiff)$/i.test(file.name || '');
  if (!isImage) return null;

  return new Promise((resolve) => {
    let tempUrl = null;
    try {
      tempUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        try {
          if (tempUrl) URL.revokeObjectURL(tempUrl);

          const canvas = document.createElement('canvas');
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width <= 0 || height <= 0) {
            return resolve(null);
          }

          // If scan is enormous (>2000px), scale down proportionally for faster, accurate QR decoding
          const MAX_DIM = 2000;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return resolve(null);

          ctx.drawImage(img, 0, 0, width, height);
          const imageData = ctx.getImageData(0, 0, width, height);

          // Attempt QR decoding
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });

          if (!code || !code.data) {
            return resolve(null);
          }

          const rawData = String(code.data).trim();

          // 1. Try parsing JSON
          try {
            const parsed = JSON.parse(rawData);
            const mr = parsed['MR Number'] ?? parsed['mrNumber'] ?? parsed['MR'] ?? parsed['mr'];
            if (mr !== undefined && mr !== null && String(mr).trim() !== '') {
              return resolve(String(mr).trim());
            }
          } catch {
            // Not valid JSON, proceed to numeric test
          }

          // 2. Try raw numeric string
          if (/^\d+$/.test(rawData)) {
            return resolve(rawData);
          }

          resolve(null);
        } catch (innerErr) {
          console.warn('[qrImageScanner] Error processing image for QR:', innerErr);
          resolve(null);
        }
      };

      img.onerror = () => {
        if (tempUrl) URL.revokeObjectURL(tempUrl);
        resolve(null);
      };

      img.src = tempUrl;
    } catch (outerErr) {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
      console.warn('[qrImageScanner] Failed to initialize image load:', outerErr);
      resolve(null);
    }
  });
}
