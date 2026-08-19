import {
  Controller,
  Get,
  Post,
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
import { CertificatesService } from './certificates.service';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  // ============================================================
  // ADMIN: GENERATE CERTIFICATES FOR AN EVENT
  // POST /certificates/generate/:eventId
  // ============================================================

  @Post('generate/:eventId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Admin: Generate certificates for all confirmed attendees of an event',
  })
  @ApiParam({ name: 'eventId', description: 'MongoDB Event ID' })
  generateCertificates(@Param('eventId') eventId: string) {
    return this.certificatesService.generateCertificatesForEvent(eventId);
  }

  // ============================================================
  // ADMIN: ALL CERTIFICATES
  // GET /certificates
  // ============================================================

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get all certificates (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'eventId', required: false })
  findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('eventId') eventId?: string,
  ) {
    return this.certificatesService.findAll(page, limit, eventId);
  }

  // ============================================================
  // ADMIN: CERTIFICATES BY EVENT
  // GET /certificates/event/:eventId
  // ============================================================

  @Get('event/:eventId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Get certificates for a specific event' })
  findByEvent(@Param('eventId') eventId: string) {
    return this.certificatesService.findByEvent(eventId);
  }

  // ============================================================
  // USER: MY CERTIFICATES
  // GET /certificates/my
  // ============================================================

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User: Get my certificates' })
  findMyCertificates(@Request() req: any) {
    return this.certificatesService.findMyCertificates(req.user.userId);
  }

  // ============================================================
  // USER/ADMIN: DOWNLOAD CERTIFICATE PDF
  // GET /certificates/download/:id
  // ============================================================

  @Get('download/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User: Download certificate PDF' })
  @ApiParam({ name: 'id', description: 'Certificate ID' })
  async downloadCertificate(
    @Param('id') id: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const isAdmin = req.user.role === 'ADMIN';

    const { filePath, fileName } =
      await this.certificatesService.downloadCertificate(
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
        res.status(500).json({ message: 'Failed to send certificate file' });
      }
    });
  }
}
