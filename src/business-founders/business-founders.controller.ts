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
import { BusinessFoundersService } from './business-founders.service';
import { CreateBusinessFounderDto } from './dto/create-business-founder.dto';
import { QueryBusinessFounderDto } from './dto/query-business-founder.dto';
import { UpdateBusinessFounderDto } from './dto/update-business-founder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Business Founders Community')
@Controller('business-founders')
export class BusinessFoundersController {
  constructor(
    private readonly foundersService: BusinessFoundersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register for Business Founders Community (Public)' })
  async register(@Body() dto: CreateBusinessFounderDto) {
    const data = await this.foundersService.register(dto);
    return {
      success: true,
      message: 'Registration submitted successfully',
      data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all business founder registrations with pagination, search, & filter (Admin)' })
  async findAll(@Query() query: QueryBusinessFounderDto) {
    return this.foundersService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration statistics and breakdown (Admin)' })
  async getStats() {
    const stats = await this.foundersService.getStats();
    return { success: true, stats };
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export filtered business founder registrations as CSV (Admin)' })
  async exportCsv(@Query() query: QueryBusinessFounderDto, @Res() res: any) {
    const csvData = await this.foundersService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="business_founders_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration details by ID (Admin)' })
  async findOne(@Param('id') id: string) {
    const data = await this.foundersService.findOne(id);
    return { success: true, data };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update registration record by ID (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessFounderDto,
  ) {
    const data = await this.foundersService.update(id, dto);
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
    return this.foundersService.remove(id);
  }
}
