import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { InvoicesService } from './invoices.service';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ============================================================
  // ADMIN: GENERATE INVOICE
  // POST /invoices/generate
  // ============================================================

  @Post('generate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Generate a payment invoice for a user' })
  generateInvoice(@Body() dto: GenerateInvoiceDto) {
    return this.invoicesService.generateInvoice(dto);
  }

  // ============================================================
  // ADMIN: ALL INVOICES
  // GET /invoices
  // ============================================================

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all invoices' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.invoicesService.findAll(page, limit);
  }

  // ============================================================
  // USER: MY INVOICES
  // GET /invoices/my
  // ============================================================

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User: Get my invoices' })
  findMyInvoices(@Request() req: any) {
    return this.invoicesService.findMyInvoices(req.user.userId);
  }

  // ============================================================
  // USER/ADMIN: DOWNLOAD INVOICE PDF
  // GET /invoices/download/:id
  // ============================================================

  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User/Admin: Download invoice PDF' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  async downloadInvoice(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const isAdmin = req.user.role === 'ADMIN';

    const { filePath, fileName } = await this.invoicesService.downloadInvoice(
      id,
      req.user.userId,
      isAdmin,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    res.sendFile(filePath, { root: '/' }, (err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to send invoice file' });
      }
    });
  }

  // ============================================================
  // ADMIN: SINGLE INVOICE
  // GET /invoices/:id
  // ============================================================

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get single invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }
}
