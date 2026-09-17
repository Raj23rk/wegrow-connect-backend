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
}
