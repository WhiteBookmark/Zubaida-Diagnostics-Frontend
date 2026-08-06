import { useEffect, useRef, useCallback } from 'react';

/**
 * useQrScanner — Listens for USB HID barcode/QR scanner input (keyboard emulation).
 *
 * Scanners like Henex type characters rapidly (< 50ms apart) then press Enter.
 * This hook distinguishes scanner input from human typing by timing keystrokes.
 *
 * @param {function} onScan - Callback receiving the parsed JSON object from the QR code.
 * @param {object} options
 * @param {boolean} options.enabled - Whether the listener is active (default: true).
 * @param {number} options.maxKeystrokeGap - Max ms between keystrokes to be considered scanner input (default: 50).
 * @param {number} options.minLength - Minimum buffer length to qualify as a scan (default: 10).
 */
export default function useQrScanner(onScan, { enabled = true, maxKeystrokeGap = 50, minLength = 10 } = {}) {
  const bufferRef = useRef('');
  const lastKeystrokeRef = useRef(0);
  const timerRef = useRef(null);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const now = Date.now();

      // If too much time has passed since last keystroke, reset — this is human typing
      if (now - lastKeystrokeRef.current > maxKeystrokeGap && bufferRef.current.length > 0) {
        resetBuffer();
      }
      lastKeystrokeRef.current = now;

      if (e.key === 'Enter') {
        const raw = bufferRef.current.trim();
        resetBuffer();

        if (raw.length >= minLength) {
          try {
            const parsed = JSON.parse(raw);
            // Validate it has the expected MR Number field
            if (parsed && parsed['MR Number']) {
              e.preventDefault();
              e.stopPropagation();
              onScan(parsed);
            }
          } catch {
            // Not valid JSON — ignore, was probably human typing
          }
        }
        return;
      }

      // Only accumulate printable single characters (scanner sends key-by-key)
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Safety: clear buffer if it grows too large without Enter (leak prevention)
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(resetBuffer, 500);
      }
    };

    // Use capture phase so scanner input is caught before it reaches focused input fields
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      resetBuffer();
    };
  }, [enabled, maxKeystrokeGap, minLength, onScan, resetBuffer]);
}
