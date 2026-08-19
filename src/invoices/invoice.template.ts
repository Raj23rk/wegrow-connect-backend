// ============================================================
// INVOICE HTML TEMPLATE
//
// Generates a professional payment invoice.
// Used by InvoicesService to render HTML → PDF via puppeteer.
// ============================================================

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceTemplateData {
  invoiceNumber: string;
  issuedDate: string;
  dueDate?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === 'INR' ? '₹' : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

export function generateInvoiceHtml(data: InvoiceTemplateData): string {
  const itemRows = data.items
    .map(
      (item, idx) => `
      <tr class="${idx % 2 === 0 ? 'row-even' : 'row-odd'}">
        <td class="td-desc">${item.description}</td>
        <td class="td-center">${item.quantity}</td>
        <td class="td-right">${formatCurrency(item.unitPrice, data.currency)}</td>
        <td class="td-right td-amount">${formatCurrency(item.amount, data.currency)}</td>
      </tr>
    `,
    )
    .join('');

  const statusColor =
    data.status === 'PAID'
      ? '#16a34a'
      : data.status === 'ISSUED'
        ? '#2563eb'
        : '#d97706';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${data.invoiceNumber}</title>
  <style>

    /* ============================================================
       RESET
       ============================================================ */

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body {
      width: 794px;
      font-family: Arial, Helvetica, sans-serif;
      background: #ffffff;
      color: #1f2937;
      font-size: 13px;
    }

    /* ============================================================
       WRAPPER
       ============================================================ */

    .page {
      width: 794px;
      min-height: 1123px;
      padding: 50px 55px;
      background: #ffffff;
      position: relative;
    }

    /* ============================================================
       HEADER
       ============================================================ */

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 3px solid #205894;
    }

    .brand-name {
      font-size: 26px;
      font-weight: bold;
      color: #205894;
      letter-spacing: 1px;
    }

    .brand-tagline {
      font-size: 11px;
      color: #888;
      margin-top: 3px;
      letter-spacing: 1px;
    }

    .invoice-label {
      text-align: right;
    }

    .invoice-label h1 {
      font-size: 34px;
      color: #205894;
      font-weight: bold;
      letter-spacing: 2px;
    }

    .invoice-num {
      font-size: 12px;
      color: #555;
      margin-top: 4px;
    }

    .status-badge {
      display: inline-block;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: bold;
      color: #ffffff;
      background: ${statusColor};
      margin-top: 6px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    /* ============================================================
       META ROW
       ============================================================ */

    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
    }

    .meta-block h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #888;
      margin-bottom: 6px;
    }

    .meta-block p {
      font-size: 13px;
      color: #1f2937;
      line-height: 1.7;
    }

    .meta-block .client-name {
      font-size: 15px;
      font-weight: bold;
      color: #205894;
    }

    /* ============================================================
       TABLE
       ============================================================ */

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }

    .items-table thead tr {
      background: #205894;
      color: #ffffff;
    }

    .items-table thead th {
      padding: 10px 14px;
      text-align: left;
      font-size: 12px;
      letter-spacing: 0.5px;
    }

    .items-table thead th.th-right { text-align: right; }
    .items-table thead th.th-center { text-align: center; }

    .row-even { background: #f8fafc; }
    .row-odd  { background: #ffffff; }

    .td-desc   { padding: 10px 14px; color: #374151; }
    .td-center { padding: 10px 14px; text-align: center; color: #374151; }
    .td-right  { padding: 10px 14px; text-align: right; color: #374151; }
    .td-amount { font-weight: bold; color: #205894; }

    /* ============================================================
       TOTALS
       ============================================================ */

    .totals-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 36px;
    }

    .totals-box {
      width: 260px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      font-size: 13px;
      border-bottom: 1px solid #e5e7eb;
      color: #555;
    }

    .totals-row.total-final {
      font-size: 16px;
      font-weight: bold;
      color: #205894;
      border-bottom: 2px solid #205894;
      border-top: 2px solid #205894;
      padding: 10px 0;
      margin-top: 4px;
    }

    /* ============================================================
       NOTES
       ============================================================ */

    .notes-section {
      background: #f0f4ff;
      border-left: 4px solid #f5a51b;
      padding: 14px 18px;
      margin-bottom: 30px;
      border-radius: 0 6px 6px 0;
    }

    .notes-section h4 {
      font-size: 12px;
      color: #205894;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }

    .notes-section p {
      font-size: 12px;
      color: #555;
      line-height: 1.6;
    }

    /* ============================================================
       FOOTER
       ============================================================ */

    .footer {
      position: absolute;
      bottom: 40px;
      left: 55px;
      right: 55px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 2px solid #f5a51b;
      padding-top: 14px;
    }

    .footer-brand {
      font-size: 13px;
      font-weight: bold;
      color: #205894;
    }

    .footer-note {
      font-size: 11px;
      color: #888;
      text-align: right;
    }

  </style>
</head>
<body>

<div class="page">

  <!-- ============================================================
       HEADER
       ============================================================ -->

  <div class="header">

    <div>
      <div class="brand-name">WeGrow Skill Campus</div>
      <div class="brand-tagline">Empowering Growth Through Learning</div>
    </div>

    <div class="invoice-label">
      <h1>INVOICE</h1>
      <div class="invoice-num">${data.invoiceNumber}</div>
      <span class="status-badge">${data.status}</span>
    </div>

  </div>

  <!-- ============================================================
       META ROW
       ============================================================ -->

  <div class="meta-row">

    <div class="meta-block">
      <h3>Bill To</h3>
      <p class="client-name">${data.clientName}</p>
      <p>${data.clientEmail}</p>
      ${data.clientPhone ? `<p>${data.clientPhone}</p>` : ''}
    </div>

    <div class="meta-block">
      <h3>Invoice Details</h3>
      <p><strong>Invoice Date:</strong> ${data.issuedDate}</p>
      ${data.dueDate ? `<p><strong>Due Date:</strong> ${data.dueDate}</p>` : ''}
      <p><strong>Currency:</strong> ${data.currency}</p>
    </div>

    <div class="meta-block">
      <h3>From</h3>
      <p><strong>WeGrow Skill Campus</strong></p>
      <p>WeGrow Connect Platform</p>
      <p>kumarrk23dev@gmail.com</p>
    </div>

  </div>

  <!-- ============================================================
       ITEMS TABLE
       ============================================================ -->

  <table class="items-table">
    <thead>
      <tr>
        <th>Description</th>
        <th class="th-center">Qty</th>
        <th class="th-right">Unit Price</th>
        <th class="th-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- ============================================================
       TOTALS
       ============================================================ -->

  <div class="totals-section">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(data.subtotal, data.currency)}</span>
      </div>
      <div class="totals-row">
        <span>Tax (GST)</span>
        <span>${formatCurrency(data.tax, data.currency)}</span>
      </div>
      <div class="totals-row total-final">
        <span>Total</span>
        <span>${formatCurrency(data.total, data.currency)}</span>
      </div>
    </div>
  </div>

  <!-- ============================================================
       NOTES
       ============================================================ -->

  <div class="notes-section">
    <h4>Payment Notes</h4>
    <p>
      Thank you for your payment. This invoice serves as an official receipt
      for your transaction with WeGrow Skill Campus.
      For any queries, contact us at kumarrk23dev@gmail.com.
    </p>
  </div>

  <!-- ============================================================
       FOOTER
       ============================================================ -->

  <div class="footer">
    <div class="footer-brand">WeGrow Skill Campus</div>
    <div class="footer-note">
      Generated on ${data.issuedDate}<br/>
      Invoice No: ${data.invoiceNumber}
    </div>
  </div>

</div>

</body>
</html>`;
}
