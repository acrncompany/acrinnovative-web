/**
 * Decide what a CV file really is by looking at its CONTENT (never trust the file name or the browser's mime type).
 * Accepted: PDF, DOC (old Word) and DOCX (new Word). Anything else returns null.
 */
export type DocumentType = { ext: '.pdf' | '.doc' | '.docx'; mime: string };

const OLE_HEADER = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]); // old Microsoft Office files
const ZIP_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK.." (zip: docx, xlsx, ...)

export function detectDocumentType(buf: Buffer): DocumentType | null {
  if (buf.length < 16) return null;

  // PDF: the file starts with "%PDF-" (a few viewers allow up to 1 KB of leading junk; we do not).
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: '.pdf', mime: 'application/pdf' };

  // DOCX: a zip file that contains the Word folder ("word/...").
  if (buf.subarray(0, 4).equals(ZIP_HEADER) && buf.includes('word/') && buf.includes('[Content_Types].xml')) {
    return { ext: '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  }

  // DOC: an OLE2 container that has a "WordDocument" stream (Excel/PowerPoint files do not).
  if (buf.subarray(0, 8).equals(OLE_HEADER) && buf.includes(Buffer.from('WordDocument', 'utf16le'))) {
    return { ext: '.doc', mime: 'application/msword' };
  }
  return null;
}
