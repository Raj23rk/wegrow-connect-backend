import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import * as fs from 'fs';
import puppeteer from 'puppeteer';

import { Invoice, InvoiceDocument, InvoiceStatus } from './schemas/invoice.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { generateInvoiceHtml } from './invoice.template';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  private readonly invoiceDir: string;

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    // --------------------------------------------------------
    // ENSURE INVOICE DIRECTORY EXISTS
    // --------------------------------------------------------

    this.invoiceDir = path.resolve(
      process.env.INVOICES_PATH || './uploads/invoices',
    );

    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, { recursive: true });
      this.logger.log(`Created invoice directory: ${this.invoiceDir}`);
    }
  }

  // ============================================================
  // GENERATE UNIQUE INVOICE NUMBER
  // ============================================================

  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();

    const count = await this.invoiceModel.countDocuments();

    const serial = String(count + 1).padStart(5, '0');

    return `INV-${year}-${serial}`;
  }

  // ============================================================
  // FORMAT DATE
  // ============================================================

  private formatDate(date: Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-IN', { month: 'long' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  }

  // ============================================================
  // GENERATE PDF FROM HTML
  // ============================================================

  private async generatePdf(html: string, outputPath: string): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
    } finally {
      await browser.close();
    }
  }

  // ============================================================
  // ADMIN: GENERATE INVOICE
  // POST /invoices/generate
  // ============================================================

  async generateInvoice(dto: GenerateInvoiceDto) {
    try {
      // --------------------------------------------------------
      // 1. FIND USER
      // --------------------------------------------------------

      if (!Types.ObjectId.isValid(dto.userId)) {
        throw new NotFoundException('Invalid user ID');
      }

      const user = await this.userModel
        .findById(dto.userId)
        .select('firstName lastName email phone')
        .lean();

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const clientName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Client';

      // --------------------------------------------------------
      // 2. CALCULATE AMOUNTS
      // --------------------------------------------------------

      const currency = dto.currency || 'INR';
      const taxPercent = dto.taxPercent || 0;

      const items = dto.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
      }));

      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      const tax = Math.round((subtotal * taxPercent) / 100 * 100) / 100;
      const total = Math.round((subtotal + tax) * 100) / 100;

      // --------------------------------------------------------
      // 3. GENERATE INVOICE NUMBER
      // --------------------------------------------------------

      const invoiceNumber = await this.generateInvoiceNumber();

      const issuedDate = new Date();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

      // --------------------------------------------------------
      // 4. GENERATE PDF
      // --------------------------------------------------------

      const html = generateInvoiceHtml({
        invoiceNumber,
        issuedDate: this.formatDate(issuedDate),
        dueDate: this.formatDate(dueDate),
        clientName,
        clientEmail: user.email,
        clientPhone: user.phone,
        items,
        subtotal,
        tax,
        total,
        currency,
        status: InvoiceStatus.ISSUED,
      });

      const fileName = `${invoiceNumber}.pdf`;
      const filePath = path.join(this.invoiceDir, fileName);

      await this.generatePdf(html, filePath);

      this.logger.log(`Invoice PDF generated: ${fileName}`);

      // --------------------------------------------------------
      // 5. SAVE TO DB
      // --------------------------------------------------------

      const invoice = await this.invoiceModel.create({
        userId: new Types.ObjectId(dto.userId),
        bookingId: dto.bookingId
          ? new Types.ObjectId(dto.bookingId)
          : undefined,
        subscriptionId: dto.subscriptionId
          ? new Types.ObjectId(dto.subscriptionId)
          : undefined,
        invoiceNumber,
        items,
        subtotal,
        tax,
        total,
        currency,
        status: InvoiceStatus.ISSUED,
        issuedDate,
        dueDate,
        filePath,
        isActive: true,
      });

      this.logger.log(`Invoice saved: ${invoice._id}`);

      // --------------------------------------------------------
      // 6. RETURN
      // --------------------------------------------------------

      return {
        success: true,
        message: 'Invoice generated successfully',
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          currency: invoice.currency,
          status: invoice.status,
          issuedDate: invoice.issuedDate,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        'Failed to generate invoice',
        error instanceof Error ? error.stack : String(error),
      );

      throw new InternalServerErrorException('Failed to generate invoice');
    }
  }

  // ============================================================
  // ADMIN: ALL INVOICES
  // GET /invoices
  // ============================================================

  async findAll(page = 1, limit = 10) {
    page = Math.max(Number(page) || 1, 1);
    limit = Math.min(Math.max(Number(limit) || 10, 1), 100);

    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find({ isActive: true })
        .populate('userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.invoiceModel.countDocuments({ isActive: true }),
    ]);

    return {
      success: true,
      invoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // ADMIN: SINGLE INVOICE
  // GET /invoices/:id
  // ============================================================

  async findOne(invoiceId: string) {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new NotFoundException('Invalid invoice ID');
    }

    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .populate('userId', 'firstName lastName email phone')
      .lean();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return { success: true, invoice };
  }

  // ============================================================
  // USER: MY INVOICES
  // GET /invoices/my
  // ============================================================

  async findMyInvoices(userId: string) {
    const invoices = await this.invoiceModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, invoices };
  }

  // ============================================================
  // USER/ADMIN: DOWNLOAD INVOICE
  // GET /invoices/download/:id
  // ============================================================

  async downloadInvoice(
    invoiceId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{ filePath: string; fileName: string }> {
    if (!Types.ObjectId.isValid(invoiceId)) {
      throw new NotFoundException('Invalid invoice ID');
    }

    const filter: any = { _id: new Types.ObjectId(invoiceId), isActive: true };

    // Non-admin can only download their own
    if (!isAdmin) {
      filter.userId = new Types.ObjectId(userId);
    }

    const invoice = await this.invoiceModel.findOne(filter);

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (!invoice.filePath || !fs.existsSync(invoice.filePath)) {
      throw new NotFoundException('Invoice file not found on server');
    }

    const fileName = `Invoice_${invoice.invoiceNumber}.pdf`;

    return { filePath: invoice.filePath, fileName };
  }
}
