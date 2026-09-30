/**
 * Checks if a patient record has fixed allergies or co-morbid factors.
 *
 * @param {Object} patient - Patient data object
 * @returns {{ hasAllergy: boolean, hasCoMorbid: boolean, hasAlert: boolean, allergy: string, comorbid: string, tooltipText: string }}
 */
export function getPatientAlertStatus(patient) {
  if (!patient) {
    return { hasAllergy: false, hasCoMorbid: false, hasAlert: false, allergy: '', comorbid: '', tooltipText: '' };
  }

  const allergy = patient.fixedAllergies && String(patient.fixedAllergies).trim() !== '' && String(patient.fixedAllergies).trim().toLowerCase() !== 'null'
    ? String(patient.fixedAllergies).trim()
    : '';
  const comorbid = patient.coMorbidFactor && String(patient.coMorbidFactor).trim() !== '' && String(patient.coMorbidFactor).trim().toLowerCase() !== 'null'
    ? String(patient.coMorbidFactor).trim()
    : '';

  const hasAllergy = Boolean(allergy);
  const hasCoMorbid = Boolean(comorbid);
  const hasAlert = hasAllergy || hasCoMorbid;

  const messages = [];
  if (hasAllergy) messages.push(`Fixed Allergy: ${allergy}`);
  if (hasCoMorbid) messages.push(`Co-Morbid Factor: ${comorbid}`);
  const tooltipText = messages.join(' | ');

  return { hasAllergy, hasCoMorbid, hasAlert, allergy, comorbid, tooltipText };
}
