import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as mammoth from 'mammoth';
import { buildApiUrl } from '../config/api';

/**
 * Converts any non-JPEG/non-PNG image blob (WebP, BMP, GIF, etc.) into a PNG Uint8Array
 * via an offscreen HTML canvas.
 *
 * @param {ArrayBuffer} arrayBuffer
 * @param {string} mimeType
 * @returns {Promise<Uint8Array>}
 */
async function convertImageToPngBytes(arrayBuffer, mimeType = 'image/png') {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([arrayBuffer], { type: mimeType });
      const blobUrl = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Canvas 2D context not available'));
          }
          // White background in case of transparent scans
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);

          canvas.toBlob(async (pngBlob) => {
            if (!pngBlob) {
              return reject(new Error('Canvas PNG export failed'));
            }
            const buffer = await pngBlob.arrayBuffer();
            resolve(new Uint8Array(buffer));
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobUrl);
        reject(new Error('Failed to load image for canvas conversion'));
      };

      img.src = blobUrl;
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Wraps text into lines that fit within a maximum width.
 *
 * @param {string} text
 * @param {import('pdf-lib').PDFFont} font
 * @param {number} fontSize
 * @param {number} maxWidth
 * @returns {string[]}
 */
function wrapText(text, font, fontSize, maxWidth) {
  if (!text) return [''];
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      // Check if word itself exceeds maxWidth
      if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
        // Break word character by character
        let sub = '';
        for (const char of word) {
          if (font.widthOfTextAtSize(sub + char, fontSize) <= maxWidth) {
            sub += char;
          } else {
            lines.push(sub);
            sub = char;
          }
        }
        currentLine = sub;
      } else {
        currentLine = word;
      }
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
}

/**
 * Generates a unified PDF dossier containing cover page, diagnostic scans,
 * converted DOCX ultrasound reports, and merged PDFs in date-ascending order.
 *
 * @param {Object} patient - Patient data { mrNumber, name, age, ageMonths, phone, bloodGroup, fatherName }
 * @param {Array} documents - List of Document objects { id, type, fileName, uploadedAt, notes }
 * @param {Function} [onProgress] - Progress callback (statusMessage, percent)
 * @returns {Promise<{ success: boolean, filename: string, blob: Blob }>}
 */
