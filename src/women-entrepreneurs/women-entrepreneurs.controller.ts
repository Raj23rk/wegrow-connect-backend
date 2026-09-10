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
import { WomenEntrepreneursService } from './women-entrepreneurs.service';
import { CreateWomenEntrepreneurDto } from './dto/create-women-entrepreneur.dto';
import { QueryWomenEntrepreneurDto } from './dto/query-women-entrepreneur.dto';
import { UpdateWomenEntrepreneurDto } from './dto/update-women-entrepreneur.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Women Entrepreneurship Community')
@Controller('women-entrepreneurs')
export class WomenEntrepreneursController {
  constructor(
    private readonly womenService: WomenEntrepreneursService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register for Women Entrepreneurship Community (Public)' })
  async register(@Body() dto: CreateWomenEntrepreneurDto) {
    const data = await this.womenService.register(dto);
    return {
      success: true,
      message: 'Seat reservation submitted successfully',
      data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all registrations with pagination, search, & filter (Admin)' })
  async findAll(@Query() query: QueryWomenEntrepreneurDto) {
    return this.womenService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration statistics and summary breakdown (Admin)' })
  async getStats(@Query('eventId') eventId?: string) {
    const stats = await this.womenService.getStats(eventId);
    return { success: true, stats };
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export filtered registrations as CSV (Admin)' })
  async exportCsv(@Query() query: QueryWomenEntrepreneurDto, @Res() res: any) {
    const csvData = await this.womenService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="women_entrepreneurs_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration details by ID (Admin)' })
  async findOne(@Param('id') id: string) {
    const data = await this.womenService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update registration record by ID (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWomenEntrepreneurDto,
  ) {
    const data = await this.womenService.update(id, dto);
    return {
      success: true,
      message: 'Registration updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete registration record by ID (Admin)' })
  async remove(@Param('id') id: string) {
    return this.womenService.remove(id);
  }
}
