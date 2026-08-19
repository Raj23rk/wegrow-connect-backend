import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import * as path from 'path';
import * as fs from 'fs';

import { chromium, Browser } from 'playwright';

import {
  Invoice,
  InvoiceDocument,
  InvoiceStatus,
} from './schemas/invoice.schema';

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
    // ============================================================
    // INVOICE DIRECTORY
    // ============================================================

    this.invoiceDir = path.resolve(
      process.env.INVOICES_PATH || './uploads/invoices',
    );

    if (!fs.existsSync(this.invoiceDir)) {
      fs.mkdirSync(this.invoiceDir, {
        recursive: true,
      });

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

    const month = d.toLocaleString('en-IN', {
      month: 'long',
    });

    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  }

  // ============================================================
  // GENERATE PDF USING PLAYWRIGHT
  // ============================================================

  private async generatePdf(
    html: string,
    outputPath: string,
  ): Promise<void> {
    this.logger.log('Starting Playwright PDF generation...');

    let browser: Browser | null = null;

    try {
      // ----------------------------------------------------------
      // START CHROMIUM
      // ----------------------------------------------------------

      browser = await chromium.launch({
        headless: true,
      });

      this.logger.log('Playwright Chromium browser started');

      // ----------------------------------------------------------
      // CREATE PAGE
      // ----------------------------------------------------------

      const page = await browser.newPage({
        viewport: {
          width: 1280,
          height: 720,
        },
      });

      // ----------------------------------------------------------
      // LOAD HTML
      // ----------------------------------------------------------

      await page.setContent(html, {
        waitUntil: 'load',
      });

      this.logger.log('Invoice HTML loaded successfully');

      // ----------------------------------------------------------
      // GENERATE PDF
      // ----------------------------------------------------------

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      this.logger.log(
        `PDF generated successfully: ${outputPath}`,
      );
    } catch (error) {
      this.logger.error(
        'Playwright PDF generation failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    } finally {
      // ----------------------------------------------------------
      // CLOSE BROWSER
      // ----------------------------------------------------------

      if (browser) {
        try {
          await browser.close();

          this.logger.log(
            'Playwright Chromium browser closed',
          );
        } catch (closeError) {
          this.logger.warn(
            `Failed to close Playwright browser: ${
              closeError instanceof Error
                ? closeError.message
                : String(closeError)
            }`,
          );
        }
      }
    }
  }

  // ============================================================
  // ADMIN: GENERATE INVOICE
  // POST /invoices/generate
  // ============================================================

  async generateInvoice(dto: GenerateInvoiceDto) {
    try {
      // ========================================================
      // 1. VALIDATE USER ID
      // ========================================================

      if (!dto.userId) {
        throw new BadRequestException(
          'User ID is required',
        );
      }

      if (!Types.ObjectId.isValid(dto.userId)) {
        throw new BadRequestException(
          `Invalid user ID: ${dto.userId}`,
        );
      }

      // ========================================================
      // 2. FIND USER
      // ========================================================

      const user = await this.userModel
        .findById(dto.userId)
        .select('firstName lastName email phone')
        .lean();

      if (!user) {
        throw new NotFoundException(
          `User not found with ID: ${dto.userId}`,
        );
      }

      const clientName =
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Client';

      // ========================================================
      // 3. VALIDATE ITEMS
      // ========================================================

      if (!dto.items || !Array.isArray(dto.items)) {
        throw new BadRequestException(
          'Invoice items are required',
        );
      }

      if (dto.items.length === 0) {
        throw new BadRequestException(
          'At least one invoice item is required',
        );
      }

      // ========================================================
      // 4. CURRENCY
      // ========================================================

      const currency = dto.currency || 'INR';

      // ========================================================
      // 5. TAX
      // ========================================================

      const taxPercent =
        dto.taxPercent !== undefined
          ? Number(dto.taxPercent)
          : 0;

      if (!Number.isFinite(taxPercent) || taxPercent < 0) {
        throw new BadRequestException(
          'Invalid tax percentage',
        );
      }

      // ========================================================
      // 6. CALCULATE ITEMS
      // ========================================================

      const items = dto.items.map((item) => {
        const quantity = Number(item.quantity);

        const unitPrice = Number(item.unitPrice);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new BadRequestException(
            `Invalid quantity for item: ${item.description}`,
          );
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new BadRequestException(
            `Invalid unit price for item: ${item.description}`,
          );
        }

        const amount =
          Math.round(quantity * unitPrice * 100) / 100;

        return {
          description: item.description,
          quantity,
          unitPrice,
          amount,
        };
      });

      // ========================================================
      // 7. CALCULATE SUBTOTAL
      // ========================================================

      const subtotal =
        Math.round(
          items.reduce(
            (sum, item) => sum + item.amount,
            0,
          ) * 100,
        ) / 100;

      // ========================================================
      // 8. CALCULATE TAX
      // ========================================================

      const tax =
        Math.round(
          ((subtotal * taxPercent) / 100) * 100,
        ) / 100;

      // ========================================================
      // 9. CALCULATE TOTAL
      // ========================================================

      const total =
        Math.round((subtotal + tax) * 100) / 100;

      // ========================================================
      // 10. GENERATE INVOICE NUMBER
      // ========================================================

      const invoiceNumber =
        await this.generateInvoiceNumber();

      // ========================================================
      // 11. DATES
      // ========================================================

      const issuedDate = new Date();

      const dueDate = new Date();

      dueDate.setDate(dueDate.getDate() + 7);

      // ========================================================
      // 12. GENERATE HTML
      // ========================================================

      const html = generateInvoiceHtml({
        invoiceNumber,

        issuedDate: this.formatDate(issuedDate),

        dueDate: this.formatDate(dueDate),

        clientName,

        clientEmail: user.email || '',

        clientPhone: user.phone || '',

        items,

        subtotal,

        tax,

        total,

        currency,

        status: InvoiceStatus.ISSUED,
      });

      if (!html) {
        throw new Error(
          'Invoice HTML generation returned empty content',
        );
      }

      // ========================================================
      // 13. ENSURE DIRECTORY EXISTS
      // ========================================================

      await fs.promises.mkdir(this.invoiceDir, {
        recursive: true,
      });

      // ========================================================
      // 14. PDF FILE PATH
      // ========================================================

      const fileName = `${invoiceNumber}.pdf`;

      const filePath = path.join(
        this.invoiceDir,
        fileName,
      );

      // ========================================================
      // 15. GENERATE PDF
      // ========================================================

      await this.generatePdf(
        html,
        filePath,
      );

      // ========================================================
      // 16. VERIFY PDF EXISTS
      // ========================================================

      if (!fs.existsSync(filePath)) {
        throw new Error(
          'PDF file was not created',
        );
      }

      // ========================================================
      // 17. SAVE INVOICE TO DATABASE
      // ========================================================

      const invoiceData = {
        userId: new Types.ObjectId(dto.userId),

        bookingId:
          dto.bookingId &&
          Types.ObjectId.isValid(dto.bookingId)
            ? new Types.ObjectId(dto.bookingId)
            : undefined,

        subscriptionId:
          dto.subscriptionId &&
          Types.ObjectId.isValid(dto.subscriptionId)
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
      };

      const invoice =
        await this.invoiceModel.create(
          invoiceData,
        );

      this.logger.log(
        `Invoice created successfully: ${invoice.invoiceNumber}`,
      );

      // ========================================================
      // 18. SUCCESS RESPONSE
      // ========================================================

      return {
        success: true,

        message: 'Invoice generated successfully',

        invoice: {
          id: invoice._id,

          invoiceNumber:
            invoice.invoiceNumber,

          total: invoice.total,

          currency: invoice.currency,

          status: invoice.status,

          issuedDate: invoice.issuedDate,

          dueDate: invoice.dueDate,

          filePath: invoice.filePath,
        },
      };
    } catch (error) {
      // ========================================================
      // LOG ERROR
      // ========================================================

      this.logger.error(
        'INVOICE GENERATION ERROR',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      // ========================================================
      // PRESERVE HTTP EXCEPTIONS
      // ========================================================

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // ========================================================
      // INTERNAL ERROR
      // ========================================================

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Failed to generate invoice',
      );
    }
  }

  // ============================================================
  // ADMIN: ALL INVOICES
  // GET /invoices
  // ============================================================

  async findAll(
    page = 1,
    limit = 10,
  ) {
    page = Math.max(
      Number(page) || 1,
      1,
    );

    limit = Math.min(
      Math.max(
        Number(limit) || 10,
        1,
      ),
      100,
    );

    const skip = (page - 1) * limit;

    const [
      invoices,
      total,
    ] = await Promise.all([
      this.invoiceModel
        .find({
          isActive: true,
        })
        .populate(
          'userId',
          'firstName lastName email phone',
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      this.invoiceModel.countDocuments({
        isActive: true,
      }),
    ]);

    return {
      success: true,

      invoices,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(
          total / limit,
        ),
      },
    };
  }

  // ============================================================
  // ADMIN: SINGLE INVOICE
  // GET /invoices/:id
  // ============================================================

  async findOne(
    invoiceId: string,
  ) {
    if (
      !Types.ObjectId.isValid(invoiceId)
    ) {
      throw new NotFoundException(
        'Invalid invoice ID',
      );
    }

    const invoice =
      await this.invoiceModel
        .findById(invoiceId)
        .populate(
          'userId',
          'firstName lastName email phone',
        )
        .lean();

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found',
      );
    }

    return {
      success: true,
      invoice,
    };
  }

  // ============================================================
  // USER: MY INVOICES
  // GET /invoices/my
  // ============================================================

  async findMyInvoices(
    userId: string,
  ) {
    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        'Invalid user ID',
      );
    }

    const invoices =
      await this.invoiceModel
        .find({
          userId:
            new Types.ObjectId(userId),

          isActive: true,
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return {
      success: true,
      invoices,
    };
  }

  // ============================================================
  // DOWNLOAD INVOICE
  // GET /invoices/download/:id
  // ============================================================

  async downloadInvoice(
    invoiceId: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<{
    filePath: string;
    fileName: string;
  }> {
    // ----------------------------------------------------------
    // VALIDATE INVOICE ID
    // ----------------------------------------------------------

    if (
      !Types.ObjectId.isValid(invoiceId)
    ) {
      throw new NotFoundException(
        'Invalid invoice ID',
      );
    }

    // ----------------------------------------------------------
    // VALIDATE USER ID
    // ----------------------------------------------------------

    if (
      !Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException(
        'Invalid user ID',
      );
    }

    // ----------------------------------------------------------
    // CREATE FILTER
    // ----------------------------------------------------------

    const filter: {
      _id: Types.ObjectId;
      isActive: boolean;
      userId?: Types.ObjectId;
    } = {
      _id:
        new Types.ObjectId(invoiceId),

      isActive: true,
    };

    // ----------------------------------------------------------
    // NON-ADMIN CAN ONLY DOWNLOAD OWN INVOICE
    // ----------------------------------------------------------

    if (!isAdmin) {
      filter.userId =
        new Types.ObjectId(userId);
    }

    // ----------------------------------------------------------
    // FIND INVOICE
    // ----------------------------------------------------------

    const invoice =
      await this.invoiceModel.findOne(
        filter,
      );

    if (!invoice) {
      throw new NotFoundException(
        'Invoice not found',
      );
    }

    // ----------------------------------------------------------
    // CHECK FILE
    // ----------------------------------------------------------

    if (
      !invoice.filePath ||
      !fs.existsSync(
        invoice.filePath,
      )
    ) {
      throw new NotFoundException(
        'Invoice file not found on server',
      );
    }

    // ----------------------------------------------------------
    // FILE NAME
    // ----------------------------------------------------------

    const fileName =
      `Invoice_${invoice.invoiceNumber}.pdf`;

    // ----------------------------------------------------------
    // RETURN FILE
    // ----------------------------------------------------------

    return {
      filePath: invoice.filePath,

      fileName,
    };
  }
}