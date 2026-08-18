import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CERT_DIR = path.join(process.cwd(), 'uploads', 'certificates');
if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });

export function generateCertificateNumber(eventId) {
  return `CERT-${eventId.toString().slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function generateVerificationCode() {
  return crypto.randomBytes(8).toString('hex');
}

export async function generateCertificatePdf({ attendeeName, eventTitle, eventDate, certificateNumber, verificationCode }) {
  const fileName = `${certificateNumber}.pdf`;
  const filePath = path.join(CERT_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0b1220');
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(2).stroke('#6366f1');

    doc.fillColor('#a5b4fc').fontSize(14).font('Helvetica-Bold').text('SMARTEVENT NEPAL', 0, 60, { align: 'center' });
    doc.fillColor('#ffffff').fontSize(30).font('Helvetica-Bold').text('Certificate of Participation', 0, 100, { align: 'center' });

    doc.fillColor('#cbd5e1').fontSize(14).font('Helvetica').text('This certifies that', 0, 170, { align: 'center' });
    doc.fillColor('#ffffff').fontSize(26).font('Helvetica-Bold').text(attendeeName, 0, 200, { align: 'center' });
    doc.fillColor('#cbd5e1').fontSize(14).font('Helvetica').text('successfully participated in', 0, 245, { align: 'center' });
    doc.fillColor('#a5b4fc').fontSize(20).font('Helvetica-Bold').text(eventTitle, 0, 270, { align: 'center' });
    doc.fillColor('#94a3b8').fontSize(12).font('Helvetica').text(new Date(eventDate).toDateString(), 0, 305, { align: 'center' });

    doc.fillColor('#64748b').fontSize(10)
      .text(`Certificate No: ${certificateNumber}`, 60, doc.page.height - 90)
      .text(`Verify at: /api/certificates/verify/${verificationCode}`, 60, doc.page.height - 75);

    doc.end();
    stream.on('finish', () => resolve({ filePath, fileName }));
    stream.on('error', reject);
  });
}
