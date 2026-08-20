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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CertificatesService } from './certificates.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ============================================================
  // ADMIN: GENERATE CERTIFICATES FOR ALL EVENT ATTENDEES
  // POST /api/v1/certificates/generate/:eventId
  // ============================================================

  @Post('generate/:eventId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin: Generate certificates for all confirmed attendees of an event',
  })
  @ApiParam({ name: 'eventId', description: 'MongoDB Event ID' })
  async generateCertificates(@Param('eventId') eventId: string) {
    const data =
      await this.certificatesService.generateCertificatesForEvent(eventId);
    return {
      success: true,
      message: 'Certificates generated successfully',
      data,
    };
  }

  // ============================================================
  // ADMIN: CREATE SINGLE CERTIFICATE
  // POST /api/v1/certificates/create-certificate
  // POST /api/v1/certificates
  // ============================================================

  @Post('create-certificate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create single certificate' })
  @ApiResponse({
    status: 201,
    description: 'Certificate created successfully.',
  })
  async createSingleCertificate(@Body() dto: CreateCertificateDto) {
    const data = await this.certificatesService.createSingleCertificate(dto);
    return {
      success: true,
      message: 'Certificate created successfully',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create single certificate (Alias)' })
  async createSingleCertificateAlias(@Body() dto: CreateCertificateDto) {
    const data = await this.certificatesService.createSingleCertificate(dto);
    return {
      success: true,
      message: 'Certificate created successfully',
      data,
    };
  }

  // ============================================================
  // ADMIN: GET ALL CERTIFICATES (PAGINATED WITH SEARCH)
  // GET /api/v1/certificates/all-certificates
  // GET /api/v1/certificates/all
  // ============================================================

  @Get('all-certificates')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all certificates' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'Python' })
  @ApiQuery({ name: 'eventId', required: false })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
  ) {
    const data = await this.certificatesService.findAll(
      Number(page),
      Number(limit),
      search,
      eventId,
    );

    return {
      success: true,
      message: 'Certificates fetched successfully',
      data,
    };
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all certificates (Alias)' })
  async findAllAlias(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
  ) {
    const data = await this.certificatesService.findAll(
      Number(page),
      Number(limit),
      search,
      eventId,
    );

    return {
      success: true,
      message: 'Certificates fetched successfully',
      data,
    };
  }

  // ============================================================
  // USER (STUDENT / BUSINESS): GET MY CERTIFICATES
  // GET /api/v1/certificates/my-certificates
  // GET /api/v1/certificates/my
  // ============================================================

  @Get('my-certificates')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my certificates (Student / Business)' })
  async myCertificates(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    const data = await this.certificatesService.findMyCertificates(
      req.user.userId,
      Number(page),
      Number(limit),
      search,
    );

    return {
      success: true,
      message: 'Certificates fetched successfully',
      data,
    };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my certificates (Student / Business - Alias)' })
  async myCertificatesAlias(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    const data = await this.certificatesService.findMyCertificates(
      req.user.userId,
      Number(page),
      Number(limit),
      search,
    );

    return {
      success: true,
      message: 'Certificates fetched successfully',
      data,
    };
  }

  // ============================================================
  // BASE GET ALL (ADMIN DEFAULT)
  // GET /api/v1/certificates
  // ============================================================

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all certificates (Default)' })
  async findAllBase(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('eventId') eventId?: string,
  ) {
    const data = await this.certificatesService.findAll(
      Number(page),
      Number(limit),
      search,
      eventId,
    );

    return {
      success: true,
      message: 'Certificates fetched successfully',
      data,
    };
  }

  // ============================================================
  // SINGLE CERTIFICATE DETAILS BY ID
  // GET /api/v1/certificates/:id
  // ============================================================

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get certificate details by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user?.role === 'ADMIN';
    const data = await this.certificatesService.findOne(
      id,
      req.user?.userId,
      isAdmin,
    );

    return {
      success: true,
      message: 'Certificate fetched successfully',
      data,
    };
  }
}
