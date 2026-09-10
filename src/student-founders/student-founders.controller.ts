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
import { StudentFoundersService } from './student-founders.service';
import { CreateStudentFounderDto } from './dto/create-student-founder.dto';
import { QueryStudentFounderDto } from './dto/query-student-founder.dto';
import { UpdateStudentFounderDto } from './dto/update-student-founder.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Student Founders Community')
@Controller('student-founders')
export class StudentFoundersController {
  constructor(
    private readonly foundersService: StudentFoundersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register for Student Founders Community (Public)' })
  async register(@Body() dto: CreateStudentFounderDto) {
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
  @ApiOperation({ summary: 'Get all student founder registrations with pagination, search, & filter (Admin)' })
  async findAll(@Query() query: QueryStudentFounderDto) {
    return this.foundersService.findAll(query);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get registration statistics and breakdown (Admin)' })
  async getStats(@Query('eventId') eventId?: string) {
    const stats = await this.foundersService.getStats(eventId);
    return { success: true, stats };
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export filtered student founder registrations as CSV (Admin)' })
  async exportCsv(@Query() query: QueryStudentFounderDto, @Res() res: any) {
    const csvData = await this.foundersService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="student_founders_${Date.now()}.csv"`,
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
    @Body() dto: UpdateStudentFounderDto,
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