export async function generatePatientDossierPdf(patient, documents, onProgress = () => {}) {
  if (!patient || !Array.isArray(documents)) {
    throw new Error('Invalid patient or documents data provided to PDF generator.');
  }

  // Sort documents strictly by uploadedAt in ascending order
  const sortedDocs = [...documents].sort((a, b) => {
    const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
    const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
    return dateA - dateB;
  });

  onProgress('Initializing PDF document...', 5);
  const pdfDoc = await PDFDocument.create();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // A4 dimensions: 595.28 x 841.89 points
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

  // ----------------------------------------------------
  // COVER / DOSSIER HEADER PAGE
  // ----------------------------------------------------
  onProgress('Building patient dossier summary...', 10);
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Top header banner background (Brand Blue: hsl(221, 83%, 53%) -> rgb(0.145, 0.388, 0.922))
  coverPage.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - 120,
    width: CONTENT_WIDTH,
    height: 80,
    color: rgb(0.145, 0.388, 0.922),
  });

  // Top header text
  coverPage.drawText('ZUBAIDA DIAGNOSTICS', {
    x: MARGIN + 20,
    y: PAGE_HEIGHT - 70,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('COMPREHENSIVE PATIENT MEDICAL DOSSIER', {
    x: MARGIN + 20,
    y: PAGE_HEIGHT - 92,
    size: 11,
    font: fontBold,
    color: rgb(0.85, 0.92, 1),
  });

  const generatedDateStr = new Date().toLocaleString();
  coverPage.drawText(`Generated on: ${generatedDateStr}`, {
    x: MARGIN + 20,
    y: PAGE_HEIGHT - 110,
    size: 9,
    font: fontRegular,
    color: rgb(0.9, 0.95, 1),
  });

  // Patient Information Card Background
  let currentY = PAGE_HEIGHT - 145;
  coverPage.drawRectangle({
    x: MARGIN,
    y: currentY - 110,
    width: CONTENT_WIDTH,
    height: 110,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.89, 0.95),
    borderWidth: 1,
  });

  coverPage.drawText('PATIENT INFORMATION', {
    x: MARGIN + 16,
    y: currentY - 24,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  // Grid details
  const col1X = MARGIN + 16;
  const col2X = MARGIN + 270;

  // Row 1
  coverPage.drawText(`MR Number: ${patient.mrNumber || 'N/A'}`, {
    x: col1X,
    y: currentY - 48,
    size: 10,
    font: fontBold,
    color: rgb(0.85, 0.15, 0.15), // Red highlight for MR Number
  });

  coverPage.drawText(`Patient Name: ${patient.name || 'N/A'}`, {
    x: col2X,
    y: currentY - 48,
    size: 10,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  // Row 2
  const ageDisplay = patient.age !== null && patient.age !== undefined
    ? `${patient.age} Yrs${patient.ageMonths ? ` ${patient.ageMonths} Mos` : ''}`
    : 'N/A';

  coverPage.drawText(`Age: ${ageDisplay}`, {
    x: col1X,
    y: currentY - 68,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  coverPage.drawText(`Father / Guardian: ${patient.fatherName || 'N/A'}`, {
    x: col2X,
    y: currentY - 68,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Row 3
  coverPage.drawText(`Contact Phone: ${patient.phone || 'N/A'}`, {
    x: col1X,
    y: currentY - 88,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.25, 0.35),
  });

  // Medical Alert Banner if patient has Fixed Allergies or Co-Morbid Factors
  const allergy = patient.fixedAllergies && String(patient.fixedAllergies).trim() !== '' && String(patient.fixedAllergies).trim().toLowerCase() !== 'null'
    ? String(patient.fixedAllergies).trim()
    : '';
  const comorbid = patient.coMorbidFactor && String(patient.coMorbidFactor).trim() !== '' && String(patient.coMorbidFactor).trim().toLowerCase() !== 'null'
    ? String(patient.coMorbidFactor).trim()
    : '';

  if (allergy || comorbid) {
    currentY -= 120;
    const bannerHeight = 36 + (allergy ? 14 : 0) + (comorbid ? 14 : 0);
    coverPage.drawRectangle({
      x: MARGIN,
      y: currentY - bannerHeight,
      width: CONTENT_WIDTH,
      height: bannerHeight,
      color: rgb(0.98, 0.92, 0.92),
      borderColor: rgb(0.85, 0.2, 0.2),
      borderWidth: 1.5,
    });

    coverPage.drawText('MEDICAL ALERT — HIGH ATTENTION REQUIRED', {
      x: MARGIN + 16,
      y: currentY - 18,
      size: 10,
      font: fontBold,
      color: rgb(0.8, 0.1, 0.1),
    });

    let alertLineY = currentY - 32;
    if (allergy) {
      coverPage.drawText(`Fixed Allergy: ${allergy}`, {
        x: MARGIN + 16,
        y: alertLineY,
        size: 9,
        font: fontBold,
        color: rgb(0.7, 0.1, 0.1),
      });
      alertLineY -= 14;
    }
    if (comorbid) {
      coverPage.drawText(`Co-Morbid Factor: ${comorbid}`, {
        x: MARGIN + 16,
        y: alertLineY,
        size: 9,
        font: fontBold,
        color: rgb(0.7, 0.1, 0.1),
      });
    }

    currentY -= (bannerHeight + 15);
  } else {
    currentY -= 135;
  }

  // Document Summary Table Header
  coverPage.drawText(`INCLUDED MEDICAL RECORDS (${sortedDocs.length} FILES)`, {
    x: MARGIN,
    y: currentY,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  currentY -= 16;
  // Table Header row
  coverPage.drawRectangle({
    x: MARGIN,
    y: currentY - 18,
    width: CONTENT_WIDTH,
    height: 22,
    color: rgb(0.9, 0.93, 0.98),
    borderColor: rgb(0.8, 0.85, 0.92),
    borderWidth: 1,
  });

  coverPage.drawText('#', { x: MARGIN + 12, y: currentY - 12, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  coverPage.drawText('DOCUMENT TYPE', { x: MARGIN + 60, y: currentY - 12, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) });
  coverPage.drawText('RECORD DATE & TIME', { x: MARGIN + 310, y: currentY - 12, size: 9, font: fontBold, color: rgb(0.1, 0.15, 0.25) });

  currentY -= 22;

  // Populate Table Rows on Cover
  let tableRowsCount = 0;
  for (let i = 0; i < sortedDocs.length; i++) {
    if (currentY < 70) break; // Don't overflow cover page
    const doc = sortedDocs[i];
    const rowColor = i % 2 === 0 ? rgb(1, 1, 1) : rgb(0.98, 0.99, 1);

    coverPage.drawRectangle({
      x: MARGIN,
      y: currentY - 16,
      width: CONTENT_WIDTH,
      height: 18,
      color: rowColor,
      borderColor: rgb(0.88, 0.9, 0.95),
      borderWidth: 0.5,
    });

    const dateFormatted = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A';

    coverPage.drawText(String(i + 1), { x: MARGIN + 12, y: currentY - 11, size: 8, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });
    coverPage.drawText(String(doc.type || 'General'), { x: MARGIN + 60, y: currentY - 11, size: 8, font: fontBold, color: rgb(0.15, 0.2, 0.3) });
    coverPage.drawText(dateFormatted, { x: MARGIN + 310, y: currentY - 11, size: 8, font: fontRegular, color: rgb(0.3, 0.35, 0.45) });

    currentY -= 18;
    tableRowsCount++;
  }

  if (tableRowsCount < sortedDocs.length) {
    coverPage.drawText(`... and ${sortedDocs.length - tableRowsCount} more document(s) attached below.`, {
      x: MARGIN + 8,
      y: currentY - 12,
      size: 8,
      font: fontOblique,
      color: rgb(0.4, 0.45, 0.55),
    });
  }

  // Footer on cover page
  coverPage.drawText('Zubaida Diagnostics - Confidential Diagnostic Record', {
    x: MARGIN,
    y: 25,
    size: 8,
    font: fontRegular,
    color: rgb(0.5, 0.55, 0.65),
  });

  // ----------------------------------------------------
  // PROCESS EACH DOCUMENT IN DATE ASCENDING ORDER
  // ----------------------------------------------------
  const totalDocs = sortedDocs.length;
  for (let idx = 0; idx < totalDocs; idx++) {
    const doc = sortedDocs[idx];
    const docNum = idx + 1;
    const progressPercent = Math.round(15 + ((idx / totalDocs) * 75));
    onProgress(`Processing document ${docNum} of ${totalDocs} (${doc.type || 'File'})...`, progressPercent);

    if (!doc.fileName) continue;

    const fileUrl = buildApiUrl(`/document/${doc.fileName}`);
    const dateFormatted = doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'N/A';
    const isDocx = /\.(docx|doc)$/i.test(doc.fileName);
    const isPdf = /\.pdf$/i.test(doc.fileName);

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();

      if (isPdf) {
        // Load and copy existing PDF pages
        const srcPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pageIndices = srcPdf.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(srcPdf, pageIndices);

        copiedPages.forEach((page) => {
          pdfDoc.addPage(page);
        });
      } else if (isDocx) {
        // Parse docx with mammoth and render onto styled A4 pages
        let extractedText = '';
        try {
          const mammothResult = await mammoth.extractRawText({ arrayBuffer });
          extractedText = mammothResult.value || '';
        } catch (docxErr) {
          console.warn('[pdfDossierGenerator] Mammoth raw text extraction fallback:', docxErr);
          extractedText = `Ultrasound Report\nFile: ${doc.fileName}\n(Unable to fully parse docx content automatically)`;
        }

        const paragraphs = extractedText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        let docxPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let docxY = PAGE_HEIGHT - MARGIN;

        const drawDocxHeader = (pageObj, isContinuation = false) => {
          pageObj.drawRectangle({
            x: MARGIN,
            y: PAGE_HEIGHT - 65,
            width: CONTENT_WIDTH,
            height: 35,
            color: rgb(0.93, 0.96, 1),
            borderColor: rgb(0.7, 0.8, 0.95),
            borderWidth: 1,
          });

          pageObj.drawText(`RECORD #${docNum}: ${doc.type?.toUpperCase() || 'ULTRASOUND REPORT'}${isContinuation ? ' (Cont.)' : ''}`, {
            x: MARGIN + 10,
            y: PAGE_HEIGHT - 48,
            size: 10,
            font: fontBold,
            color: rgb(0.1, 0.25, 0.65),
          });

          pageObj.drawText(`MR #${patient.mrNumber} - ${patient.name || 'Patient'} | Date: ${dateFormatted}`, {
            x: MARGIN + 10,
            y: PAGE_HEIGHT - 60,
            size: 8,
            font: fontRegular,
            color: rgb(0.3, 0.35, 0.45),
          });
        };

        drawDocxHeader(docxPage, false);
        docxY = PAGE_HEIGHT - 85;

        for (const para of paragraphs) {
          const isHeading = /^[A-Z0-9\s:_-]{3,40}$/.test(para) || para.endsWith(':') || para.toUpperCase().includes('IMPRESSION') || para.toUpperCase().includes('FINDINGS') || para.toUpperCase().includes('ULTRASOUND');
          const fontSize = isHeading ? 10 : 9;
          const font = isHeading ? fontBold : fontRegular;
          const fontColor = isHeading ? rgb(0.1, 0.15, 0.3) : rgb(0.2, 0.25, 0.35);
          const lineHeight = fontSize + 4;

          const lines = wrapText(para, font, fontSize, CONTENT_WIDTH - 20);

          for (const line of lines) {
            if (docxY - lineHeight < MARGIN + 20) {
              // Add a new page
              docxPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
              drawDocxHeader(docxPage, true);
              docxY = PAGE_HEIGHT - 85;
            }

            docxPage.drawText(line, {
              x: MARGIN + 10,
              y: docxY,
              size: fontSize,
              font,
              color: fontColor,
            });

            docxY -= lineHeight;
          }

          docxY -= 4; // Paragraph spacing
        }
      } else {
        // Handle images (JPEG, PNG, WebP, BMP, GIF, etc.)
        let embeddedImage = null;

        // Check if raw JPEG
        const bytes = new Uint8Array(arrayBuffer);
        const isJpgBytes = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
        const isPngBytes = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;

        if (isJpgBytes) {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } else if (isPngBytes) {
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          // Convert WebP / BMP / GIF / transparent PNG via canvas to standard PNG
          try {
            const pngBytes = await convertImageToPngBytes(arrayBuffer);
            embeddedImage = await pdfDoc.embedPng(pngBytes);
          } catch (convErr) {
            console.warn('[pdfDossierGenerator] Canvas conversion fallback to JPEG:', convErr);
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          }
        }

        if (embeddedImage) {
          const imgDims = embeddedImage.scale(1);
          const imgWidth = imgDims.width;
          const imgHeight = imgDims.height;

          // Header area
          const headerHeight = 50;
          const availWidth = CONTENT_WIDTH;
          const availHeight = PAGE_HEIGHT - (MARGIN * 2) - headerHeight;

          // Scale image to fit within available space preserving aspect ratio
          const scaleFactor = Math.min(availWidth / imgWidth, availHeight / imgHeight, 1);
          const targetWidth = imgWidth * scaleFactor;
          const targetHeight = imgHeight * scaleFactor;

          const imgPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

          // Document Header Bar
          imgPage.drawRectangle({
            x: MARGIN,
            y: PAGE_HEIGHT - 65,
            width: CONTENT_WIDTH,
            height: 35,
            color: rgb(0.95, 0.97, 1),
            borderColor: rgb(0.8, 0.86, 0.95),
            borderWidth: 1,
          });

          imgPage.drawText(`RECORD #${docNum}: ${doc.type?.toUpperCase() || 'SCAN IMAGE'}`, {
            x: MARGIN + 10,
            y: PAGE_HEIGHT - 48,
            size: 10,
            font: fontBold,
            color: rgb(0.1, 0.25, 0.65),
          });

          imgPage.drawText(`MR #${patient.mrNumber} - ${patient.name || 'Patient'} | Uploaded: ${dateFormatted}`, {
            x: MARGIN + 10,
            y: PAGE_HEIGHT - 60,
            size: 8,
            font: fontRegular,
            color: rgb(0.3, 0.35, 0.45),
          });

          // Center the image in the remaining area
          const posX = MARGIN + ((availWidth - targetWidth) / 2);
          const posY = MARGIN + ((availHeight - targetHeight) / 2);

          imgPage.drawImage(embeddedImage, {
            x: posX,
            y: posY,
            width: targetWidth,
            height: targetHeight,
          });
        }
      }
    } catch (docErr) {
      console.error(`[pdfDossierGenerator] Error processing document ${doc.fileName}:`, docErr);
      // Create a clean error notice page so entire document doesn't fail
      const errorPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      errorPage.drawRectangle({
        x: MARGIN,
        y: PAGE_HEIGHT - 120,
        width: CONTENT_WIDTH,
        height: 60,
        color: rgb(1, 0.95, 0.95),
        borderColor: rgb(0.9, 0.4, 0.4),
        borderWidth: 1,
      });

      errorPage.drawText(`RECORD #${docNum}: ${doc.type || 'DOCUMENT'} - ATTACHMENT NOTICE`, {
        x: MARGIN + 15,
        y: PAGE_HEIGHT - 80,
        size: 10,
        font: fontBold,
        color: rgb(0.8, 0.1, 0.1),
      });

      errorPage.drawText(`Document Type: ${doc.type || 'General Document'} (Date: ${dateFormatted})`, {
        x: MARGIN + 15,
        y: PAGE_HEIGHT - 95,
        size: 9,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });

      errorPage.drawText(`Note: This file could not be automatically rendered into the PDF (${docErr.message}).`, {
        x: MARGIN + 15,
        y: PAGE_HEIGHT - 110,
        size: 8,
        font: fontOblique,
        color: rgb(0.5, 0.2, 0.2),
      });
    }
  }

  onProgress('Finalizing and compressing PDF...', 95);
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  // Generate clean filename: MR_<MRNumber>_<PatientName>_Dossier.pdf
  const sanitizedName = (patient.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `MR_${patient.mrNumber}_${sanitizedName}_Dossier.pdf`;

  onProgress('Dossier ready!', 100);
  return { success: true, filename, blob };
}
