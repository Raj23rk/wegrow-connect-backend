import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AiExplorerService } from './ai-explorer.service';
import { CreateAiExplorerEnrollmentDto } from './dto/create-ai-explorer-enrollment.dto';
import { QueryAiExplorerEnrollmentDto } from './dto/query-ai-explorer-enrollment.dto';
import { UpdateAiExplorerEnrollmentDto } from './dto/update-ai-explorer-enrollment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('AI Explorer Enrollment & Admin')
@Controller('ai-explorer')
export class AiExplorerController {
  constructor(private readonly aiExplorerService: AiExplorerService) {}

  // =====================================================
  // 1. PUBLIC STUDENT ENROLLMENT SUBMISSION
  // =====================================================
  @Post('enroll')
  @ApiOperation({ summary: 'Submit AI Explorer student enrollment form (Public)' })
  async enroll(@Body() dto: CreateAiExplorerEnrollmentDto) {
    const data = await this.aiExplorerService.enrollStudent(dto);
    return {
      success: true,
      message: 'Student enrolled successfully in AI Explorer!',
      data,
    };
  }

  // Alias for root POST /api/v1/ai-explorer
  @Post()
  @ApiOperation({ summary: 'Submit AI Explorer student enrollment alias (Public)' })
  async enrollAlias(@Body() dto: CreateAiExplorerEnrollmentDto) {
    return this.enroll(dto);
  }

  // =====================================================
  // 2. PUBLIC VERIFICATION BY ENROLLMENT ID OR DB ID
  // =====================================================
  @Get('verify/:id')
  @ApiOperation({ summary: 'Verify AI Explorer enrollment by ID or Enrollment ID (Public)' })
  async verify(@Param('id') id: string) {
    return this.aiExplorerService.verifyEnrollment(id);
  }

  // =====================================================
  // SERVE MASCOT ASSET IMAGE
  // =====================================================
  @Get('mascot.png')
  @ApiOperation({ summary: 'Get mascot image asset for AI Explorer' })
  async getMascot(@Res() res: Response) {
    const fs = await import('fs');
    const path = await import('path');
    const assetPath = path.join(
      process.cwd(),
      'src',
      'sing-along',
      'assets',
      'mascot.png',
    );
    if (fs.existsSync(assetPath)) {
      res.setHeader('Content-Type', 'image/png');
      return res.sendFile(assetPath);
    }
    return res.status(HttpStatus.NOT_FOUND).send('Asset not found');
  }

  // =====================================================
  // SERVE ENROLLMENT LANDING HTML PAGE
  // =====================================================
  @Get(['enroll-page', 'page'])
  @ApiOperation({ summary: 'Get AI Explorer enrollment HTML landing page' })
  async getEnrollmentPage(@Res() res: Response) {
    const fs = await import('fs');
    const path = await import('path');
    const htmlPath = path.join(process.cwd(), 'public', 'ai-explorer-enrollment.html');
    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(htmlPath);
    }
    return res.status(HttpStatus.NOT_FOUND).send('Page not found');
  }

  // =====================================================
  // SERVE PRE-BOOKING LANDING HTML PAGE
  // =====================================================
  @Get('prebooking-page')
  @ApiOperation({ summary: 'Get AI Explorer pre-booking HTML landing page' })
  async getPrebookingPage(@Res() res: Response) {
    const fs = await import('fs');
    const path = await import('path');
    const htmlPath = path.join(process.cwd(), 'public', 'ai-explorer-prebooking.html');
    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(htmlPath);
    }
    return res.status(HttpStatus.NOT_FOUND).send('Pre-booking page not found');
  }

  // =====================================================
  // 3. ADMIN STATS & OVERVIEW (ADMIN ONLY)
  // Static route placed BEFORE dynamic :id routes
  // =====================================================
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overall AI Explorer student enrollment analytics & revenue stats (Admin Only)' })
  async getStats() {
    return this.aiExplorerService.getStats();
  }

  // =====================================================
  // 4. ADMIN EXPORT TO CSV (ADMIN ONLY)
  // Static route placed BEFORE dynamic :id routes
  // =====================================================
  @Get('admin/export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export all AI Explorer student enrollments as CSV file (Admin Only)' })
  async exportCsv(@Res() res: Response) {
    const csvData = await this.aiExplorerService.exportCsv();
    const filename = `ai_explorer_enrollments_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvData);
  }

  // =====================================================
  // 5. ADMIN LIST ENROLLMENTS (WITH PAGINATION, SEARCH, FILTERS)
  // =====================================================
  @Get(['admin/enrollments', 'admin'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get paginated list of all student enrollments with search & filters (Admin Only)' })
  async findAll(@Query() query: QueryAiExplorerEnrollmentDto) {
    return this.aiExplorerService.findAll(query);
  }

  // =====================================================
  // 6. ADMIN RESEND CONFIRMATION EMAIL
  // =====================================================
  @Post(['admin/resend-email/:id', 'admin/send-email/:id'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend student welcome and confirmation email (Admin Only)' })
  async resendEmail(
    @Param('id') id: string,
    @Body('email') email?: string,
  ) {
    return this.aiExplorerService.resendConfirmationEmail(id, email);
  }

  @Post('admin/send-email')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend confirmation email by ID payload (Admin Only)' })
  async resendEmailBody(
    @Body() body: { id?: string; enrollmentId?: string; email?: string },
  ) {
    const idToUse = body?.enrollmentId || body?.id || '';
    return this.aiExplorerService.resendConfirmationEmail(idToUse, body?.email);
  }

  // =====================================================
  // 7. ADMIN GET ENROLLMENT BY ID
  // =====================================================
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get AI Explorer student enrollment details by ID (Admin Only)' })
  async findOne(@Param('id') id: string) {
    return this.aiExplorerService.findOne(id);
  }

  // =====================================================
  // 8. ADMIN UPDATE ENROLLMENT
  // =====================================================
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update AI Explorer student enrollment status, notes, or fee (Admin Only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAiExplorerEnrollmentDto,
  ) {
    return this.aiExplorerService.update(id, dto);
  }

  // =====================================================
  // 9. ADMIN DELETE ENROLLMENT
  // =====================================================
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete student enrollment (Admin Only)' })
  async remove(@Param('id') id: string) {
    return this.aiExplorerService.remove(id);
  }
}
