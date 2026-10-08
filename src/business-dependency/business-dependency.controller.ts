import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { BusinessDependencyService } from './business-dependency.service';
import { CreateBusinessDependencyTestDto } from './dto/create-business-dependency-test.dto';
import { CreateBusinessDependencyDiagnosticDto } from './dto/create-business-dependency-diagnostic.dto';
import { CreateBusinessDependencyDto } from './dto/create-business-dependency.dto';
import { QueryBusinessDependencyDto } from './dto/query-business-dependency.dto';
import { UpdateBusinessDependencyDto } from './dto/update-business-dependency.dto';
import { CreateBusinessMeetupFeedbackDto } from './dto/create-business-meetup-feedback.dto';
import { QueryBusinessMeetupFeedbackDto } from './dto/query-business-meetup-feedback.dto';
import { UpdateBusinessMeetupFeedbackDto } from './dto/update-business-meetup-feedback.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Business Dependency')
@Controller(['business-dependency', 'business-dependency-test'])
export class BusinessDependencyController {
  constructor(
    private readonly dependencyService: BusinessDependencyService,
  ) {}

  // =====================================================
  // 1. SUBMIT TEST API (PUBLIC)
  // =====================================================
  @Post('test')
  @ApiOperation({
    summary: 'Submit Business Dependency Test (Public)',
    description: 'Accepts Your name, Business name, Phone number, score',
  })
  async createTest(@Body() dto: CreateBusinessDependencyTestDto) {
    const data = await this.dependencyService.createTest(dto);
    return {
      success: true,
      message: 'Business Dependency test submitted successfully',
      data,
    };
  }

  // =====================================================
  // 2. BOOK DIAGNOSTIC API (PUBLIC)
  // =====================================================
  @Post('diagnostic')
  @ApiOperation({
    summary: 'Book Free Business Diagnostic (Public)',
    description:
      'Accepts Full name, Company, Designation, Industry, Phone, Email, Business size, Biggest challenge, Notes, Score',
  })
  async createDiagnostic(@Body() dto: CreateBusinessDependencyDiagnosticDto) {
    const data = await this.dependencyService.createDiagnostic(dto);
    return {
      success: true,
      message: 'Free Diagnostic booked successfully',
      data,
    };
  }

  // =====================================================
  // 3. UNIVERSAL CREATE / CRUD CREATE (PUBLIC)
  // =====================================================
  @Post()
  @ApiOperation({
    summary: 'Create Business Dependency Entry (General CRUD API)',
  })
  async create(@Body() dto: CreateBusinessDependencyDto) {
    const data = await this.dependencyService.create(dto);
    return {
      success: true,
      message: 'Business dependency entry created successfully',
      data,
    };
  }

