/**
 * Document types and sub-type definitions for X-Ray and Ultrasound.
 * Contains type catalogs, sides, views, and default charge mappings.
 * All lists are sorted alphabetically for optimal user experience.
 */

export const XRAY_TYPES = [
  { label: 'Abd Erect', value: 'Abd Erect', defaultCharges: 600 },
  { label: 'Ankle', value: 'Ankle', defaultCharges: 600 },
  { label: 'Ball Catch View', value: 'Ball Catch View', defaultCharges: 600 },
  { label: 'Big Toe', value: 'Big Toe', defaultCharges: 600 },
  { label: 'Cephalo', value: 'Cephalo', defaultCharges: 600 },
  { label: 'Cervical Spine', value: 'Cervical Spine', defaultCharges: 1200 },
  { label: 'Chest', value: 'Chest', defaultCharges: 600 },
  { label: 'Cocyx', value: 'Cocyx', defaultCharges: 1200 },
  { label: 'Dorsal Spine', value: 'Dorsal Spine', defaultCharges: 1200 },
  { label: 'Elbow', value: 'Elbow', defaultCharges: 600 },
  { label: 'Femur', value: 'Femur', defaultCharges: 1200 },
  { label: 'Finger', value: 'Finger', defaultCharges: 600 },
  { label: 'Foot', value: 'Foot', defaultCharges: 600 },
  { label: 'Forearm', value: 'Forearm', defaultCharges: 600 },
  { label: 'Hand', value: 'Hand', defaultCharges: 600 },
  { label: 'Heel', value: 'Heel', defaultCharges: 600 },
  { label: 'Hip Lat', value: 'Hip Lat', defaultCharges: 600 },
  { label: 'Humorus', value: 'Humorus', defaultCharges: 1200 },
  { label: 'Knee', value: 'Knee', defaultCharges: 600 },
  { label: 'KUB Contrast', value: 'KUB Contrast', defaultCharges: 1200 },
  { label: 'LS Oblique', value: 'LS Oblique', defaultCharges: 600 },
  { label: 'LS Spine', value: 'LS Spine', defaultCharges: 1200 },
  { label: 'Mastoid', value: 'Mastoid', defaultCharges: 600 },
  { label: 'Nasal Bone', value: 'Nasal Bone', defaultCharges: 600 },
  { label: 'OPG', value: 'OPG', defaultCharges: 600 },
  { label: 'Pelvis', value: 'Pelvis', defaultCharges: 600 },
  { label: 'PNS (Water View)', value: 'PNS (Water View)', defaultCharges: 600 },
  { label: 'Ribs View', value: 'Ribs View', defaultCharges: 1200 },
  { label: 'Scapula', value: 'Scapula', defaultCharges: 1200 },
  { label: 'Shoulder', value: 'Shoulder', defaultCharges: 1200 },
  { label: 'Skyline View', value: 'Skyline View', defaultCharges: 600 },
  { label: 'Skull', value: 'Skull', defaultCharges: 1200 },
  { label: 'Standing View (Knee)', value: 'Standing View (Knee)', defaultCharges: 1200 },
  { label: 'Thumb', value: 'Thumb', defaultCharges: 600 },
  { label: 'Tibia', value: 'Tibia', defaultCharges: 600 },
  { label: 'TM Joint Open/Close', value: 'TM Joint Open/Close', defaultCharges: 1200 },
  { label: 'Wrist', value: 'Wrist', defaultCharges: 600 },
];

export const XRAY_SIDES = ['N/A', 'Right', 'Left', 'Both'];

export const XRAY_VIEWS = ['N/A', 'AP', 'PA', 'Lateral', 'Oblique'];

export const ULTRASOUND_TYPES = [
  { label: 'Appendix', value: 'Appendix', defaultCharges: 800 },
  { label: 'Breast', value: 'Breast', defaultCharges: 800 },
  { label: 'Hernia', value: 'Hernia', defaultCharges: 800 },
  { label: 'KUB', value: 'KUB', defaultCharges: 800 },
  { label: 'Lower Abdomen', value: 'Lower Abdomen', defaultCharges: 800 },
  { label: 'Mandible', value: 'Mandible', defaultCharges: 800 },
  { label: 'Neck Growth', value: 'Neck Growth', defaultCharges: 800 },
  { label: 'Pelvis', value: 'Pelvis', defaultCharges: 800 },
  { label: 'Prostate', value: 'Prostate', defaultCharges: 800 },
  { label: 'Testes', value: 'Testes', defaultCharges: 800 },
  { label: 'Throat', value: 'Throat', defaultCharges: 800 },
  { label: 'Thyroid', value: 'Thyroid', defaultCharges: 800 },
  { label: 'Upper Abdomen', value: 'Upper Abdomen', defaultCharges: 800 },
  { label: 'Vocal Cord', value: 'Vocal Cord', defaultCharges: 1000 },
  { label: 'Whole Abdomen', value: 'Whole Abdomen', defaultCharges: 1200 },
];

/**
 * Returns default charges for a given document type and subtype.
 * @param {string} docType - 'X-Ray' | 'Ultrasound'
 * @param {string} subType - Specific subtype name
 * @returns {number} Default charge amount in PKR
 */
export const getDefaultCharges = (docType, subType) => {
  if (docType === 'X-Ray') {
    const found = XRAY_TYPES.find(t => t.value === subType);
    return found ? found.defaultCharges : 600;
  }
  if (docType === 'Ultrasound') {
    const found = ULTRASOUND_TYPES.find(t => t.value === subType);
    return found ? found.defaultCharges : 800;
  }
  return 0;
};
