// ============================================================
// CERTIFICATE HTML TEMPLATE
//
// Generates a professional event completion certificate.
// Used by CertificatesService to render HTML → PDF via puppeteer.
// ============================================================

export interface CertificateTemplateData {
  certificateNumber: string;
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  issuedDate: string;
}

export function generateCertificateHtml(data: CertificateTemplateData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Certificate - ${data.eventTitle}</title>
  <style>

    /* ============================================================
       RESET & BASE
       ============================================================ */

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 1123px;
      height: 794px;
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #ffffff;
      overflow: hidden;
    }

    /* ============================================================
       CERTIFICATE WRAPPER
       ============================================================ */

    .certificate {
      width: 1123px;
      height: 794px;
      position: relative;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* ============================================================
       OUTER BORDER
       ============================================================ */

    .outer-border {
      position: absolute;
      top: 14px;
      left: 14px;
      right: 14px;
      bottom: 14px;
      border: 6px solid #205894;
    }

    .inner-border {
      position: absolute;
      top: 24px;
      left: 24px;
      right: 24px;
      bottom: 24px;
      border: 2px solid #f5a51b;
    }

    /* ============================================================
       CORNER ORNAMENTS
       ============================================================ */

    .corner {
      position: absolute;
      width: 48px;
      height: 48px;
      border-color: #f5a51b;
      border-style: solid;
    }

    .corner-tl { top: 10px; left: 10px; border-width: 4px 0 0 4px; }
    .corner-tr { top: 10px; right: 10px; border-width: 4px 4px 0 0; }
    .corner-bl { bottom: 10px; left: 10px; border-width: 0 0 4px 4px; }
    .corner-br { bottom: 10px; right: 10px; border-width: 0 4px 4px 0; }

    /* ============================================================
       HEADER STRIPE
       ============================================================ */

    .header-stripe {
      background: #205894;
      width: 100%;
      padding: 14px 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: absolute;
      top: 0;
    }

    .org-name {
      color: #ffffff;
      font-size: 22px;
      font-weight: bold;
      letter-spacing: 2px;
      font-family: Arial, sans-serif;
    }

    .cert-no {
      color: #f5a51b;
      font-size: 12px;
      font-family: Arial, sans-serif;
      letter-spacing: 1px;
    }

    /* ============================================================
       BODY
       ============================================================ */

    .body {
      margin-top: 80px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 80px;
      text-align: center;
    }

    .cert-label {
      font-size: 13px;
      letter-spacing: 8px;
      color: #205894;
      text-transform: uppercase;
      font-family: Arial, sans-serif;
      margin-bottom: 6px;
    }

    .cert-title {
      font-size: 52px;
      color: #205894;
      font-weight: bold;
      letter-spacing: 4px;
      line-height: 1;
      margin-bottom: 8px;
    }

    .cert-subtitle {
      font-size: 13px;
      letter-spacing: 6px;
      color: #888;
      text-transform: uppercase;
      font-family: Arial, sans-serif;
      margin-bottom: 22px;
    }

    .divider {
      width: 200px;
      height: 2px;
      background: linear-gradient(to right, transparent, #f5a51b, transparent);
      margin-bottom: 22px;
    }

    .presented-to {
      font-size: 14px;
      color: #555;
      letter-spacing: 3px;
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .recipient-name {
      font-size: 46px;
      color: #1a1a1a;
      font-style: italic;
      font-weight: bold;
      margin-bottom: 16px;
      position: relative;
    }

    .recipient-name::after {
      content: '';
      display: block;
      width: 80%;
      margin: 8px auto 0;
      height: 1px;
      background: #205894;
    }

    .completion-text {
      font-size: 15px;
      color: #444;
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 660px;
      margin-bottom: 10px;
    }

    .event-name {
      font-size: 22px;
      color: #205894;
      font-weight: bold;
      font-family: Arial, sans-serif;
      margin-bottom: 6px;
    }

    .event-date-text {
      font-size: 13px;
      color: #666;
      font-family: Arial, sans-serif;
      margin-bottom: 28px;
    }

    /* ============================================================
       FOOTER
       ============================================================ */

    .footer {
      position: absolute;
      bottom: 0;
      width: 100%;
      padding: 14px 80px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
    }

    .sig-block {
      text-align: center;
    }

    .sig-line {
      width: 160px;
      height: 1px;
      background: #205894;
      margin-bottom: 6px;
    }

    .sig-label {
      font-size: 11px;
      color: #555;
      font-family: Arial, sans-serif;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .seal {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      border: 4px solid #205894;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f5f9ff;
    }

    .seal-text {
      font-size: 9px;
      color: #205894;
      font-family: Arial, sans-serif;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: center;
      line-height: 1.4;
    }

    .issued-date {
      font-size: 11px;
      color: #888;
      font-family: Arial, sans-serif;
      margin-top: 4px;
    }

    /* ============================================================
       BOTTOM STRIPE
       ============================================================ */

    .bottom-stripe {
      position: absolute;
      bottom: 0;
      height: 8px;
      width: 100%;
      background: linear-gradient(to right, #205894, #f5a51b, #205894);
    }

  </style>
</head>
<body>

<div class="certificate">

  <!-- CORNER ORNAMENTS -->
  <div class="corner corner-tl"></div>
  <div class="corner corner-tr"></div>
  <div class="corner corner-bl"></div>
  <div class="corner corner-br"></div>

  <!-- OUTER + INNER BORDERS -->
  <div class="outer-border"></div>
  <div class="inner-border"></div>

  <!-- HEADER STRIPE -->
  <div class="header-stripe">
    <span class="org-name">WeGrow Skill Campus</span>
    <span class="cert-no">CERTIFICATE NO: ${data.certificateNumber}</span>
  </div>

  <!-- BODY -->
  <div class="body">
    <p class="cert-label">Proudly Presents</p>
    <h1 class="cert-title">Certificate</h1>
    <p class="cert-subtitle">of Participation</p>

    <div class="divider"></div>

    <p class="presented-to">This is to certify that</p>

    <h2 class="recipient-name">${data.recipientName}</h2>

    <p class="completion-text">
      has successfully participated and completed in the event
    </p>

    <p class="event-name">${data.eventTitle}</p>
    <p class="event-date-text">held on ${data.eventDate}</p>
  </div>

  <!-- FOOTER -->
  <div class="footer">

    <div class="sig-block">
      <div class="sig-line"></div>
      <p class="sig-label">Programme Director</p>
      <p class="issued-date">WeGrow Skill Campus</p>
    </div>

    <div class="seal">
      <p class="seal-text">WeGrow<br/>Skill<br/>Campus</p>
    </div>

    <div class="sig-block">
      <div class="sig-line"></div>
      <p class="sig-label">Issued On</p>
      <p class="issued-date">${data.issuedDate}</p>
    </div>

  </div>

  <!-- BOTTOM STRIPE -->
  <div class="bottom-stripe"></div>

</div>

</body>
</html>`;
}