  // =====================================================
  // 4. ADMIN: GET ALL WITH PAGINATION, FILTERS & COUNTS
  // =====================================================
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get all submissions with pagination, filter for test/diagnostic, and summary counts (Admin)',
  })
  async findAll(@Query() query: QueryBusinessDependencyDto) {
    const result = await this.dependencyService.findAll(query);
    return {
      success: true,
      message: 'Submissions fetched successfully',
      data: result.items,
      pagination: result.pagination,
      counts: result.counts,
    };
  }

  // =====================================================
  // 5. ADMIN: GET STATS & BREAKDOWN
  // =====================================================
  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get aggregate statistics, test vs diagnostic counts, and breakdown (Admin)',
  })
  async getStats() {
    const stats = await this.dependencyService.getStats();
    return {
      success: true,
      message: 'Stats retrieved successfully',
      data: stats,
    };
  }

  // =====================================================
  // 6. ADMIN: EXPORT CSV
  // =====================================================
  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export submissions as CSV (Admin)' })
  async exportCsv(
    @Query() query: QueryBusinessDependencyDto,
    @Res() res: Response,
  ) {
    const csvData = await this.dependencyService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="business_dependency_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  // =====================================================
  // 7. ADMIN: GET ONE BY ID
  // =====================================================
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submission details by ID (Admin)' })
  async findOne(@Param('id') id: string) {
    const data = await this.dependencyService.findOne(id);
    return {
      success: true,
      message: 'Submission fetched successfully',
      data,
    };
  }

  // =====================================================
  // 8. ADMIN: UPDATE BY ID
  // =====================================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update submission by ID (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessDependencyDto,
  ) {
    const data = await this.dependencyService.update(id, dto);
    return {
      success: true,
      message: 'Submission updated successfully',
      data,
    };
  }

  // =====================================================
  // 9. ADMIN: DELETE BY ID
  // =====================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete submission by ID (Admin)' })
  async remove(@Param('id') id: string) {
    return this.dependencyService.remove(id);
  }

  // =========================================================================
  // 10. BUSINESS TRANSFORMATION MEETUP: SUBMIT FEEDBACK (PUBLIC)
  // =========================================================================
  @Post(['feedback', 'meetup-feedback'])
  @ApiOperation({
    summary: 'Submit Business Transformation Meetup Feedback (Public)',
    description:
      'Accepts participant name, experience rating, liked most, suggestions, willing to grow, referral details, and key takeaways',
  })
  async submitFeedback(@Body() dto: CreateBusinessMeetupFeedbackDto) {
    const data = await this.dependencyService.createFeedback(dto);
    return {
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      data,
    };
  }

  // =========================================================================
  // 11. ADMIN API 1: GET ALL FEEDBACK WITH FILTERS, SEARCH & SUMMARY (ADMIN)
  // =========================================================================
  @Get(['feedback', 'meetup-feedback'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all Meetup Feedback with pagination, search, filters & counts (Admin API 1)',
  })
  async findAllFeedback(@Query() query: QueryBusinessMeetupFeedbackDto) {
    const result = await this.dependencyService.findAllFeedback(query);
    return {
      success: true,
      message: 'Meetup feedback fetched successfully',
      data: result.items,
      pagination: result.pagination,
      counts: result.counts,
    };
  }

  // =========================================================================
  // 12. ADMIN API 2: GET FEEDBACK STATS & BREAKDOWN (ADMIN)
  // =========================================================================
  @Get(['feedback/stats', 'meetup-feedback/stats'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get Meetup Feedback statistics, rating breakdown & referrals (Admin API 2)',
  })
  async getFeedbackStats() {
    const stats = await this.dependencyService.getFeedbackStats();
    return {
      success: true,
      message: 'Meetup feedback statistics retrieved successfully',
      data: stats,
    };
  }

  // =========================================================================
  // 13. ADMIN: EXPORT FEEDBACK CSV (ADMIN)
  // =========================================================================
  @Get(['feedback/export', 'meetup-feedback/export'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export Meetup Feedback records as CSV (Admin)' })
  async exportFeedbackCsv(
    @Query() query: QueryBusinessMeetupFeedbackDto,
    @Res() res: Response,
  ) {
    const csvData = await this.dependencyService.exportFeedbackCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meetup_feedback_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  // =========================================================================
  // 14. ADMIN: GET SINGLE FEEDBACK BY ID (ADMIN)
  // =========================================================================
  @Get(['feedback/:id', 'meetup-feedback/:id'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Meetup Feedback details by ID (Admin)' })
  async findFeedbackOne(@Param('id') id: string) {
    const data = await this.dependencyService.findFeedbackById(id);
    return {
      success: true,
      message: 'Feedback fetched successfully',
      data,
    };
  }

  // =========================================================================
  // 15. ADMIN: UPDATE FEEDBACK STATUS / NOTES (ADMIN)
  // =========================================================================
  @Patch(['feedback/:id', 'meetup-feedback/:id'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update Meetup Feedback status or notes (Admin)' })
  async updateFeedback(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessMeetupFeedbackDto,
  ) {
    const data = await this.dependencyService.updateFeedback(id, dto);
    return {
      success: true,
      message: 'Feedback updated successfully',
      data,
    };
  }

  // =========================================================================
  // 16. ADMIN: DELETE FEEDBACK BY ID (ADMIN)
  // =========================================================================
  @Delete(['feedback/:id', 'meetup-feedback/:id'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete Meetup Feedback record by ID (Admin)' })
  async removeFeedback(@Param('id') id: string) {
    return this.dependencyService.deleteFeedback(id);
  }
}
