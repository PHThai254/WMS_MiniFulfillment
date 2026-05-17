import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';

export const barcodePdfService = {
    /**
     * Generates a PDF containing a barcode for the given SKU/Barcode string.
     * @param barcodeData The string to encode in the barcode
     * @param filename The name of the downloaded PDF file
     * @param productName Optional product name to display below the barcode
     */
    generateSingleBarcodePdf: (barcodeData: string, filename: string = 'barcode.pdf', productName?: string) => {
        // Create a canvas to render the barcode
        const canvas = document.createElement('canvas');

        try {
            // Render barcode to canvas
            JsBarcode(canvas, barcodeData, {
                format: 'CODE128',
                displayValue: true,
                fontSize: 16,
                margin: 10,
            });

            // Initialize PDF (landscape, mm, standard sticker size like 60x40mm)
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: [60, 40]
            });

            // Get image data from canvas
            const imgData = canvas.toDataURL('image/png');

            // Add image to PDF
            // center the image: width=50, height=25
            doc.addImage(imgData, 'PNG', 5, 5, 50, 25);

            if (productName) {
                doc.setFontSize(10);
                doc.text(productName, 30, 35, { align: 'center' });
            }

            // Download the PDF
            doc.save(filename);
            return true;
        } catch (error) {
            console.error('Error generating barcode PDF:', error);
            throw new Error('Không thể tạo file PDF mã vạch. Vui lòng kiểm tra lại định dạng mã.');
        }
    },

    /**
     * Generates a PDF containing multiple barcodes for printing on A4 paper
     * @param items List of objects containing barcode and product name
     */
    generateMultipleBarcodesPdf: (items: { barcode: string; name?: string }[], filename: string = 'barcodes.pdf') => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const x = 10;
        let y = 10;
        const barcodeWidth = 60;
        const barcodeHeight = 30;
        const paddingX = 10;
        const paddingY = 15;
        const itemsPerRow = 3;

        items.forEach((item, index) => {
            const canvas = document.createElement('canvas');

            try {
                JsBarcode(canvas, item.barcode, {
                    format: 'CODE128',
                    displayValue: true,
                    fontSize: 14,
                    margin: 5,
                });

                const imgData = canvas.toDataURL('image/png');

                // Calculate position
                const col = index % itemsPerRow;
                const row = Math.floor(index / itemsPerRow);

                // Check if we need a new page (e.g., 8 rows per A4 page)
                if (row > 0 && row % 8 === 0 && col === 0) {
                    doc.addPage();
                    y = 10; // reset y
                }

                const currentX = x + col * (barcodeWidth + paddingX);
                const currentY = y + (row % 8) * (barcodeHeight + paddingY);

                doc.addImage(imgData, 'PNG', currentX, currentY, barcodeWidth, barcodeHeight);

                if (item.name) {
                    doc.setFontSize(8);
                    // Truncate name if too long
                    const displayName = item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name;
                    doc.text(displayName, currentX + (barcodeWidth / 2), currentY + barcodeHeight + 4, { align: 'center' });
                }
            } catch (err) {
                console.warn(`Could not render barcode for: ${item.barcode}`, err);
            }
        });

        doc.save(filename);
    }
};
