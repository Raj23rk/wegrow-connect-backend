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

  // =========================================================================
  // 1. PUBLIC: SUBMIT BUSINESS TRANSFORMATION MEETUP FEEDBACK
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
  // 2. PUBLIC: SUBMIT BUSINESS DEPENDENCY TEST
  // =========================================================================
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

  // =========================================================================
  // 3. PUBLIC: BOOK FREE BUSINESS DIAGNOSTIC
  // =========================================================================
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

  // =========================================================================
  // 4. PUBLIC: UNIVERSAL CREATE (GENERAL CRUD)
  // =========================================================================
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

  // =========================================================================
  // 5. ADMIN API: GET FEEDBACK STATS & BREAKDOWN
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
  // 6. ADMIN API: EXPORT FEEDBACK CSV
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
  // 7. ADMIN API: GET ALL MEETUP FEEDBACK (WITH PAGINATION, SEARCH, FILTER)
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
  // 8. ADMIN API: GET SINGLE FEEDBACK BY ID
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
  // 9. ADMIN API: UPDATE FEEDBACK STATUS / NOTES
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
  // 10. ADMIN API: DELETE FEEDBACK BY ID
  // =========================================================================
  @Delete(['feedback/:id', 'meetup-feedback/:id'])
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete Meetup Feedback record by ID (Admin)' })
  async removeFeedback(@Param('id') id: string) {
    return this.dependencyService.deleteFeedback(id);
  }

  // =========================================================================
  // 11. ADMIN API: GET TEST & DIAGNOSTIC STATS & BREAKDOWN
  // =========================================================================
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

  // =========================================================================
  // 12. ADMIN API: EXPORT TEST & DIAGNOSTIC SUBMISSIONS CSV
  // =========================================================================
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

  // =========================================================================
  // 13. ADMIN API: GET ALL TEST & DIAGNOSTIC SUBMISSIONS
  // =========================================================================
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

  // =========================================================================
  // 14. ADMIN API: GET TEST/DIAGNOSTIC SUBMISSION BY ID (WILDCARD :id MUST BE AT END)
  // =========================================================================
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

  // =========================================================================
  // 15. ADMIN API: UPDATE TEST/DIAGNOSTIC SUBMISSION BY ID
  // =========================================================================
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

  // =========================================================================
  // 16. ADMIN API: DELETE TEST/DIAGNOSTIC SUBMISSION BY ID
  // =========================================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete submission by ID (Admin)' })
  async remove(@Param('id') id: string) {
    return this.dependencyService.remove(id);
  }
}
