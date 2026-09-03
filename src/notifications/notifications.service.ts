import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

import { Resend } from 'resend';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  private readonly resend: Resend;

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
  }

  // ============================================================
  // VALIDATE USER ID
  // ============================================================

  private getUserObjectId(userId: string): Types.ObjectId {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    return new Types.ObjectId(userId);
  }

  // ============================================================
  // GET MAIL FROM
  // ============================================================

  private getMailFrom(): string {
    const mailFrom = process.env.MAIL_FROM;

    if (!mailFrom) {
      throw new Error('MAIL_FROM is not configured');
    }

    return mailFrom;
  }

  // ============================================================
  // CREATE NOTIFICATION
  // ============================================================

  async createNotification(data: {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    eventId?: string;
  }): Promise<NotificationDocument> {
    const userObjectId = this.getUserObjectId(data.userId);

    let eventObjectId: Types.ObjectId | null = null;

    if (data.eventId) {
      if (!Types.ObjectId.isValid(data.eventId)) {
        throw new BadRequestException('Invalid event ID');
      }

      eventObjectId = new Types.ObjectId(data.eventId);
    }

    const notification = new this.notificationModel({
      userId: userObjectId,
      title: data.title,
      message: data.message,
      type: data.type || NotificationType.GENERAL,
      eventId: eventObjectId,
      isRead: false,
    });

    return notification.save();
  }

  // ============================================================
  // CREATE BULK NOTIFICATIONS
  // ============================================================

  async createBulkNotifications(
    users: Array<{
      _id: Types.ObjectId;
    }>,
    data: {
      title: string;
      message: string;
      type?: NotificationType;
      eventId?: string;
    },
  ) {
    if (!users.length) {
      return [];
    }

    let eventObjectId: Types.ObjectId | null = null;

    if (data.eventId) {
      if (!Types.ObjectId.isValid(data.eventId)) {
        throw new BadRequestException('Invalid event ID');
      }

      eventObjectId = new Types.ObjectId(data.eventId);
    }

    const notifications = users.map((user) => ({
      userId: user._id,
      title: data.title,
      message: data.message,
      type: data.type || NotificationType.GENERAL,
      eventId: eventObjectId,
      isRead: false,
    }));

    return this.notificationModel.insertMany(notifications);
  }

  // ============================================================
  // GET USER NOTIFICATIONS
  //
  // GET /notifications?page=1&limit=10
  // ============================================================

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const userObjectId = this.getUserObjectId(userId);

    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const skip = (page - 1) * limit;

    this.logger.log(
      `Getting notifications for user: ${userObjectId.toString()}`,
    );

    const filter = {
      userId: userObjectId,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('eventId', 'title description image location date price type')
        .lean(),

      this.notificationModel.countDocuments(filter),

      this.notificationModel.countDocuments({
        userId: userObjectId,
        isRead: false,
      }),
    ]);

    this.logger.log(`Notifications found: ${notifications.length}`);
    this.logger.log(`Unread count: ${unreadCount}`);

    return {
      success: true,
      notifications,
      unreadCount,

      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // MARK NOTIFICATION AS READ
  //
  // PATCH /notifications/:id/read
  // ============================================================

  async markAsRead(notificationId: string, userId: string) {
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new BadRequestException('Invalid notification ID');
    }

    const userObjectId = this.getUserObjectId(userId);

    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(notificationId),
      userId: userObjectId,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;

      await notification.save();
    }

    const unreadCount = await this.notificationModel.countDocuments({
      userId: userObjectId,
      isRead: false,
    });

    return {
      success: true,
      message: 'Notification marked as read',
      notification,
      unreadCount,
    };
  }

  // ============================================================
  // NEW EVENT NOTIFICATION
  // ============================================================

  async createNewEventNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
  ) {
    return this.createNotification({
      userId,

      title: 'New Event Available 🎉',

      message: `A new event "${eventTitle}" has been added. Check it out now!`,

      type: NotificationType.NEW_EVENT,

      eventId,
    });
  }

  // ============================================================
  // BOOKING CREATED
  // ============================================================

  async createBookingNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
  ) {
    return this.createNotification({
      userId,

      title: 'Booking Created 🎟️',

      message: `Your booking for "${eventTitle}" has been created successfully.`,

      type: NotificationType.BOOKING_CREATED,

      eventId,
    });
  }

  // ============================================================
  // BOOKING CONFIRMED
  // ============================================================

  async createBookingConfirmedNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
  ) {
    return this.createNotification({
      userId,

      title: 'Booking Confirmed ✅',

      message: `Your booking for "${eventTitle}" has been confirmed.`,

      type: NotificationType.BOOKING_CONFIRMED,

      eventId,
    });
  }

  // ============================================================
  // BOOKING CANCELLED
  // ============================================================

  async createBookingCancelledNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
  ) {
    return this.createNotification({
      userId,

      title: 'Booking Cancelled',

      message: `Your booking for "${eventTitle}" has been cancelled.`,

      type: NotificationType.BOOKING_CANCELLED,

      eventId,
    });
  }

  // ============================================================
  // SEND NEW EVENT EMAIL
  // ============================================================

  async sendNewEventNotification(
    email: string,
    name: string,
    eventTitle: string,
    description?: string,
    location?: string,
    eventDate?: string,
    price?: number,
  ): Promise<boolean> {
    // ============================================================
    // FORMAT DATE → DD/MM/YYYY
    // ============================================================

    let formattedDate = 'To be announced';

    if (eventDate) {
      const date = new Date(eventDate);

      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        formattedDate = `${day}/${month}/${year}`;
      }
    }

    // ============================================================
    // RANDOM CLOSING PHRASE
    // ============================================================

    const phrases = [
      "Don't miss this opportunity!",
      'Join us and take the next step in your learning journey!',
      'Your next learning opportunity is waiting for you!',
      'Be part of this exciting workshop!',
      'Learn. Grow. Transform your future!',
      'Take this opportunity to upgrade your skills!',
      'We look forward to seeing you at the workshop!',
    ];

    const closingPhrase = phrases[Math.floor(Math.random() * phrases.length)];

    // ============================================================
    // HTML EMAIL
    // ============================================================

    const html = `
<!DOCTYPE html>
<html>
<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="color-scheme"
    content="light only"
  >

  <meta
    name="supported-color-schemes"
    content="light"
  >

  <title>${eventTitle}</title>

  <style>

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
    }

    a {
      text-decoration: none;
    }

    .email-wrapper {
      width: 100%;
      background-color: #ffffff !important;
      padding: 20px 0;
    }

    .invitation {
      width: 680px;
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff !important;
      border: 1px solid #e5e7eb;
    }

    .header-section {
      padding: 25px 30px;
      background-color: #ffffff !important;
    }

    .header-table {
      width: 100%;
    }

    .logo-cell {
      width: 130px;
      vertical-align: middle;
      text-align: center;
    }

    .logo {
      width: 100px;
      max-width: 100px;
      height: auto;
      margin: 0 auto;
    }

    .header-content {
      vertical-align: middle;
      padding-left: 20px;
    }

    .header-content h1 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 28px;
      line-height: 1.2;
    }

    .tagline {
      margin: 0;
      color: #555555 !important;
      font-size: 13px;
      line-height: 1.6;
    }

    .tagline em {
      color: #6280a5 !important;
      font-style: normal;
    }

    .tagline span {
      padding: 0 7px;
      color: #999999 !important;
    }

    .top-line {
      height: 4px;
      background-color: #f5a51b !important;
      margin: 0 30px;
    }

    .title-table {
      width: 100%;
      margin-top: 25px;
    }

    .title-blue {
      width: 72%;
      padding: 12px 18px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
    }

    .title-orange {
      width: 28%;
      padding: 12px 10px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }

    .date-reference {
      padding: 25px 30px 10px;
      text-align: right;
      background-color: #ffffff !important;
    }

    .date-reference p {
      margin: 4px 0;
      color: #444444 !important;
      font-size: 13px;
    }

    .content {
      padding: 15px 30px 30px;
      background-color: #ffffff !important;
    }

    .content h2 {
      margin: 0 0 15px;
      color: #205894 !important;
      font-size: 22px;
    }

    .content p {
      color: #333333 !important;
      font-size: 15px;
      line-height: 1.7;
    }

    .event-card {
      margin: 25px 0;
      padding: 22px;
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #f5a51b;
    }

    .event-title {
      margin: 0 0 18px !important;
      color: #205894 !important;
      font-size: 21px !important;
    }

    .description {
      color: #333333 !important;
    }

    .description p {
      margin-top: 5px;
      color: #555555 !important;
    }

    .event-detail {
      margin: 12px 0 !important;
      color: #333333 !important;
    }

    .event-detail strong {
      color: #205894 !important;
    }

    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }

    .event-button {
      display: inline-block;
      padding: 13px 28px;
      background-color: #205894 !important;
      color: #ffffff !important;
      border-radius: 5px;
      font-size: 15px;
      font-weight: bold;
    }

    .closing {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .closing h5 {
      margin: 0 0 10px;
      color: #f27f2d !important;
      font-size: 15px;
    }

    .closing h4 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 17px;
    }

    .signature-phone {
      color: #6280a5 !important;
      font-size: 13px !important;
    }

    .closing-logo {
      width: 70px;
      margin: 12px 0;
    }

    .footer-table {
      width: 100%;
    }

    .footer-blue {
      width: 72%;
      padding: 12px 15px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 13px;
    }

    .footer-orange {
      width: 28%;
      padding: 12px 8px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 13px;
      text-align: center;
    }

    @media only screen and (max-width: 680px) {

      .email-wrapper {
        width: 100% !important;
        padding: 0 !important;
        background-color: #ffffff !important;
      }

      .invitation {
        width: 100% !important;
        max-width: 100% !important;
        border: none !important;
        background-color: #ffffff !important;
      }

      .header-section {
        padding: 20px 18px !important;
      }

      .logo-cell {
        width: 85px !important;
      }

      .logo {
        width: 70px !important;
        max-width: 70px !important;
      }

      .header-content {
        padding-left: 12px !important;
      }

      .header-content h1 {
        font-size: 20px !important;
      }

      .tagline {
        font-size: 11px !important;
      }

      .tagline span {
        display: none;
      }

      .tagline em {
        display: block;
        margin-top: 4px;
      }

      .top-line {
        margin: 0 18px !important;
      }

      .title-table {
        margin-top: 20px !important;
      }

      .title-blue,
      .title-orange {
        font-size: 15px !important;
        padding: 10px 8px !important;
      }

      .date-reference {
        padding: 18px !important;
        text-align: left !important;
      }

      .content {
        padding: 10px 18px 25px !important;
      }

      .content h2 {
        font-size: 19px !important;
      }

      .content p {
        font-size: 14px !important;
      }

      .event-card {
        padding: 16px !important;
        margin: 20px 0 !important;
      }

      .event-title {
        font-size: 18px !important;
      }

      .event-detail {
        font-size: 14px !important;
      }

      .event-button {
        display: block !important;
        width: auto !important;
        padding: 13px 20px !important;
      }

      .closing-logo {
        width: 60px !important;
      }

      .footer-blue,
      .footer-orange {
        font-size: 11px !important;
        padding: 10px 8px !important;
      }
    }

    @media (prefers-color-scheme: dark) {

      html,
      body,
      .email-wrapper,
      .invitation,
      .header-section,
      .content,
      .date-reference {
        background-color: #ffffff !important;
        color: #1f2937 !important;
      }

      .content p,
      .date-reference p,
      .event-detail {
        color: #333333 !important;
      }

      .event-card {
        background-color: #f8fafc !important;
      }
    }

  </style>

</head>

<body>

  <div class="email-wrapper">

    <div class="invitation">

      <div class="header-section">

        <table class="header-table">

          <tr>

            <td class="logo-cell">

              <img
                class="logo"
                src="https://www.wegrowbschool.in/wegrow-logo.png"
                alt="WeGrow B School Logo"
              >

            </td>

            <td class="header-content">

              <h1>
                WeGrow B School
              </h1>

              <p class="tagline">

                <em>
                  Empowering Skills. Transforming Futures.
                </em>

              </p>

            </td>

          </tr>

        </table>

      </div>

      <div class="top-line"></div>

      <table class="title-table">

        <tr>

          <td class="title-blue">
            ${eventTitle}
          </td>

          <td class="title-orange">
            2026
          </td>

        </tr>

      </table>

      <div class="date-reference">

        <p>
          <strong>Date:</strong>
          ${formattedDate}
        </p>

        <p>
          <strong>WeGrow B School</strong>
        </p>

      </div>

      <div class="content">

        <h2>
          Hello ${name},
        </h2>

        <p>
          We are excited to announce a new event
          available at
          <strong>WeGrow B School</strong>.
        </p>

        <div class="event-card">

          <h2 class="event-title">
            ${eventTitle}
          </h2>

          ${
            description
              ? `
                <div class="description">

                  <strong>
                    Description:
                  </strong>

                  <p>
                    ${description}
                  </p>

                </div>
              `
              : ''
          }

          ${
            location
              ? `
                <p class="event-detail">

                  <strong>
                    Venue:
                  </strong>

                  ${location}

                </p>
              `
              : ''
          }

          ${
            price !== undefined
              ? `
                <p class="event-detail">

                  <strong>
                    Workshop Fee:
                  </strong>

                  ₹${price}

                </p>
              `
              : ''
          }

          <p class="event-detail">

            <strong>
              Date:
            </strong>

            ${formattedDate}

          </p>

        </div>

        <div class="button-wrapper">

          <a
            href="https://www.wegrowbschool.in/student/courses"
            class="event-button"
          >
            View Event
          </a>

        </div>

        <p>
          <strong>
            ${closingPhrase}
          </strong>
        </p>

        <div class="closing">

          <h5>
            Regards,
          </h5>

          <img
            class="closing-logo"
            src="https://www.wegrowbschool.in/wegrow-logo.png"
            alt="WeGrow B School Logo"
          >

          <p class="signature-phone">

            <a
              href="https://www.wegrowcampus.in/"
              style="color:#205894;"
            >
              www.wegrowcampus.in
            </a>

            <br>

            enquiry@wegrowcampus.in

          </p>

        </div>

      </div>

      <table class="footer-table">

        <tr>

          <td class="footer-blue">

            <strong>
              WeGrow B School
            </strong>

          </td>

          <td class="footer-orange">

            <strong>
              Empowering Skills.<br>
              Transforming Futures.
            </strong>

          </td>

        </tr>

      </table>

    </div>

  </div>

</body>
</html>
`;

    return this.sendEmail(email, `New Event: ${eventTitle}`, html);
  }

  // ============================================================
  // COMMON EMAIL - RESEND
  // ============================================================

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        this.logger.error('RESEND_API_KEY is not configured');
        return false;
      }

      const from = this.getMailFrom();

      const { data, error } = await this.resend.emails.send({
        from: `WeGrow B School <${from}>`,
        to: [to],
        subject,
        html,
      });

      if (error) {
        this.logger.error(
          `Resend email failed for ${to}: ${JSON.stringify(error)}`,
        );

        return false;
      }

      this.logger.log(
        `Email sent successfully to ${to}. Resend ID: ${data?.id || 'N/A'}`,
      );

      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    }
  }

  // ============================================================
  // PASSWORD RESET EMAIL
  // ============================================================

  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const html = `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <style>

    body {
      margin: 0;
      padding: 0;
      background: #f5f7fb;
      font-family: Arial, Helvetica, sans-serif;
    }

    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      background: #2563eb;
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }

    .content {
      padding: 35px;
    }

    .button {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 25px;
      border-radius: 8px;
      font-weight: bold;
      margin: 20px 0;
    }

    .warning {
      background: #fff7ed;
      padding: 15px;
      border-radius: 8px;
      color: #9a3412;
      margin-top: 20px;
    }

    .footer {
      padding: 20px;
      text-align: center;
      color: #777777;
      font-size: 13px;
      border-top: 1px solid #eeeeee;
    }

  </style>

</head>

<body>

  <div class="container">

    <div class="header">

      <h2>
        WeGrow B School
      </h2>

      <p>
        Password Reset Request
      </p>

    </div>

    <div class="content">

      <h3>
        Hello ${name || 'User'},
      </h3>

      <p>
        We received a request to reset the password
        associated with your account.
      </p>

      <p>
        Click the button below to create your
        new password.
      </p>

      <div style="text-align: center;">

        <a
          href="${resetUrl}"
          class="button"
        >
          Reset Password
        </a>

      </div>

      <div class="warning">

        <strong>Important:</strong>

        This password reset link will expire
        in 15 minutes.

      </div>

      <p style="margin-top: 25px;">

        If you did not request a password reset,
        please ignore this email.

      </p>

      <p>

        For security reasons, never share this
        link with anyone.

      </p>

    </div>

    <div class="footer">

      © ${new Date().getFullYear()}
      WeGrow B School.
      All rights reserved.

    </div>

  </div>

</body>

</html>
`;

    try {
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY is not configured');
      }

      const from = this.getMailFrom();

      const { data, error } = await this.resend.emails.send({
        from: `WeGrow B School <${from}>`,
        to: [email],
        subject: 'Reset Your WeGrow Password',
        html,
      });

      if (error) {
        this.logger.error(
          `Password reset email failed: ${JSON.stringify(error)}`,
        );

        throw new Error('Failed to send password reset email');
      }

      this.logger.log(
        `Password reset email sent successfully to ${email}. Resend ID: ${
          data?.id || 'N/A'
        }`,
      );
    } catch (error) {
      this.logger.error(
        'Password reset email error',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  // ============================================================
  // BOOKING CONFIRMATION EMAIL
  // ============================================================

  async sendBookingConfirmationNotification(
    email: string,
    name: string,
    eventTitle: string,
    description?: string,
    location?: string,
    eventDate?: string,
    price?: number,
    bookingStatus?: string,
  ): Promise<boolean> {
    // ============================================================
    // FORMAT DATE → DD/MM/YYYY
    // ============================================================

    let formattedDate = 'To be announced';

    if (eventDate) {
      const date = new Date(eventDate);

      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        formattedDate = `${day}/${month}/${year}`;
      }
    }

    // ============================================================
    // BOOKING STATUS
    // ============================================================

    const status = bookingStatus || 'PENDING';

    // ============================================================
    // HTML EMAIL
    // ============================================================

    const html = `
<!DOCTYPE html>

<html>

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <meta
    name="color-scheme"
    content="light only"
  >

  <meta
    name="supported-color-schemes"
    content="light"
  >

  <title>
    Booking Confirmation - ${eventTitle}
  </title>

  <style>

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    table {
      border-spacing: 0;
      border-collapse: collapse;
    }

    img {
      border: 0;
      display: block;
      max-width: 100%;
    }

    a {
      text-decoration: none;
    }

    .email-wrapper {
      width: 100%;
      background-color: #ffffff !important;
      padding: 20px 0;
    }

    .invitation {
      width: 680px;
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff !important;
      border: 1px solid #e5e7eb;
    }

    .header-section {
      padding: 25px 30px;
      background-color: #ffffff !important;
    }

    .header-table {
      width: 100%;
    }

    .logo-cell {
      width: 130px;
      vertical-align: middle;
      text-align: center;
    }

    .logo {
      width: 100px;
      max-width: 100px;
      height: auto;
      margin: 0 auto;
    }

    .header-content {
      vertical-align: middle;
      padding-left: 20px;
    }

    .header-content h1 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 28px;
      line-height: 1.2;
    }

    .tagline {
      margin: 0;
      color: #555555 !important;
      font-size: 13px;
      line-height: 1.6;
    }

    .tagline em {
      color: #6280a5 !important;
      font-style: normal;
    }

    .top-line {
      height: 4px;
      background-color: #f5a51b !important;
      margin: 0 30px;
    }

    .title-table {
      width: 100%;
      margin-top: 25px;
    }

    .title-blue {
      width: 72%;
      padding: 12px 18px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
    }

    .title-orange {
      width: 28%;
      padding: 12px 10px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }

    .date-reference {
      padding: 25px 30px 10px;
      text-align: right;
      background-color: #ffffff !important;
    }

    .date-reference p {
      margin: 4px 0;
      color: #444444 !important;
      font-size: 13px;
    }

    .content {
      padding: 15px 30px 30px;
      background-color: #ffffff !important;
    }

    .content h2 {
      margin: 0 0 15px;
      color: #205894 !important;
      font-size: 22px;
    }

    .content p {
      color: #333333 !important;
      font-size: 15px;
      line-height: 1.7;
    }

    .success-box {
      margin: 25px 0;
      padding: 22px;
      background-color: #f0fdf4 !important;
      border: 1px solid #bbf7d0;
      border-left: 5px solid #22c55e;
      border-radius: 6px;
    }

    .success-title {
      margin: 0 0 12px !important;
      color: #15803d !important;
      font-size: 20px !important;
    }

    .success-message {
      margin: 0 !important;
      color: #166534 !important;
      font-size: 14px !important;
      line-height: 1.7;
    }

    .event-card {
      margin: 25px 0;
      padding: 22px;
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #f5a51b;
      border-radius: 6px;
    }

    .event-title {
      margin: 0 0 18px !important;
      color: #205894 !important;
      font-size: 21px !important;
    }

    .description {
      color: #333333 !important;
    }

    .description p {
      margin-top: 5px;
      color: #555555 !important;
    }

    .event-detail {
      margin: 12px 0 !important;
      color: #333333 !important;
    }

    .event-detail strong {
      color: #205894 !important;
    }

    .status-box {
      margin-top: 20px;
      padding: 15px 16px;
      background-color: #fff7ed !important;
      border: 1px solid #fed7aa;
      border-radius: 6px;
    }

    .status-label {
      color: #555555 !important;
      font-size: 13px;
      font-weight: bold;
      display: inline-block;
      margin-right: 10px;
    }

    .status-value {
      display: inline-block;
      padding: 6px 13px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }

    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }

    .event-button {
      display: inline-block;
      padding: 13px 28px;
      background-color: #205894 !important;
      color: #ffffff !important;
      border-radius: 5px;
      font-size: 15px;
      font-weight: bold;
    }

    .next-step-box {
      margin: 25px 0;
      padding: 20px;
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }

    .next-step-box h3 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 18px;
    }

    .next-step-box p {
      margin: 8px 0;
      color: #555555 !important;
      font-size: 14px;
      line-height: 1.7;
    }

    .closing {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .closing h5 {
      margin: 0 0 8px;
      color: #f27f2d !important;
      font-size: 15px;
    }

    .closing h4 {
      margin: 0 0 12px;
      color: #205894 !important;
      font-size: 17px;
    }

    .signature-phone {
      color: #6280a5 !important;
      font-size: 13px !important;
    }

    .closing-logo {
      width: 70px;
      margin: 12px 0;
    }

    .footer-table {
      width: 100%;
    }

    .footer-blue {
      width: 72%;
      padding: 12px 15px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 13px;
    }

    .footer-orange {
      width: 28%;
      padding: 12px 8px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 13px;
      text-align: center;
    }

    @media only screen and (max-width: 680px) {

      .email-wrapper {
        width: 100% !important;
        padding: 0 !important;
      }

      .invitation {
        width: 100% !important;
        max-width: 100% !important;
        border: none !important;
      }

      .header-section {
        padding: 20px 18px !important;
      }

      .logo-cell {
        width: 85px !important;
      }

      .logo {
        width: 70px !important;
        max-width: 70px !important;
      }

      .header-content {
        padding-left: 12px !important;
      }

      .header-content h1 {
        font-size: 20px !important;
      }

      .tagline {
        font-size: 11px !important;
      }

      .top-line {
        margin: 0 18px !important;
      }

      .title-table {
        margin-top: 20px !important;
      }

      .title-blue,
      .title-orange {
        font-size: 15px !important;
        padding: 10px 8px !important;
      }

      .date-reference {
        padding: 18px !important;
        text-align: left !important;
      }

      .content {
        padding: 10px 18px 25px !important;
      }

      .content h2 {
        font-size: 19px !important;
      }

      .content p {
        font-size: 14px !important;
      }

      .success-box {
        padding: 16px !important;
        margin: 20px 0 !important;
      }

      .success-title {
        font-size: 18px !important;
      }

      .event-card {
        padding: 16px !important;
        margin: 20px 0 !important;
      }

      .event-title {
        font-size: 18px !important;
      }

      .event-detail {
        font-size: 14px !important;
      }

      .status-box {
        padding: 12px !important;
      }

      .status-label {
        display: block;
        margin-bottom: 8px;
      }

      .event-button {
        display: block !important;
        width: auto !important;
        padding: 13px 20px !important;
      }

      .next-step-box {
        padding: 16px !important;
      }

      .closing-logo {
        width: 60px !important;
      }

      .footer-blue,
      .footer-orange {
        font-size: 11px !important;
        padding: 10px 8px !important;
      }
    }

    @media (prefers-color-scheme: dark) {

      html,
      body,
      .email-wrapper,
      .invitation,
      .header-section,
      .content,
      .date-reference {
        background-color: #ffffff !important;
        color: #1f2937 !important;
      }

      .content p,
      .date-reference p,
      .event-detail {
        color: #333333 !important;
      }

      .event-card {
        background-color: #f8fafc !important;
      }

      .success-box {
        background-color: #f0fdf4 !important;
      }

      .next-step-box {
        background-color: #f8fafc !important;
      }
    }

  </style>

</head>

<body>

  <div class="email-wrapper">

    <div class="invitation">

      <div class="header-section">

        <table class="header-table">

          <tr>

            <td class="logo-cell">

              <img
                class="logo"
                src="https://www.wegrowbschool.in/wegrow-logo.png"
                alt="WeGrow B School Logo"
              >

            </td>

            <td class="header-content">

              <h1>
                WeGrow B School
              </h1>

              <p class="tagline">

                <em>
                  Empowering Skills. Transforming Futures.
                </em>

              </p>

            </td>

          </tr>

        </table>

      </div>

      <div class="top-line"></div>

      <table class="title-table">

        <tr>

          <td class="title-blue">
            Booking Confirmation
          </td>

          <td class="title-orange">
            2026
          </td>

        </tr>

      </table>

      <div class="date-reference">

        <p>

          <strong>
            Booking Date:
          </strong>

          ${new Date().toLocaleDateString('en-IN')}

        </p>

        <p>

          <strong>
            WeGrow B School
          </strong>

        </p>

      </div>

      <div class="content">

        <h2>

          Great choice, ${name || 'there'}! 🎉

        </h2>

        <p>

          We're excited to have you join us at
          <strong>WeGrow B School</strong>.

          Your booking request has been successfully received,
          and you're one step closer to an amazing learning
          experience!

        </p>

        <div class="success-box">

          <h2 class="success-title">

            🎟️ Your Spot Is Reserved!

          </h2>

          <p class="success-message">

            Your booking has been successfully submitted.

            Your seat is currently reserved under
            <strong>${status}</strong> status.

            We'll keep you updated as soon as your
            booking is confirmed.

          </p>

        </div>

        <div class="event-card">

          <h2 class="event-title">

            ${eventTitle}

          </h2>

          ${
            description
              ? `
                <div class="description">

                  <strong>
                    🌟 What's in Store:
                  </strong>

                  <p>
                    ${description}
                  </p>

                </div>
              `
              : ''
          }

          ${
            location
              ? `
                <p class="event-detail">

                  <strong>
                    📍 Venue:
                  </strong>

                  ${location}

                </p>
              `
              : ''
          }

          ${
            price !== undefined
              ? `
                <p class="event-detail">

                  <strong>
                    💰 Workshop Fee:
                  </strong>

                  ₹${price}

                </p>
              `
              : ''
          }

          <p class="event-detail">

            <strong>
              📅 Event Date:
            </strong>

            ${formattedDate}

          </p>

          <div class="status-box">

            <span class="status-label">
              Booking Status
            </span>

            <span class="status-value">
              ${status}
            </span>

          </div>

        </div>

        <div class="button-wrapper">

          <a
            href="https://www.wegrowbschool.in/student/workshops"
            class="event-button"
          >

            View My Booking

          </a>

        </div>

        <div class="next-step-box">

          <h3>
            What's Next? 🚀
          </h3>

          <p>

            Your booking is currently being processed.

            Once your booking is confirmed, we'll send you
            another notification with the latest details.

          </p>

          <p>

            Get ready to learn, connect, and grow with
            <strong>WeGrow B School</strong>!

          </p>

        </div>

        <div class="closing">

          <h5>
            See you soon! 👋
          </h5>

          <h4>
            WeGrow B School Team
          </h4>

          <img
            class="closing-logo"
            src="https://www.wegrowbschool.in/wegrow-logo.png"
            alt="WeGrow B School Logo"
          >

          <p class="signature-phone">

            <a
              href="https://www.wegrowcampus.in/"
              style="color:#205894;"
            >

              www.wegrowcampus.in

            </a>

            <br>

            enquiry@wegrowcampus.in

          </p>

        </div>

      </div>

      <table class="footer-table">

        <tr>

          <td class="footer-blue">

            <strong>
              WeGrow B School
            </strong>

          </td>

          <td class="footer-orange">

            <strong>

              Empowering Skills.<br>
              Transforming Futures.

            </strong>

          </td>

        </tr>

      </table>

    </div>

  </div>

</body>

</html>
`;

    return this.sendEmail(email, `🎟️ Booking Received - ${eventTitle}`, html);
  }

  // ============================================================
  // ADMIN - GET ALL NOTIFICATIONS
  // ============================================================

  async getAdminNotifications(page = 1, limit = 10, search = '') {
    page = Math.max(Number(page) || 1, 1);

    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (page - 1) * limit;

    const searchText = String(search || '').trim();

    this.logger.log(
      `Admin notification request - page: ${page}, limit: ${limit}, search: ${searchText}`,
    );

    // ============================================================
    // SEARCH FILTER
    // ============================================================

    const filter: any = {};

    if (searchText) {
      const regex = new RegExp(
        searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );

      filter.$or = [
        {
          title: regex,
        },
        {
          message: regex,
        },
        {
          type: regex,
        },
      ];
    }

    // ============================================================
    // GET NOTIFICATIONS
    // ============================================================

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .populate('eventId', 'title description image location date price type')
        .populate('userId', 'firstName lastName email phone role')
        .lean(),

      this.notificationModel.countDocuments(filter),
    ]);

    // ============================================================
    // GLOBAL DASHBOARD COUNTS
    // ============================================================

    const [
      totalNotifications,
      newEventCount,
      bookingCount,
      readNotificationCount,
      unreadNotificationCount,
    ] = await Promise.all([
      this.notificationModel.countDocuments({}),

      this.notificationModel.countDocuments({
        type: NotificationType.NEW_EVENT,
      }),

      this.notificationModel.countDocuments({
        type: {
          $regex: /^BOOKING/i,
        },
      }),

      this.notificationModel.countDocuments({
        isRead: true,
      }),

      this.notificationModel.countDocuments({
        isRead: false,
      }),
    ]);

    // ============================================================
    // UNIQUE USERS REACHED
    // ============================================================

    const uniqueUsersReached = await this.notificationModel.distinct('userId');

    // ============================================================
    // UNIQUE USERS VIEWED
    // ============================================================

    const uniqueUsersViewed = await this.notificationModel.distinct('userId', {
      isRead: true,
    });

    // ============================================================
    // VIEW RATE
    // ============================================================

    const viewRate =
      totalNotifications > 0
        ? Number(
            ((readNotificationCount / totalNotifications) * 100).toFixed(2),
          )
        : 0;

    // ============================================================
    // TYPE COUNTS
    // ============================================================

    const typeCounts = await this.notificationModel.aggregate([
      {
        $group: {
          _id: '$type',

          count: {
            $sum: 1,
          },
        },
      },

      {
        $sort: {
          count: -1,
        },
      },
    ]);

    // ============================================================
    // LOG
    // ============================================================

    this.logger.log(`Admin notifications found: ${notifications.length}`);

    this.logger.log(`Total notifications: ${totalNotifications}`);

    // ============================================================
    // RESPONSE
    // ============================================================

    return {
      success: true,

      message: 'Admin notifications fetched successfully',

      data: {
        analytics: {
          totalNotifications,

          newEventCount,

          bookingCount,

          readNotificationCount,

          unreadNotificationCount,

          uniqueUsersReached: uniqueUsersReached.length,

          uniqueUsersViewed: uniqueUsersViewed.length,

          viewRate: `${viewRate}%`,

          typeCounts: typeCounts.map((item) => ({
            type: item._id || 'UNKNOWN',

            count: item.count,
          })),
        },

        notifications,

        pagination: {
          total,

          page,

          limit,

          totalPages: total === 0 ? 0 : Math.ceil(total / limit),

          hasNextPage: page < Math.ceil(total / limit),

          hasPreviousPage: page > 1,
        },

        search: searchText,
      },
    };
  }

  // ============================================================
  // CERTIFICATE ISSUED NOTIFICATION
  // ============================================================

  async createCertificateNotification(
    userId: string,
    eventId: string,
    eventTitle: string,
    recipientName: string,
  ) {
    return this.createNotification({
      userId,

      title: 'Certificate Issued 🎓',

      message: `Hi ${recipientName}, your certificate for "${eventTitle}" is ready! Visit your dashboard to download it.`,

      type: NotificationType.CERTIFICATE_ISSUED,

      eventId,
    });
  }

  // ============================================================
  // SEND CERTIFICATE EMAIL
  // ============================================================

  async sendCertificateEmail(
    email: string,
    name: string,
    eventTitle: string,
    certificateNumber: string,
    issuedDate: string,
  ): Promise<boolean> {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your Certificate is Ready</title>
  <style>
    html, body { margin: 0; padding: 0; background: #f5f5f5; font-family: Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 10px; overflow: hidden; }
    .header { background: #205894; color: #ffffff; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; }
    .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.85; }
    .orange-bar { height: 5px; background: #f5a51b; }
    .body { padding: 32px 36px; }
    .body h2 { color: #205894; margin: 0 0 16px; font-size: 20px; }
    .body p { color: #444; font-size: 15px; line-height: 1.7; margin: 0 0 14px; }
    .cert-box { background: #f0f4ff; border: 1px solid #c7d7f5; border-left: 5px solid #205894; padding: 20px 24px; border-radius: 4px; margin: 20px 0; }
    .cert-box p { margin: 5px 0; font-size: 14px; color: #333; }
    .cert-box strong { color: #205894; }
    .btn { display: inline-block; background: #205894; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 6px; font-size: 15px; margin: 16px 0; }
    .footer { background: #f8fafc; padding: 18px 36px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>WeGrow B School</h1>
      <p>Your Certificate is Ready 🎓</p>
    </div>
    <div class="orange-bar"></div>
    <div class="body">
      <h2>Congratulations, ${name}!</h2>
      <p>We are delighted to inform you that your participation certificate has been issued. You can now download it from your dashboard.</p>
      <div class="cert-box">
        <p><strong>Event:</strong> ${eventTitle}</p>
        <p><strong>Certificate No:</strong> ${certificateNumber}</p>
        <p><strong>Issued On:</strong> ${issuedDate}</p>
      </div>
      <p>Log in to your WeGrow Connect dashboard and navigate to <strong>My Certificates</strong> to download your certificate.</p>
      <p>Regards,<br/><strong>WeGrow B School Team</strong></p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} WeGrow B School. All rights reserved.</div>
  </div>
</body>
</html>`;

    return this.sendEmail(
      email,
      `Your Certificate for "${eventTitle}" is Ready 🎓`,
      html,
    );
  }

  // ============================================================
  // SUBSCRIPTION ACTIVATED NOTIFICATION
  // ============================================================

  async createSubscriptionActivatedNotification(
    userId: string,
    planName: string,
    endDate: Date,
  ) {
    const formattedEnd = endDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    return this.createNotification({
      userId,

      title: 'Subscription Activated ✅',

      message: `Your "${planName}" subscription is now active and valid until ${formattedEnd}.`,

      type: NotificationType.SUBSCRIPTION_ACTIVATED,
    });
  }

  // ============================================================
  // WOMEN ENTREPRENEURSHIP CONFIRMATION EMAIL
  // ============================================================

  async sendWomenEntrepreneurConfirmationEmail(data: {
    email: string;
    fullName: string;
    phone: string;
    businessStage: string;
    category: string;
  }): Promise<boolean> {
    if (!data.email) return false;

    const stageMap: Record<string, string> = {
      planning: 'Idea / Planning Stage (ஆரம்பிக்க யோசிக்கிறேன்)',
      just_started: 'Just Started (1-12 months)',
      running: 'Running Business (1-3 years)',
      established: 'Established Business (3+ years)',
    };

    const categoryMap: Record<string, string> = {
      retail_boutique: 'Boutique / Tailoring / Apparel',
      food_baking: 'Food / Baking / Catering',
      beauty_wellness: 'Beauty / Salon / Wellness',
      manufacturing_crafts: 'Handicrafts / Manufacturing',
      digital_services: 'Coaching / Digital Services',
      other: 'Other Domain',
    };

    const businessStageText =
      stageMap[data.businessStage] || data.businessStage;
    const categoryText = categoryMap[data.category] || data.category;

    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Women's Entrepreneurship Community</title>
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
    }
    img {
      border: 0;
      display: block;
      max-width: 100%;
    }
    a {
      text-decoration: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #ffffff !important;
      padding: 20px 0;
    }
    .invitation {
      width: 680px;
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff !important;
      border: 1px solid #e5e7eb;
    }
    .header-section {
      padding: 25px 30px;
      background-color: #ffffff !important;
    }
    .header-table {
      width: 100%;
    }
    .logo-cell {
      width: 130px;
      vertical-align: middle;
      text-align: center;
    }
    .logo {
      width: 100px;
      max-width: 100px;
      height: auto;
      margin: 0 auto;
    }
    .header-content {
      vertical-align: middle;
      padding-left: 20px;
    }
    .header-content h1 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 28px;
      line-height: 1.2;
    }
    .tagline {
      margin: 0;
      color: #555555 !important;
      font-size: 13px;
      line-height: 1.6;
    }
    .tagline em {
      color: #6280a5 !important;
      font-style: normal;
    }
    .top-line {
      height: 4px;
      background-color: #f5a51b !important;
      margin: 0 30px;
    }
    .title-table {
      width: 100%;
      margin-top: 25px;
    }
    .title-blue {
      width: 72%;
      padding: 12px 18px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
    }
    .title-orange {
      width: 28%;
      padding: 12px 10px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }
    .date-reference {
      padding: 25px 30px 10px;
      text-align: right;
      background-color: #ffffff !important;
    }
    .date-reference p {
      margin: 4px 0;
      color: #444444 !important;
      font-size: 13px;
    }
    .content {
      padding: 15px 30px 30px;
      background-color: #ffffff !important;
    }
    .content h2 {
      margin: 0 0 15px;
      color: #205894 !important;
      font-size: 22px;
    }
    .content p {
      color: #333333 !important;
      font-size: 15px;
      line-height: 1.7;
    }
    .event-card {
      margin: 25px 0;
      padding: 22px;
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #f5a51b;
    }
    .event-title {
      margin: 0 0 18px !important;
      color: #205894 !important;
      font-size: 21px !important;
    }
    .description {
      color: #333333 !important;
    }
    .description p {
      margin-top: 5px;
      color: #555555 !important;
    }
    .event-detail {
      margin: 12px 0 !important;
      color: #333333 !important;
    }
    .event-detail strong {
      color: #205894 !important;
    }
    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }
    .event-button {
      display: inline-block;
      padding: 13px 28px;
      background-color: #205894 !important;
      color: #ffffff !important;
      border-radius: 5px;
      font-size: 15px;
      font-weight: bold;
    }
    .closing {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .closing h5 {
      margin: 0 0 10px;
      color: #f27f2d !important;
      font-size: 15px;
    }
    .signature-phone {
      color: #6280a5 !important;
      font-size: 13px !important;
    }
    .closing-logo {
      width: 70px;
      margin: 12px 0;
    }
    .footer-table {
      width: 100%;
    }
    .footer-blue {
      width: 72%;
      padding: 12px 15px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 13px;
    }
    .footer-orange {
      width: 28%;
      padding: 12px 8px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 13px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="invitation">
      <div class="header-section">
        <table class="header-table">
          <tr>
            <td class="logo-cell">
              <img class="logo" src="https://www.wegrowbschool.in/wegrow-logo.png" alt="WeGrow B School Logo">
            </td>
            <td class="header-content">
              <h1>WeGrow B School</h1>
              <p class="tagline"><em>Empowering Skills. Transforming Futures.</em></p>
            </td>
          </tr>
        </table>
      </div>
      <div class="top-line"></div>
      <table class="title-table">
        <tr>
          <td class="title-blue">
            Seat Reserved - Women's Entrepreneurship Community
          </td>
          <td class="title-orange">
            2026
          </td>
        </tr>
      </table>
      <div class="date-reference">
        <p><strong>Registration Date:</strong> ${formattedDate}</p>
        <p><strong>WeGrow B School</strong></p>
      </div>
      <div class="content">
        <h2>Hello ${data.fullName},</h2>
        <p>
          Your seat reservation for the <strong>Women's Entrepreneurship Community</strong> orientation session has been confirmed!
        </p>
        <div class="event-card">
          <h2 class="event-title">
            மகளிர் தொழில் முனைவோர் சமூகம்
          </h2>
          <div class="description">
            <p>
              An exclusive orientation session for women starting out or already running a business in Sivakasi & Tamil Nadu. Meet mentors, connect with fellow founders, and explore structured growth roadmaps with WeGrow B School.
            </p>
          </div>
          <p class="event-detail"><strong>Full Name:</strong> ${data.fullName}</p>
          <p class="event-detail"><strong>WhatsApp Number:</strong> ${data.phone}</p>
          ${data.email ? `<p class="event-detail"><strong>Email Address:</strong> ${data.email}</p>` : ''}
          <p class="event-detail"><strong>Current Stage of Business:</strong> ${businessStageText}</p>
          <p class="event-detail"><strong>Business Domain / Interest:</strong> ${categoryText}</p>
        </div>
        <div class="button-wrapper">
          <a href="https://www.wegrowcampus.in" class="event-button">Visit WeGrow B School</a>
        </div>
        <p><strong>We look forward to seeing you at the orientation!</strong></p>
        <div class="closing">
          <h5>Regards,</h5>
          <img class="closing-logo" src="https://www.wegrowbschool.in/wegrow-logo.png" alt="WeGrow B School Logo">
          <p class="signature-phone">
            <a href="https://www.wegrowcampus.in/" style="color:#205894;">www.wegrowcampus.in</a><br>
            enquiry@wegrowcampus.in
          </p>
        </div>
      </div>
      <table class="footer-table">
        <tr>
          <td class="footer-blue"><strong>WeGrow B School</strong></td>
          <td class="footer-orange"><strong>Empowering Skills.<br>Transforming Futures.</strong></td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail(
      data.email,
      "🎟️ Seat Reserved - Women's Entrepreneurship Community | WeGrow B School",
      html,
    );
  }

  // ============================================================
  // STUDENT FOUNDERS CONFIRMATION EMAIL
  // ============================================================

  async sendStudentFounderConfirmationEmail(data: {
    email: string;
    fullName: string;
    phone: string;
    collegeName: string;
    yearOfStudy: string;
    course: string;
    courseStartYear: number;
    courseEndYear: number;
  }): Promise<boolean> {
    if (!data.email) return false;

    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Student Founders Community</title>
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
    }
    img {
      border: 0;
      display: block;
      max-width: 100%;
    }
    a {
      text-decoration: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #ffffff !important;
      padding: 20px 0;
    }
    .invitation {
      width: 680px;
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff !important;
      border: 1px solid #e5e7eb;
    }
    .header-section {
      padding: 25px 30px;
      background-color: #ffffff !important;
    }
    .header-table {
      width: 100%;
    }
    .logo-cell {
      width: 130px;
      vertical-align: middle;
      text-align: center;
    }
    .logo {
      width: 100px;
      max-width: 100px;
      height: auto;
      margin: 0 auto;
    }
    .header-content {
      vertical-align: middle;
      padding-left: 20px;
    }
    .header-content h1 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 28px;
      line-height: 1.2;
    }
    .tagline {
      margin: 0;
      color: #555555 !important;
      font-size: 13px;
      line-height: 1.6;
    }
    .tagline em {
      color: #6280a5 !important;
      font-style: normal;
    }
    .top-line {
      height: 4px;
      background-color: #f5a51b !important;
      margin: 0 30px;
    }
    .title-table {
      width: 100%;
      margin-top: 25px;
    }
    .title-blue {
      width: 72%;
      padding: 12px 18px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
    }
    .title-orange {
      width: 28%;
      padding: 12px 10px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }
    .date-reference {
      padding: 25px 30px 10px;
      text-align: right;
      background-color: #ffffff !important;
    }
    .date-reference p {
      margin: 4px 0;
      color: #444444 !important;
      font-size: 13px;
    }
    .content {
      padding: 15px 30px 30px;
      background-color: #ffffff !important;
    }
    .content h2 {
      margin: 0 0 15px;
      color: #205894 !important;
      font-size: 22px;
    }
    .content p {
      color: #333333 !important;
      font-size: 15px;
      line-height: 1.7;
    }
    .event-card {
      margin: 25px 0;
      padding: 22px;
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #f5a51b;
    }
    .event-title {
      margin: 0 0 18px !important;
      color: #205894 !important;
      font-size: 21px !important;
    }
    .description {
      color: #333333 !important;
    }
    .description p {
      margin-top: 5px;
      color: #555555 !important;
    }
    .event-detail {
      margin: 12px 0 !important;
      color: #333333 !important;
    }
    .event-detail strong {
      color: #205894 !important;
    }
    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }
    .event-button {
      display: inline-block;
      padding: 13px 28px;
      background-color: #205894 !important;
      color: #ffffff !important;
      border-radius: 5px;
      font-size: 15px;
      font-weight: bold;
    }
    .closing {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .closing h5 {
      margin: 0 0 10px;
      color: #f27f2d !important;
      font-size: 15px;
    }
    .signature-phone {
      color: #6280a5 !important;
      font-size: 13px !important;
    }
    .closing-logo {
      width: 70px;
      margin: 12px 0;
    }
    .footer-table {
      width: 100%;
    }
    .footer-blue {
      width: 72%;
      padding: 12px 15px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 13px;
    }
    .footer-orange {
      width: 28%;
      padding: 12px 8px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 13px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="invitation">
      <div class="header-section">
        <table class="header-table">
          <tr>
            <td class="logo-cell">
              <img class="logo" src="https://www.wegrowbschool.in/wegrow-logo.png" alt="WeGrow B School Logo">
            </td>
            <td class="header-content">
              <h1>WeGrow B School</h1>
              <p class="tagline"><em>Empowering Skills. Transforming Futures.</em></p>
            </td>
          </tr>
        </table>
      </div>
      <div class="top-line"></div>
      <table class="title-table">
        <tr>
          <td class="title-blue">
            Registration Confirmed - Student Founders Community
          </td>
          <td class="title-orange">
            2026
          </td>
        </tr>
      </table>
      <div class="date-reference">
        <p><strong>Registration Date:</strong> ${formattedDate}</p>
        <p><strong>WeGrow B School</strong></p>
      </div>
      <div class="content">
        <h2>Hello ${data.fullName},</h2>
        <p>
          Your registration for the <strong>Student Founders Community</strong> has been successfully confirmed!
        </p>
        <div class="event-card">
          <h2 class="event-title">
            Student Founders Community
          </h2>
          <div class="description">
            <p>
              An exclusive orientation for college students who want to start, learn, and grow their own ventures — guided by experienced entrepreneurs and a peer community building alongside you.
            </p>
          </div>
          <p class="event-detail"><strong>Full Name:</strong> ${data.fullName}</p>
          <p class="event-detail"><strong>WhatsApp Number:</strong> ${data.phone}</p>
          <p class="event-detail"><strong>Email Address:</strong> ${data.email}</p>
          <p class="event-detail"><strong>College Name:</strong> ${data.collegeName}</p>
          <p class="event-detail"><strong>Course / Degree:</strong> ${data.course}</p>
          <p class="event-detail"><strong>Year of Study:</strong> ${data.yearOfStudy}</p>
          <p class="event-detail"><strong>Batch Duration:</strong> ${data.courseStartYear} - ${data.courseEndYear}</p>
        </div>
        <div class="button-wrapper">
          <a href="https://www.wegrowcampus.in" class="event-button">Visit WeGrow B School</a>
        </div>
        <p><strong>We look forward to seeing you at the orientation!</strong></p>
        <div class="closing">
          <h5>Regards,</h5>
          <img class="closing-logo" src="https://www.wegrowbschool.in/wegrow-logo.png" alt="WeGrow B School Logo">
          <p class="signature-phone">
            <a href="https://www.wegrowcampus.in/" style="color:#205894;">www.wegrowcampus.in</a><br>
            enquiry@wegrowcampus.in
          </p>
        </div>
      </div>
      <table class="footer-table">
        <tr>
          <td class="footer-blue"><strong>WeGrow B School</strong></td>
          <td class="footer-orange"><strong>Empowering Skills.<br>Transforming Futures.</strong></td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail(
      data.email,
      '🎟️ Registration Confirmed - Student Founders Community | WeGrow B School',
      html,
    );
  }

  // ============================================================
  // BUSINESS FOUNDERS CONFIRMATION EMAIL
  // ============================================================

  async sendBusinessFounderConfirmationEmail(data: {
    email: string;
    fullName: string;
    phone: string;
    businessName?: string;
    industry?: string;
    yearsInBusiness?: string;
    biggestPriority?: string;
    growthBlocker?: string;
    hasTeam?: string;
    futureVision?: string;
  }): Promise<boolean> {
    if (!data.email) return false;

    const industryMap: Record<string, string> = {
      manufacturing: 'Manufacturing',
      printing_packaging: 'Printing & Packaging',
      fireworks_matches: 'Fireworks & Matches',
      retail_wholesale: 'Retail & Wholesale',
      textiles_garments: 'Textiles & Garments',
      services_agency: 'Services & Agencies',
      food_hospitality: 'Food & Hospitality',
      tech_digital: 'Tech & Digital',
      other: 'Other Business',
    };

    const yearsMap: Record<string, string> = {
      less_than_1_year: '< 1 Year',
      '1_to_3_years': '1 – 3 Years',
      '3_to_5_years': '3 – 5 Years',
      '5_plus_years': '5+ Years',
    };

    const industryText =
      (data.industry && industryMap[data.industry]) || data.industry || 'Business';
    const yearsText =
      (data.yearsInBusiness && yearsMap[data.yearsInBusiness]) ||
      data.yearsInBusiness ||
      '';

    const formattedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Business Founders Community</title>
  <style>
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 100% !important;
      background-color: #ffffff !important;
      color: #1f2937 !important;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-spacing: 0;
      border-collapse: collapse;
    }
    img {
      border: 0;
      display: block;
      max-width: 100%;
    }
    a {
      text-decoration: none;
    }
    .email-wrapper {
      width: 100%;
      background-color: #ffffff !important;
      padding: 20px 0;
    }
    .invitation {
      width: 680px;
      max-width: 680px;
      margin: 0 auto;
      background-color: #ffffff !important;
      border: 1px solid #e5e7eb;
    }
    .header-section {
      padding: 25px 30px;
      background-color: #ffffff !important;
    }
    .header-table {
      width: 100%;
    }
    .logo-cell {
      width: 130px;
      vertical-align: middle;
      text-align: center;
    }
    .logo {
      width: 100px;
      max-width: 100px;
      height: auto;
      margin: 0 auto;
    }
    .header-content {
      vertical-align: middle;
      padding-left: 20px;
    }
    .header-content h1 {
      margin: 0 0 10px;
      color: #205894 !important;
      font-size: 28px;
      line-height: 1.2;
    }
    .tagline {
      margin: 0;
      color: #555555 !important;
      font-size: 13px;
      line-height: 1.6;
    }
    .tagline em {
      color: #6280a5 !important;
      font-style: normal;
    }
    .top-line {
      height: 4px;
      background-color: #f5a51b !important;
      margin: 0 30px;
    }
    .title-table {
      width: 100%;
      margin-top: 25px;
    }
    .title-blue {
      width: 72%;
      padding: 12px 18px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
    }
    .title-orange {
      width: 28%;
      padding: 12px 10px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
    }
    .date-reference {
      padding: 25px 30px 10px;
      text-align: right;
      background-color: #ffffff !important;
    }
    .date-reference p {
      margin: 4px 0;
      color: #444444 !important;
      font-size: 13px;
    }
    .content {
      padding: 15px 30px 30px;
      background-color: #ffffff !important;
    }
    .content h2 {
      margin: 0 0 15px;
      color: #205894 !important;
      font-size: 22px;
    }
    .content p {
      color: #333333 !important;
      font-size: 15px;
      line-height: 1.7;
    }
    .event-card {
      margin: 25px 0;
      padding: 22px;
      background-color: #f8fafc !important;
      border: 1px solid #e2e8f0;
      border-left: 5px solid #f5a51b;
    }
    .event-title {
      margin: 0 0 18px !important;
      color: #205894 !important;
      font-size: 21px !important;
    }
    .description {
      color: #333333 !important;
    }
    .description p {
      margin-top: 5px;
      color: #555555 !important;
    }
    .event-detail {
      margin: 12px 0 !important;
      color: #333333 !important;
    }
    .event-detail strong {
      color: #205894 !important;
    }
    .button-wrapper {
      text-align: center;
      margin: 30px 0;
    }
    .event-button {
      display: inline-block;
      padding: 13px 28px;
      background-color: #205894 !important;
      color: #ffffff !important;
      border-radius: 5px;
      font-size: 15px;
      font-weight: bold;
    }
    .closing {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .closing h5 {
      margin: 0 0 10px;
      color: #f27f2d !important;
      font-size: 15px;
    }
    .signature-phone {
      color: #6280a5 !important;
      font-size: 13px !important;
    }
    .closing-logo {
      width: 70px;
      margin: 12px 0;
    }
    .footer-table {
      width: 100%;
    }
    .footer-blue {
      width: 72%;
      padding: 12px 15px;
      background-color: #205894 !important;
      color: #ffffff !important;
      font-size: 13px;
    }
    .footer-orange {
      width: 28%;
      padding: 12px 8px;
      background-color: #f5a51b !important;
      color: #ffffff !important;
      font-size: 13px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="invitation">
      <div class="header-section">
        <table class="header-table">
          <tr>
            <td class="logo-cell">
              <img class="logo" src="https://www.wegrowbschool.in/wegrow-logo.png" alt="WeGrow B School Logo">
            </td>
            <td class="header-content">
              <h1>WeGrow B School</h1>
              <p class="tagline"><em>Empowering Skills. Transforming Futures.</em></p>
            </td>
          </tr>
        </table>
      </div>
      <div class="top-line"></div>
      <table class="title-table">
        <tr>
          <td class="title-blue">
            Seat Reserved - Business Founders Community
          </td>
          <td class="title-orange">
            2026
          </td>
        </tr>
      </table>
      <div class="date-reference">
        <p><strong>Registration Date:</strong> ${formattedDate}</p>
        <p><strong>WeGrow B School</strong></p>
      </div>
      <div class="content">
        <h2>Hello ${data.fullName},</h2>
        <p>
          Your seat reservation for the <strong>Business Founders Community</strong> orientation & mentorship session has been confirmed!
        </p>
        <div class="event-card">
          <h2 class="event-title">
            தொழில் முனைவோர் சமூகம் (Business Founders Orientation)
          </h2>
          <div class="description">
            <p>
              An exclusive session for business owners, manufacturers, and traders to connect with growth mentors, address scaling bottlenecks, and transition from daily operations to strategic ownership with WeGrow B School.
            </p>
          </div>
          <p class="event-detail"><strong>Full Name:</strong> ${data.fullName}</p>
          <p class="event-detail"><strong>WhatsApp Number:</strong> ${data.phone}</p>
          ${data.email ? `<p class="event-detail"><strong>Email Address:</strong> ${data.email}</p>` : ''}
          ${data.businessName ? `<p class="event-detail"><strong>Business / Enterprise Name:</strong> ${data.businessName}</p>` : ''}
          <p class="event-detail"><strong>Sector / Industry:</strong> ${industryText}</p>
          ${yearsText ? `<p class="event-detail"><strong>Years in Business:</strong> ${yearsText}</p>` : ''}
          ${data.biggestPriority ? `<p class="event-detail"><strong>Primary Business Priority:</strong> ${data.biggestPriority}</p>` : ''}
          ${data.growthBlocker ? `<p class="event-detail"><strong>Growth Challenge / Blocker:</strong> ${data.growthBlocker}</p>` : ''}
          ${data.futureVision ? `<p class="event-detail"><strong>Future 2-3 Year Vision:</strong> ${data.futureVision}</p>` : ''}
        </div>
        <div class="button-wrapper">
          <a href="https://www.wegrowcampus.in" class="event-button">Visit WeGrow B School</a>
        </div>
        <p><strong>We look forward to seeing you at the orientation!</strong></p>
        <div class="closing">
          <h5>Regards,</h5>
          <img class="closing-logo" src="https://www.wegrowbschool.in/wegrow-logo.png" alt="WeGrow B School Logo">
          <p class="signature-phone">
            <a href="https://www.wegrowcampus.in/" style="color:#205894;">www.wegrowcampus.in</a><br>
            enquiry@wegrowcampus.in
          </p>
        </div>
      </div>
      <table class="footer-table">
        <tr>
          <td class="footer-blue"><strong>WeGrow B School</strong></td>
          <td class="footer-orange"><strong>Empowering Skills.<br>Transforming Futures.</strong></td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail(
      data.email,
      '🎟️ Seat Reserved - Business Founders Community | WeGrow B School',
      html,
    );
  }

  // ============================================================
  // STUDENT TASK ASSIGNMENT EMAIL
  // ============================================================

  async sendStudentTaskAssignmentEmail(data: {
    email: string;
    name: string;
    studentId: string;
    taskTitle: string;
    taskCategory: string;
    duration: number;
    maxMarks: number;
    taskUrl: string;
  }): Promise<boolean> {
    if (!data.email) return false;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Task Assigned - WeGrow Connect</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 0; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #104288 0%, #0c2b57 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; color: #f3a812; font-weight: 600; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .card-title { font-size: 17px; font-weight: 700; color: #104288; margin: 0 0 12px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #0f172a; font-weight: 600; }
    .rules-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 13px; color: #92400e; }
    .rules-box ul { margin: 6px 0 0; padding-left: 18px; }
    .btn-wrap { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #f3a812; color: #0f172a !important; font-weight: 700; font-size: 16px; padding: 14px 36px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(243,168,18,0.3); }
    .footer { background: #0f172a; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
    .footer strong { color: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>WeGrow Connect</h1>
      <p>Talent Identification & Assessment Platform</p>
    </div>
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      <p>Thank you for registering on the WeGrow Connect Talent Platform (Student ID: <strong>${data.studentId}</strong>). Your specialized assessment task is ready for you.</p>

      <div class="card">
        <h3 class="card-title">${data.taskTitle}</h3>
        <div class="info-row"><span class="info-label">Category:</span><span class="info-value">${data.taskCategory}</span></div>
        <div class="info-row"><span class="info-label">Duration:</span><span class="info-value">${data.duration} Minutes</span></div>
        <div class="info-row"><span class="info-label">Maximum Marks:</span><span class="info-value">${data.maxMarks}</span></div>
      </div>

      <div class="rules-box">
        <strong>⚠️ Strict Anti-Cheating & Proctored Rules:</strong>
        <ul>
          <li>Camera & Microphone must be turned on throughout the assessment.</li>
          <li>The test must be taken in Fullscreen mode.</li>
          <li>Tab switching, window resizing, or leaving the test window is logged as a violation.</li>
          <li>Copy, Cut, Paste, and right-click are strictly disabled.</li>
          <li>Answers are automatically submitted when the 60-minute timer expires.</li>
        </ul>
      </div>

      <div class="btn-wrap">
        <a href="${data.taskUrl}" class="btn">🚀 Start Your Task Now</a>
      </div>

      <p style="font-size: 13px; color: #64748b; text-align: center;">Or copy this link to your browser:<br><a href="${data.taskUrl}" style="color: #104288; word-break: break-all;">${data.taskUrl}</a></p>
    </div>
    <div class="footer">
      <strong>WeGrow B-School</strong> &bull; Empowering Skills. Transforming Futures.<br>
      For queries, reach out at <a href="mailto:enquiry@wegrowcampus.in" style="color:#f3a812;">enquiry@wegrowcampus.in</a>
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail(
      data.email,
      `📝 Online Skill Task Assigned: ${data.taskTitle} | WeGrow Connect`,
      html,
    );
  }

  // ============================================================
  // STUDENT WINNER / GIFT OFFER EMAIL
  // ============================================================

  async sendStudentWinnerOfferEmail(data: {
    email: string;
    name: string;
    studentId: string;
    taskTitle: string;
    score: number;
    maxMarks: number;
    customMessage?: string;
  }): Promise<boolean> {
    if (!data.email) return false;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Congratulations - WeGrow Connect Winner</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 0; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #15803d 0%, #166534 100%); padding: 36px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 800; }
    .header p { margin: 8px 0 0; font-size: 15px; color: #fde047; font-weight: 600; }
    .content { padding: 32px 28px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
    .score-badge { background: #dcfce7; border: 2px solid #86efac; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0; }
    .score-num { font-size: 32px; font-weight: 800; color: #15803d; }
    .score-sub { font-size: 13px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .offer-box { background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .offer-title { font-size: 16px; font-weight: 700; color: #1e40af; margin: 0 0 10px; }
    .footer { background: #0f172a; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
    .footer strong { color: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations, Winner!</h1>
      <p>Exclusive Gift Offer & Branch Invitation</p>
    </div>
    <div class="content">
      <p class="greeting">Dear ${data.name},</p>
      <p>Congratulations on your outstanding performance in the WeGrow Connect Talent Assessment for <strong>${data.taskTitle}</strong>!</p>

      <div class="score-badge">
        <div class="score-num">${data.score} / ${data.maxMarks}</div>
        <div class="score-sub">Your Final Score</div>
      </div>

      <div class="offer-box">
        <h4 class="offer-title">🎁 You have been selected for an Exclusive Gift & Scholarship Offer!</h4>
        <p style="font-size: 14px; line-height: 1.6; color: #1e3a8a; margin: 0;">
          ${data.customMessage || 'We are thrilled to invite you to visit our WeGrow B-School branch to meet our academic leadership, receive your official certificate of achievement, and claim your special gift reward.'}
        </p>
        <div style="margin-top: 16px; font-size: 13px; color: #3b82f6; font-weight: 600;">
          📍 Branch Address: WeGrow B-School Campus<br>
          📞 Helpline: +91 98765 43210 &bull; enquiry@wegrowcampus.in
        </div>
      </div>

      <p style="font-size: 14px; color: #475569;">Please carry your Student ID card (<strong>${data.studentId}</strong>) and a copy of this email when you visit our campus.</p>
    </div>
    <div class="footer">
      <strong>WeGrow B-School</strong> &bull; Empowering Skills. Transforming Futures.<br>
      <a href="https://www.wegrowcampus.in" style="color: #fde047; text-decoration: none;">www.wegrowcampus.in</a>
    </div>
  </div>
</body>
</html>
`;

    return this.sendEmail(
      data.email,
      `🎉 Congratulations! You are selected for WeGrow Gift Offer (${data.name})`,
      html,
    );
  }
}
