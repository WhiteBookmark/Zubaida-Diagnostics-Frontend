import { useEffect, useRef, useCallback } from 'react';

/**
 * useQrScanner — Captures QR code JSON scans via hardware keyboard emulation or paste.
 *
 * Silently buffers scanner characters in memory during streaming to prevent hundreds of React re-renders,
 * cleanly injecting the parsed MR Number once the complete JSON payload is captured without strict
 * keystroke gap timers to prevent dropped scans on slower systems or heavy UI pages.
 *
 * @param {function} onScan - Callback receiving the parsed JSON object from the QR code.
 * @param {object} options
 * @param {boolean} options.enabled - Whether the listener is active (default: true).
 * @param {number} options.idleTimeoutMs - Milliseconds before resetting an abandoned incomplete buffer (default: 1500).
 */
export default function useQrScanner(onScan, { enabled = true, idleTimeoutMs = 1500 } = {}) {
  const bufferRef = useRef('');
  const timeoutRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastProcessedRef = useRef(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const processPayload = useCallback((text, event) => {
    if (!text || typeof text !== 'string') return false;
    const raw = text.trim();
    if (raw.startsWith('{') && raw.endsWith('}')) {
      // Debounce rapid double triggers (e.g. '}' and trailing 'Enter' from scanner)
      const now = Date.now();
      if (now - lastProcessedRef.current < 1000) {
        resetBuffer();
        return true;
      }

      try {
        const parsed = JSON.parse(raw);
        // Validate it has the expected MR Number field
        if (parsed && typeof parsed === 'object' && parsed['MR Number']) {
          lastProcessedRef.current = now;

          if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
            event.stopPropagation();
          }

          // If focused in an input/textarea, cleanly replace raw JSON with just the MR Number
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            const mrNumber = String(parsed['MR Number']).trim();
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
              window.HTMLInputElement.prototype,
              'value'
            )?.set;
            if (nativeInputValueSetter) {
              nativeInputValueSetter.call(active, mrNumber);
            } else {
              active.value = mrNumber;
            }
            active.dispatchEvent(new Event('input', { bubbles: true }));
          }

          resetBuffer();
          if (typeof onScanRef.current === 'function') {
            onScanRef.current(parsed);
          }
          return true;
        }
      } catch {
        // Not valid JSON — ignore
      }
    }
    return false;
  }, [resetBuffer]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        const handled = processPayload(bufferRef.current, e);
        if (handled || bufferRef.current.length > 0) {
          resetBuffer();
        }
        return;
      }

      // Start buffering on '{' or continue if already buffering
      if (e.key === '{' || bufferRef.current.length > 0) {
        if (e.key && e.key.length === 1) {
          // Stop the character from hitting the input DOM and firing React's onChange
          // This eliminates ~300 re-renders during a scan, making it instantaneous
          e.preventDefault();
          e.stopPropagation();

          bufferRef.current += e.key;

          // Auto-trigger if closing '}' completes valid JSON — no setTimeout needed
          // since characters never entered the DOM
          if (e.key === '}' && bufferRef.current.startsWith('{')) {
            processPayload(bufferRef.current, e);
          }

          // Idle reset if scan is incomplete or abandoned
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(resetBuffer, idleTimeoutMs);
        }
      }
    };

    const handlePaste = (e) => {
      const pasted = e.clipboardData?.getData('text');
      if (pasted && typeof pasted === 'string' && pasted.trim().startsWith('{')) {
        processPayload(pasted, e);
      }
    };

    // Use capture phase so scanner Enter event is intercepted before submitting forms
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('paste', handlePaste, true);
      resetBuffer();
    };
  }, [enabled, idleTimeoutMs, processPayload, resetBuffer]);
}
