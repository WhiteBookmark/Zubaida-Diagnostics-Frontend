import { buildApiUrl } from '../config/api';

/**
 * Creates an appointment with the current timestamp and triggers server thermal printing via escposPrinter.
 * 
 * @param {string|number} mrNumber - Patient MR number
 * @returns {Promise<{ success: boolean, record: Object|null, message: string }>}
 */
export async function createQuickAppointmentAndPrint(mrNumber) {
  const trimmedMr = String(mrNumber ?? '').trim();
  const parsedMr = parseInt(trimmedMr, 10);
  if (!trimmedMr || !/^\d+$/.test(trimmedMr) || isNaN(parsedMr) || parsedMr < 1 || parsedMr > 2147483647) {
    return { success: false, record: null, message: 'Invalid MR Number.' };
  }

  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    // 1. Create appointment record
    const createRes = await fetch(buildApiUrl('/api/appointments'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mrNumber: parsedMr,
        dateTime,
        amountPaid: '0',
      }),
    });

    if (!createRes.ok) {
      let errMsg = `Failed to create appointment (${createRes.status})`;
      try {
        const errJson = await createRes.json();
        if (errJson?.error) errMsg = errJson.error;
      } catch {
        // ignore
      }
      return { success: false, record: null, message: errMsg };
    }

    const newRecord = await createRes.json();

    // 2. Trigger thermal printing on backend via escposPrinter
    let printSuccess = false;
    let printMessage = '';
    try {
      const printRes = await fetch(buildApiUrl(`/api/appointments/${newRecord.id}/print`), {
        method: 'POST',
      });
      if (printRes.ok) {
        const printData = await printRes.json().catch(() => ({}));
        printSuccess = true;
        printMessage = printData?.message || 'Token printed successfully';
      } else {
        const printErrData = await printRes.json().catch(() => ({}));
        printMessage = printErrData?.error || 'Printer communication error';
      }
    } catch (pErr) {
      console.warn('[quickAppointment] Print trigger failed:', pErr);
      printMessage = pErr.message || 'Thermal printer unreachable';
    }

    const tokenNum = newRecord.tokenNumber || 'N/A';
    const patientName = newRecord.patient?.name || 'Patient';
    return {
      success: true,
      record: newRecord,
      message: `Token #${tokenNum} created & printed for ${patientName} (MR #${parsedMr})! ${printSuccess ? '' : `(${printMessage})`}`,
    };
  } catch (err) {
    console.error('[quickAppointment] Error:', err);
    return { success: false, record: null, message: err.message || 'Network error' };
  }
}
