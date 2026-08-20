import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';

import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // ============================================================
  // ADMIN: CREATE INVOICE
  // POST /api/v1/invoices/create-invoice
  // POST /api/v1/invoices
  // ============================================================

  @Post('create-invoice')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create invoice (Admin Only)' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully.' })
  async createInvoice(@Body() dto: CreateInvoiceDto) {
    const data = await this.invoicesService.createInvoice(dto);
    return {
      success: true,
      message: 'Invoice created successfully',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create invoice (Admin Only - Alias)' })
  async createInvoiceAlias(@Body() dto: CreateInvoiceDto) {
    const data = await this.invoicesService.createInvoice(dto);
    return {
      success: true,
      message: 'Invoice created successfully',
      data,
    };
  }

  // ============================================================
  // ADMIN: GET ALL INVOICES (PAGINATED WITH SEARCH)
  // GET /api/v1/invoices/all-invoices
  // GET /api/v1/invoices/all
  // ============================================================

  @Get('all-invoices')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invoices (Admin Only)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'Raj' })
  @ApiQuery({ name: 'status', required: false, example: 'PAID' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.invoicesService.findAll(
      Number(page),
      Number(limit),
      search,
      status,
    );

    return {
      success: true,
      message: 'Invoices fetched successfully',
      data,
    };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invoices (Admin Only - Alias)' })
  async findAllAlias(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.invoicesService.findAll(
      Number(page),
      Number(limit),
      search,
      status,
    );

    return {
      success: true,
      message: 'Invoices fetched successfully',
      data,
    };
  }

  // ============================================================
  // USER (STUDENT / BUSINESS): GET MY INVOICES
  // GET /api/v1/invoices/my-invoices
  // GET /api/v1/invoices/my
  // ============================================================

  @Get('my-invoices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my invoices (Student / Business)' })
  async myInvoices(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    const data = await this.invoicesService.findMyInvoices(
      req.user.userId,
      Number(page),
      Number(limit),
      search,
    );

    return {
      success: true,
      message: 'Invoices fetched successfully',
      data,
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my invoices (Student / Business - Alias)' })
  async myInvoicesAlias(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    const data = await this.invoicesService.findMyInvoices(
      req.user.userId,
      Number(page),
      Number(limit),
      search,
    );

    return {
      success: true,
      message: 'Invoices fetched successfully',
      data,
    };
  }

  // ============================================================
  // GET ALL INVOICES (BASE GET /api/v1/invoices) - ADMIN DEFAULT
  // ============================================================

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all invoices (Admin Default)' })
  async findAllBase(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.invoicesService.findAll(
      Number(page),
      Number(limit),
      search,
      status,
    );

    return {
      success: true,
      message: 'Invoices fetched successfully',
      data,
    };
  }

  // ============================================================
  // SINGLE INVOICE DETAILS BY ID
  // GET /api/v1/invoices/:id
  // ============================================================

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice details by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user?.role === 'ADMIN';
    const data = await this.invoicesService.findOne(
      id,
      req.user?.userId,
      isAdmin,
    );

    return {
      success: true,
      message: 'Invoice fetched successfully',
      data,
    };
  }
}
