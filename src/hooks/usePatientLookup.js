import { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../config/api';

/**
 * Custom hook for debounced patient lookup by MR Number.
 * Automatically resolves and tracks patient name and lookup status.
 *
 * @param {string|number} mrNumber - The MR Number value to look up.
 * @param {Object} [initialPatient] - Optional initial patient object { mrNumber, name }.
 * @returns {{ patientName: string, lookupStatus: string, patient: Object|null }}
 */
export default function usePatientLookup(mrNumber, initialPatient = null) {
  const [patientName, setPatientName] = useState(initialPatient?.name || '');
  const [lookupStatus, setLookupStatus] = useState(initialPatient?.name ? 'found' : '');
  const [patient, setPatient] = useState(initialPatient || null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;
    const trimmedMr = String(mrNumber ?? '').trim();

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      if (isCancelled) return;

      if (!trimmedMr) {
        setPatientName('');
        setLookupStatus('');
        setPatient(null);
        return;
      }

      // If matches initial patient, reuse immediately
      if (initialPatient?.mrNumber && Number(trimmedMr) === Number(initialPatient.mrNumber)) {
        setPatientName(initialPatient.name || '');
        setLookupStatus('found');
        setPatient(initialPatient);
        return;
      }

      // Validate numeric integer
      if (!/^\d+$/.test(trimmedMr)) {
        setPatientName('');
        setLookupStatus('notFound');
        setPatient(null);
        return;
      }

      const parsedInt = parseInt(trimmedMr, 10);
      if (isNaN(parsedInt) || parsedInt < 1 || parsedInt > 2147483647) {
        setPatientName('');
        setLookupStatus('notFound');
        setPatient(null);
        return;
      }

      setLookupStatus('loading');
      try {
        const response = await fetch(buildApiUrl(`/api/patients/lookup/${encodeURIComponent(trimmedMr)}`));
        if (!response.ok) {
          if (!isCancelled) {
            setPatientName('');
            setLookupStatus('notFound');
            setPatient(null);
          }
          return;
        }
        const match = await response.json();
        if (!isCancelled) {
          if (match && match.name) {
            setPatientName(match.name || '');
            setLookupStatus('found');
            setPatient(match);
          } else {
            setPatientName('');
            setLookupStatus('notFound');
            setPatient(null);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[usePatientLookup] Error resolving patient:', err);
          setPatientName('');
          setLookupStatus('notFound');
          setPatient(null);
        }
      }
    }, 300);

    return () => {
      isCancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mrNumber, initialPatient]);

  return { patientName, lookupStatus, patient };
}
