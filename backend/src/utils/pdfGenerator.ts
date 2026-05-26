import PDFDocument from 'pdfkit';
import { Response } from 'express';

export class PDFGenerator {
    static generateInvoice(
        res: Response,
        title: string,
        docId: string,
        date: Date,
        partnerName: string,
        items: any[],
        totalAmount?: number
    ) {
        const doc = new PDFDocument({ margin: 50 });

        // Pipe PDF stream to Express Response
        doc.pipe(res);

        // --- Header Section ---
        doc.fillColor('#0f172a') // Slate 900
            .fontSize(20)
            .font('Helvetica-Bold')
            .text('NEXUS ERP', 50, 45);

        doc.fillColor('#475569') // Slate 600
            .fontSize(10)
            .font('Helvetica')
            .text('123 Enterprise Way, Industrial Zone', 50, 70)
            .text('Email: billing@nexus-erp.com | Phone: +1-555-0199', 50, 85);

        doc.fillColor('#0f172a')
            .fontSize(16)
            .font('Helvetica-Bold')
            .text(title.toUpperCase(), 350, 45, { align: 'right' });

        // Border line under header
        doc.moveTo(50, 110).lineTo(550, 110).strokeColor('#cbd5e1').stroke();

        // --- Details Section ---
        doc.fontSize(10).fillColor('#475569').font('Helvetica');
        doc.text(`Document ID: ${docId.slice(-8).toUpperCase()}`, 50, 130);
        doc.text(`Date: ${new Date(date).toLocaleDateString()}`, 50, 145);

        // Partner details
        doc.font('Helvetica-Bold').text('Bill/Ship To:', 350, 130);
        doc.fillColor('#0f172a').font('Helvetica');
        doc.text(partnerName, 350, 145);

        // --- Table Headers ---
        let y = 190;
        doc.rect(50, y, 500, 20).fill('#1e293b'); // Dark background
        doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold');

        doc.text('Item Description', 60, y + 5);
        doc.text('Qty', 300, y + 5, { width: 40, align: 'right' });
        doc.text('Unit Price', 360, y + 5, { width: 80, align: 'right' });
        doc.text('Total', 460, y + 5, { width: 80, align: 'right' });

        // --- Table Rows ---
        doc.fillColor('#0f172a').font('Helvetica');
        y = 210;

        items.forEach((item, index) => {
            const itemName = item.name || 'Standard Item';
            const qty = item.quantity || 0;
            const rate = item.price || item.cost || 0;
            const total = item.total || qty * rate;

            // Alternate row background colors
            if (index % 2 === 1) {
                doc.rect(50, y, 500, 20).fill('#f8fafc');
            }

            doc.fillColor('#334155');
            doc.text(itemName, 60, y + 5);
            doc.text(qty.toString(), 300, y + 5, { width: 40, align: 'right' });
            doc.text(`$${rate.toFixed(2)}`, 360, y + 5, { width: 80, align: 'right' });
            doc.text(`$${total.toFixed(2)}`, 460, y + 5, { width: 80, align: 'right' });

            y += 20;

            // Page breaking check
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });

        // Bottom border line
        doc.moveTo(50, y + 10)
            .lineTo(550, y + 10)
            .strokeColor('#cbd5e1')
            .stroke();

        // --- Totals Section ---
        y += 20;
        if (totalAmount !== undefined) {
            doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold');
            doc.text('Total Amount:', 340, y);
            doc.text(`$${totalAmount.toFixed(2)}`, 460, y, { width: 80, align: 'right' });
        }

        // --- Footer Section ---
        doc.fontSize(8)
            .fillColor('#94a3b8')
            .font('Helvetica')
            .text('Thank you for your business. Generated automatically by Nexus ERP.', 50, 750, { align: 'center' });

        // End document creation
        doc.end();
    }
}
