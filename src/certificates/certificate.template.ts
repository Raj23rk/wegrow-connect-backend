// ============================================================
// CERTIFICATE HTML TEMPLATE
//
// Generates the exact HTML template requested by the user.
// Can be rendered on frontend or exported on backend.
// ============================================================

export interface CertificateTemplateData {
  certificateNumber?: string;
  recipientName: string;
  eventTitle: string;
  description?: string;
  grade?: string;
  startYear?: string;
  endYear?: string;
  eventDate?: string;
  issuedDate?: string;
  logoUrl?: string;
}

export function generateCertificateHtml(data: CertificateTemplateData): string {
  const recipientName = data.recipientName || 'Participant';
  const eventTitle = data.eventTitle || 'Event / Course';
  const description =
    data.description ||
    'Has demonstrated strong proficiency in responsive design, UI design, and front-end development through full event participation.';
  const grade = data.grade || 'A+';
  const startYear = data.startYear || '2026';
  const endYear = data.endYear || '2026';
  const logoUrl = data.logoUrl || 'https://via.placeholder.com/260x80?text=B+School+Logo';

  return `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Certificate of Completion - ${recipientName}</title>

    <!-- Bootstrap 5 -->
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet">

    <!-- Google Font -->
    <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap"
        rel="stylesheet">

    <style>
/* =========================================
   BASIC
========================================= */

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 30px;

    background: #eeeeee;

    font-family: "Montserrat", Arial, sans-serif;

    display: flex;
    justify-content: center;
    align-items: center;

    min-height: 100vh;
}


/* =========================================
   CERTIFICATE
========================================= */

.certificate {
    position: relative;

    width: 1450px;
    height: 1025px;

    background: white;

    overflow: hidden;

    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.25);
}


/* =========================================
   TOP BLUE
========================================= */

.top-blue {
    position: absolute;

    top: 0;
    left: 0;

    width: 370px;
    height: 270px;

    background: #155da5;

    clip-path: polygon(
        0 0,
        100% 0,
        100% 22%,
        0 100%
    );
}


/* =========================================
   TOP ORANGE
========================================= */

.top-orange {
    position: absolute;

    top: 0;
    left: 235px;

    width: 650px;
    height: 75px;

    background: #f6a500;

    clip-path: polygon(
        0 0,
        100% 0,
        25% 100%
    );
}


/* =========================================
   LEFT ORANGE
========================================= */

.left-orange {
    position: absolute;

    top: 240px;
    left: 0;

    width: 100px;
    height: 215px;

    background: #f6a500;

    clip-path: polygon(
        0 0,
        100% 100%,
        0 100%
    );
}


/* =========================================
   YOUR LOGO
========================================= */

.my-logo {
    position: absolute;

    top: 35px;
    right: 55px;

    width: 260px;

    z-index: 30;
}

.my-logo img {
    width: 100%;
    height: auto;

    display: block;
}


/* =========================================
   MEDAL
========================================= */

.medal {
    position: absolute;

    top: 85px;
    left: 70px;

    width: 180px;
    height: 300px;

    z-index: 20;
}


/* =========================================
   MEDAL CIRCLE
========================================= */

.medal-circle {
    width: 155px;
    height: 155px;

    border-radius: 50%;

    background: #ffdc4b;

    border: 15px solid #f4b41b;

    outline: 7px solid #ffd969;

    display: flex;

    justify-content: center;
    align-items: center;

    box-shadow:
        0 0 0 5px #e9a915;
}


/* =========================================
   MEDAL INNER
========================================= */

.medal-inner {
    width: 105px;
    height: 105px;

    border-radius: 50%;

    border: 5px solid white;

    display: flex;

    justify-content: center;
    align-items: center;

    color: white;

    font-size: 55px;
}


/* =========================================
   MEDAL RIBBONS
========================================= */

.ribbon {
    position: absolute;

    top: 130px;

    width: 60px;
    height: 165px;

    background: #ffca28;

    clip-path: polygon(
        0 0,
        100% 0,
        100% 100%,
        50% 75%,
        0 100%
    );
}

.ribbon-left {
    left: 12px;

    transform: rotate(15deg);
}

.ribbon-right {
    right: 18px;

    transform: rotate(-15deg);
}


/* =========================================
   WATERMARK
========================================= */

.watermark {
    position: absolute;

    top: 400px;
    left: 400px;

    width: 650px;

    text-align: center;

    font-size: 100px;

    font-weight: 900;

    color: #155da5;

    opacity: 0.07;

    z-index: 1;
}


/* =========================================
   MAIN CONTENT
========================================= */

.certificate-content {
    position: absolute;

    top: 135px;

    left: 340px;

    right: 140px;

    text-align: center;

    z-index: 10;
}


/* =========================================
   CERTIFICATE TITLE
========================================= */

.certificate-title {
    margin: 0;

    font-size: 82px;

    font-weight: 900;

    letter-spacing: 9px;

    color: #252525;
}


/* =========================================
   COMPLETION TITLE
========================================= */

.completion-title {
    margin-top: 22px;

    font-size: 42px;

    font-weight: 800;

    letter-spacing: 2px;

    color: #382f2f;
}


/* =========================================
   CERTIFY
========================================= */

.certify-title {
    margin-top: 50px;

    font-size: 27px;

    font-weight: 800;

    letter-spacing: 1px;

    color: #3b3333;
}


/* =========================================
   STUDENT NAME
========================================= */

.student-name {
    width: 740px;

    height: 55px;

    margin: 25px auto 18px;

    border-bottom: 2px solid #333;

    font-size: 29px;

    font-weight: 700;

    color: #333;
    display: flex;
    justify-content: center;
    align-items: center;
}


/* =========================================
   COURSE HEADING
========================================= */

.course-heading {
    margin: 0;

    font-size: 22px;

    font-weight: 800;

    color: #3d3434;
}


/* =========================================
   COURSE BOX
========================================= */

.course-box {
    width: 560px;

    margin: 14px auto;

    padding: 13px;

    border: 2px solid #333;

    border-radius: 20px;

    font-size: 24px;

    font-weight: 700;

    color: #333;
}


/* =========================================
   PERIOD
========================================= */

.period-heading {
    margin: 10px 0 5px;

    font-size: 22px;

    font-weight: 800;

    color: #3d3434;
}


/* =========================================
   DATES
========================================= */

.dates {
    display: flex;

    justify-content: center;
    align-items: center;

    gap: 12px;

    font-size: 27px;

    font-weight: 900;

    color: #155da5;
}

.date {
    display: flex;

    align-items: center;

    gap: 10px;
}

.date-line {
    display: block;

    width: 110px;

    height: 1px;

    background: #777;
}

.dash {
    font-size: 32px;
}


/* =========================================
   DESCRIPTION
========================================= */

.description {
    width: 1000px;

    max-width: 100%;

    margin: 12px auto 0;

    font-size: 17px;

    line-height: 1.45;

    font-weight: 600;

    color: #443b3b;
}


/* =========================================
   GRADE
========================================= */

.grade {
    margin-top: 8px;

    font-size: 26px;

    font-weight: 900;

    color: #155da5;
}


/* =========================================
   SIGNATURES
========================================= */

.signature-area {
    position: absolute;

    left: 280px;
    right: 280px;

    bottom: 105px;

    display: flex;

    justify-content: space-between;

    z-index: 20;
}

.signature-box {
    width: 300px;

    text-align: center;
}

.signature-space {
    height: 50px;

    display: flex;

    align-items: center;
    justify-content: center;

    font-size: 40px;

    color: #277d3e;
}

.signature-line {
    width: 300px;

    border-top: 2px solid #333;
}

.signature-box p {
    margin-top: 8px;

    font-size: 20px;

    font-weight: 700;

    color: #3b3333;
}


/* =========================================
   BOTTOM ORANGE
========================================= */

.bottom-orange {
    position: absolute;

    bottom: 0;
    left: 0;

    width: 100%;
    height: 90px;

    background: #f6a500;

    clip-path: polygon(
        0 80%,
        100% 0,
        100% 100%,
        0 100%
    );
}


/* =========================================
   BOTTOM BLUE
========================================= */

.bottom-blue {
    position: absolute;

    bottom: 0;
    right: 0;

    width: 920px;
    height: 110px;

    background: #155da5;

    clip-path: polygon(
        28% 100%,
        100% 0,
        100% 100%
    );
}


/* =========================================
   PRINT
========================================= */

@media print {

    body {
        margin: 0;
        padding: 0;

        background: white;
    }

    .certificate {
        width: 1450px;
        height: 1025px;

        box-shadow: none;
    }

    @page {
        size: landscape;
        margin: 0;
    }
}
</style>
</head>

<body>

    <div class="certificate">

        <!-- ================= TOP DESIGN ================= -->

        <div class="top-blue"></div>
        <div class="top-orange"></div>
        <div class="left-orange"></div>


        <!-- ================= YOUR LOGO ================= -->

        <div class="my-logo">
            <img
                src="${logoUrl}"
                alt="B School Logo">
        </div>


        <!-- ================= MEDAL ================= -->

        <div class="medal">

            <div class="medal-circle">
                <div class="medal-inner">
                    ★
                </div>
            </div>

            <div class="ribbon ribbon-left"></div>
            <div class="ribbon ribbon-right"></div>

        </div>


        <!-- ================= WATERMARK ================= -->

        <div class="watermark">
            B SCHOOL
        </div>


        <!-- ================= MAIN CONTENT ================= -->

        <div class="certificate-content">

            <h1 class="certificate-title">
                CERTIFICATE
            </h1>

            <h2 class="completion-title">
                OF COMPLETION
            </h2>

            <h3 class="certify-title">
                THIS IS TO CERTIFY THAT
            </h3>


            <!-- Student Name -->

            <div class="student-name">
                ${recipientName}
            </div>


            <!-- Course -->

            <p class="course-heading">
                HAS SUCCESSFULLY COMPLETED THE COURSE
            </p>

            <div class="course-box">
                ${eventTitle}
            </div>


            <!-- Period -->

            <p class="period-heading">
                DURING THE PERIOD
            </p>


            <!-- Dates -->

            <div class="dates">

                <div class="date">
                    <span class="date-line"></span>
                    <span>${startYear}</span>
                </div>

                <span class="dash">–</span>

                <div class="date">
                    <span>${endYear}</span>
                    <span class="date-line"></span>
                </div>

            </div>


            <!-- Description -->

            <p class="description">
                ${description}
            </p>


            <!-- Grade -->

            <div class="grade">
                WITH GRADE ${grade}
            </div>

        </div>


        <!-- ================= SIGNATURES ================= -->

        <div class="signature-area">

            <div class="signature-box">

                <div class="signature-space"></div>

                <div class="signature-line"></div>

                <p>
                    Founder
                </p>

            </div>


            <div class="signature-box">

                <div class="signature-space"></div>

                <div class="signature-line"></div>

                <p>
                    Branch Manager
                </p>

            </div>

        </div>


        <!-- ================= BOTTOM DESIGN ================= -->

        <div class="bottom-orange"></div>

        <div class="bottom-blue"></div>

    </div>

</body>
</html>`;
}
