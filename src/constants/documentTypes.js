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

export const XRAY_VIEWS = ['N/A', 'AP Lateral', 'PA Lateral', 'Oblique'];

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
 * Lab test types with subtypes and default charges.
 * Subtypes: "Routine", "Special", "No Discount"
 */
export const LAB_TYPES = [
  { label: '24 HOURS URINE Creatinine Clearnce', value: '24 HOURS URINE Creatinine Clearnce', defaultCharges: 1500, subtype: 'Special' },
  { label: '24.HOURS URINE Protien', value: '24.HOURS URINE Protien', defaultCharges: 1500, subtype: 'Routine' },
  { label: 'AFB', value: 'AFB', defaultCharges: 1500, subtype: 'Routine' },
  { label: 'ALKALINE PHOSPHATE', value: 'ALKALINE PHOSPHATE', defaultCharges: 400, subtype: 'Routine' },
  { label: 'AMYLASE', value: 'AMYLASE', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'APTT', value: 'APTT', defaultCharges: 1000, subtype: 'Special' },
  { label: 'ASOT', value: 'ASOT', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'B.T (BLEEDING TIME)', value: 'B.T (BLEEDING TIME)', defaultCharges: 500, subtype: 'Routine' },
  { label: 'BETA HCG', value: 'BETA HCG', defaultCharges: 2500, subtype: 'Special' },
  { label: 'BICARBONATE', value: 'BICARBONATE', defaultCharges: 600, subtype: 'Routine' },
  { label: 'BILIRUBIN ( T & D)', value: 'BILIRUBIN ( T & D)', defaultCharges: 800, subtype: 'Routine' },
  { label: 'BIOPSY (LARGE)', value: 'BIOPSY (LARGE)', defaultCharges: 6000, subtype: 'Special' },
  { label: 'BIOPSY (SMALL)', value: 'BIOPSY (SMALL)', defaultCharges: 4500, subtype: 'No Discount' },
  { label: 'BLOOD C/S', value: 'BLOOD C/S', defaultCharges: 2500, subtype: 'Special' },
  { label: 'BLOOD GROUP RH', value: 'BLOOD GROUP RH', defaultCharges: 300, subtype: 'Routine' },
  { label: 'BUN', value: 'BUN', defaultCharges: 500, subtype: 'Routine' },
  { label: 'C/S CULTURE & SENSITIVITY', value: 'C/S CULTURE & SENSITIVITY', defaultCharges: 2000, subtype: 'Special' },
  { label: 'CALCIUM', value: 'CALCIUM', defaultCharges: 400, subtype: 'Routine' },
  { label: 'CARDIAC ENZYME', value: 'CARDIAC ENZYME', defaultCharges: 2500, subtype: 'Special' },
  { label: 'CBC', value: 'CBC', defaultCharges: 600, subtype: 'Routine' },
  { label: 'CBC ESR', value: 'CBC ESR', defaultCharges: 750, subtype: 'Routine' },
  { label: 'CHIKEN GUNIA', value: 'CHIKEN GUNIA', defaultCharges: 3000, subtype: 'Special' },
  { label: 'CHLORIDE', value: 'CHLORIDE', defaultCharges: 400, subtype: 'Routine' },
  { label: 'CHOLESTROL', value: 'CHOLESTROL', defaultCharges: 500, subtype: 'Routine' },
  { label: 'CKMB', value: 'CKMB', defaultCharges: 1000, subtype: 'Special' },
  { label: 'CPK', value: 'CPK', defaultCharges: 1000, subtype: 'Special' },
  { label: 'CREATININE', value: 'CREATININE', defaultCharges: 400, subtype: 'Routine' },
  { label: 'CRP', value: 'CRP', defaultCharges: 1000, subtype: 'Special' },
  { label: 'CT (CLOTING TIME)', value: 'CT (CLOTING TIME)', defaultCharges: 500, subtype: 'Routine' },
  { label: 'DENGUE NS 1', value: 'DENGUE NS 1', defaultCharges: 1500, subtype: 'Special' },
  { label: 'DENGUE VIRUS', value: 'DENGUE VIRUS', defaultCharges: 2000, subtype: 'Special' },
  { label: 'ELECTROLYTES SERUM', value: 'ELECTROLYTES SERUM', defaultCharges: 600, subtype: 'Routine' },
  { label: 'ESR', value: 'ESR', defaultCharges: 300, subtype: 'Routine' },
  { label: 'F T3', value: 'F T3', defaultCharges: 2000, subtype: 'Special' },
  { label: 'F T4', value: 'F T4', defaultCharges: 2000, subtype: 'Special' },
  { label: 'FBS (FASTING BLOOD SUGAR)', value: 'FBS (FASTING BLOOD SUGAR)', defaultCharges: 300, subtype: 'Routine' },
  { label: 'FERITTIN LEVEL', value: 'FERITTIN LEVEL', defaultCharges: 3500, subtype: 'Special' },
  { label: 'FOLATE LEVEL', value: 'FOLATE LEVEL', defaultCharges: 2500, subtype: 'Special' },
  { label: 'FSH', value: 'FSH', defaultCharges: 1800, subtype: 'Special' },
  { label: 'G6PD', value: 'G6PD', defaultCharges: 3500, subtype: 'Special' },
  { label: 'GAMA GT', value: 'GAMA GT', defaultCharges: 400, subtype: 'Routine' },
  { label: 'GCT', value: 'GCT', defaultCharges: 1500, subtype: 'Routine' },
  { label: 'GTT', value: 'GTT', defaultCharges: 2500, subtype: 'Routine' },
  { label: 'H PYLORI ANTIGEN STOOL', value: 'H PYLORI ANTIGEN STOOL', defaultCharges: 2500, subtype: 'Special' },
  { label: 'H PYLORI IgG (ELISA)', value: 'H PYLORI IgG (ELISA)', defaultCharges: 1500, subtype: 'Special' },
  { label: 'H PYLORI IgG (LATEX)', value: 'H PYLORI IgG (LATEX)', defaultCharges: 1000, subtype: 'Special' },
  { label: 'HB% ELECTROPHORSIS', value: 'HB% ELECTROPHORSIS', defaultCharges: 4500, subtype: 'Special' },
  { label: 'HBA1C', value: 'HBA1C', defaultCharges: 1200, subtype: 'Special' },
  { label: 'HbsAg (ELISA)', value: 'HbsAg (ELISA)', defaultCharges: 1500, subtype: 'Special' },
  { label: 'HbsAg (LATEX)', value: 'HbsAg (LATEX)', defaultCharges: 1000, subtype: 'Special' },
  { label: 'HbsAg BY PCR', value: 'HbsAg BY PCR', defaultCharges: 10000, subtype: 'Special' },
  { label: 'HCV (ELISA)', value: 'HCV (ELISA)', defaultCharges: 1500, subtype: 'Special' },
  { label: 'HCV (LATEX)', value: 'HCV (LATEX)', defaultCharges: 1000, subtype: 'Special' },
  { label: 'HCV BY PCR', value: 'HCV BY PCR', defaultCharges: 15000, subtype: 'Special' },
  { label: 'HDL (CHOLESTROL)', value: 'HDL (CHOLESTROL)', defaultCharges: 800, subtype: 'Routine' },
  { label: 'HEAMOGLOBIN HB%', value: 'HEAMOGLOBIN HB%', defaultCharges: 400, subtype: 'Routine' },
  { label: 'HIV (ELISA)', value: 'HIV (ELISA)', defaultCharges: 2000, subtype: 'Special' },
  { label: 'HVS C/S', value: 'HVS C/S', defaultCharges: 2500, subtype: 'Special' },
  { label: 'HVS D/R', value: 'HVS D/R', defaultCharges: 1000, subtype: 'Special' },
  { label: 'ICT MP', value: 'ICT MP', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'ICT TB', value: 'ICT TB', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'INSULINE LEVEL (FASTING)', value: 'INSULINE LEVEL (FASTING)', defaultCharges: 2500, subtype: 'Special' },
  { label: 'IRON', value: 'IRON', defaultCharges: 1000, subtype: 'Special' },
  { label: 'L H', value: 'L H', defaultCharges: 1800, subtype: 'Special' },
  { label: 'LDH', value: 'LDH', defaultCharges: 800, subtype: 'Routine' },
  { label: "LFT'S", value: "LFT'S", defaultCharges: 1200, subtype: 'Routine' },
  { label: 'LIPID PROFILE', value: 'LIPID PROFILE', defaultCharges: 1500, subtype: 'Routine' },
  { label: 'MICRO ALBUMIN', value: 'MICRO ALBUMIN', defaultCharges: 1000, subtype: 'Special' },
  { label: 'MP', value: 'MP', defaultCharges: 400, subtype: 'Routine' },
  { label: 'MT', value: 'MT', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'PAP SMEAR', value: 'PAP SMEAR', defaultCharges: 2000, subtype: 'Special' },
  { label: 'PCV', value: 'PCV', defaultCharges: 400, subtype: 'Routine' },
  { label: 'PHOSPHOROUS', value: 'PHOSPHOROUS', defaultCharges: 800, subtype: 'Routine' },
  { label: 'PLATELETS COUNT', value: 'PLATELETS COUNT', defaultCharges: 400, subtype: 'Routine' },
  { label: 'POTTASIUM', value: 'POTTASIUM', defaultCharges: 500, subtype: 'Routine' },
  { label: 'PROGESTERONE', value: 'PROGESTERONE', defaultCharges: 4500, subtype: 'Special' },
  { label: 'PROLACTIN', value: 'PROLACTIN', defaultCharges: 2000, subtype: 'Special' },
  { label: 'PROTEIN A/G RATIO', value: 'PROTEIN A/G RATIO', defaultCharges: 800, subtype: 'Routine' },
  { label: 'PSA', value: 'PSA', defaultCharges: 2500, subtype: 'Special' },
  { label: 'PT INR (PROTHROMBIN TIME)', value: 'PT INR (PROTHROMBIN TIME)', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'PT URINE PREGNENCY TEST', value: 'PT URINE PREGNENCY TEST', defaultCharges: 400, subtype: 'Routine' },
  { label: 'RA FACTOR', value: 'RA FACTOR', defaultCharges: 800, subtype: 'Routine' },
  { label: 'RBS (RANDOM BLOOD SUGAR)', value: 'RBS (RANDOM BLOOD SUGAR)', defaultCharges: 400, subtype: 'Routine' },
  { label: 'S.IgE', value: 'S.IgE', defaultCharges: 1500, subtype: 'Special' },
  { label: 'SEMEN ANALYSIS', value: 'SEMEN ANALYSIS', defaultCharges: 1200, subtype: 'Routine' },
  { label: 'SGPT', value: 'SGPT', defaultCharges: 400, subtype: 'Routine' },
  { label: 'SODIUM', value: 'SODIUM', defaultCharges: 400, subtype: 'Routine' },
  { label: 'SPUTUM C/S', value: 'SPUTUM C/S', defaultCharges: 2000, subtype: 'Special' },
  { label: 'SPUTUM DR', value: 'SPUTUM DR', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'STOOL C/S', value: 'STOOL C/S', defaultCharges: 2000, subtype: 'Special' },
  { label: 'STOOL D/R', value: 'STOOL D/R', defaultCharges: 400, subtype: 'Routine' },
  { label: 'STOOL D/R & OCCULT BLOOD', value: 'STOOL D/R & OCCULT BLOOD', defaultCharges: 500, subtype: 'Special' },
  { label: 'T/G', value: 'T/G', defaultCharges: 800, subtype: 'Routine' },
  { label: 'T3', value: 'T3', defaultCharges: 1500, subtype: 'Special' },
  { label: 'T4', value: 'T4', defaultCharges: 1500, subtype: 'Special' },
  { label: 'TESTOSTERONE', value: 'TESTOSTERONE', defaultCharges: 2500, subtype: 'Special' },
  { label: 'TIBC', value: 'TIBC', defaultCharges: 1000, subtype: 'Special' },
  { label: 'TLC', value: 'TLC', defaultCharges: 400, subtype: 'Routine' },
  { label: 'TROP I', value: 'TROP I', defaultCharges: 2500, subtype: 'Special' },
  { label: 'TSH', value: 'TSH', defaultCharges: 1500, subtype: 'Special' },
  { label: 'TYPHIDOT', value: 'TYPHIDOT', defaultCharges: 1000, subtype: 'Routine' },
  { label: 'UREA', value: 'UREA', defaultCharges: 400, subtype: 'Routine' },
  { label: 'URIC ACID', value: 'URIC ACID', defaultCharges: 400, subtype: 'Routine' },
  { label: 'URINE D/R', value: 'URINE D/R', defaultCharges: 200, subtype: 'Routine' },
  { label: 'VDRL', value: 'VDRL', defaultCharges: 800, subtype: 'Routine' },
  { label: 'VIT- B-12', value: 'VIT- B-12', defaultCharges: 3500, subtype: 'Special' },
  { label: 'VITAMIN D3', value: 'VITAMIN D3', defaultCharges: 2500, subtype: 'Special' },
  { label: 'WIDAL', value: 'WIDAL', defaultCharges: 600, subtype: 'Routine' },
];

/**
 * Returns default charges for a given document type and subtype.
 * @param {string} docType - 'X-Ray' | 'Ultrasound' | 'Lab'
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
  if (docType === 'Lab') {
    const found = LAB_TYPES.find(t => t.value === subType);
    return found ? found.defaultCharges : 500;
  }
  return 0;
};
