const PDFDocument = require('pdfkit');

function streamInvoicePDF(invoice, res) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-disposition', `attachment; filename=Invoice-${invoice.invoiceNumber}.pdf`);
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(20).text('INVOICE', { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text(`Invoice No: ${invoice.invoiceNumber}`);
  doc.text(`Date: ${invoice.issuedAt.toISOString().slice(0,10)}`);
  doc.moveDown();

  doc.text('Items:', { underline: true });
  invoice.items.forEach(item => {
    doc.text(`${item.description} — ${item.qty} x ${item.rate} = ${item.amount}`);
  });

  doc.moveDown();
  doc.text(`Subtotal: ${invoice.subTotal}`);
  doc.text(`Tax: ${invoice.tax}`);
  doc.text(`Total: ${invoice.total}`);

  doc.end();
}

module.exports = { streamInvoicePDF };
