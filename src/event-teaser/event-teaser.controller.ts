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
import { EventTeaserService } from './event-teaser.service';
import { CreateEventTeaserDto } from './dto/create-event-teaser.dto';
import { QueryEventTeaserDto } from './dto/query-event-teaser.dto';
import { UpdateEventTeaserDto } from './dto/update-event-teaser.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Event Teaser')
@Controller(['event-teasers', 'event-teaser'])
export class EventTeaserController {
  constructor(private readonly teaserService: EventTeaserService) {}

  // =====================================================
  // 1. CREATE / SUBMIT TEASER GUESS (PUBLIC API)
  // =====================================================
  @Post()
  @ApiOperation({ summary: 'Submit Event Teaser Guess (Public)' })
  async create(@Body() dto: CreateEventTeaserDto) {
    const data = await this.teaserService.create(dto);
    return {
      success: true,
      message: 'Event teaser guess submitted successfully',
      data,
    };
  }

  // =====================================================
  // 2. GET ALL TEASER SUBMISSIONS WITH PAGINATION & FILTERS
  // =====================================================
  @Get()
  @ApiOperation({
    summary: 'Get all event teaser submissions with pagination & filter',
  })
  async findAll(@Query() query: QueryEventTeaserDto) {
    return this.teaserService.findAll(query);
  }

  // =====================================================
  // 3. GET STATS & SUMMARY (ADMIN)
  // =====================================================
  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get teaser submissions statistics (Admin)' })
  async getStats(@Query('eventId') eventId?: string) {
    const stats = await this.teaserService.getStats(eventId);
    return { success: true, stats };
  }

  // =====================================================
  // 4. EXPORT CSV (ADMIN)
  // =====================================================
  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export teaser submissions as CSV (Admin)' })
  async exportCsv(@Query() query: QueryEventTeaserDto, @Res() res: Response) {
    const csvData = await this.teaserService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="event_teasers_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  // =====================================================
  // 5. GET SUBMISSION BY ID (ADMIN)
  // =====================================================
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get teaser submission details by ID (Admin)' })
  async findOne(@Param('id') id: string) {
    const data = await this.teaserService.findOne(id);
    return { success: true, data };
  }

  // =====================================================
  // 6. UPDATE SUBMISSION BY ID (ADMIN)
  // =====================================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update teaser submission by ID (Admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateEventTeaserDto) {
    const data = await this.teaserService.update(id, dto);
    return {
      success: true,
      message: 'Teaser submission updated successfully',
      data,
    };
  }

  // =====================================================
  // 7. DELETE SUBMISSION BY ID (ADMIN)
  // =====================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete teaser submission by ID (Admin)' })
  async remove(@Param('id') id: string) {
    return this.teaserService.remove(id);
  }
}
