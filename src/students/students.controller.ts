import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { StudentsService } from './students.service';
import { RegisterStudentTaskDto } from './dto/register-student-task.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

import { SendBulkTaskLinksDto, SendTaskLinkDto } from './dto/send-task-link.dto';

@ApiTags('Students Task Platform')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register student for task platform' })
  async register(@Body() registerDto: RegisterStudentTaskDto) {
    return this.studentsService.register(registerDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List and filter registered students (Admin)' })
  async findAll(@Query() query: QueryStudentDto) {
    return this.studentsService.findAll(query);
  }

  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export registered student data as CSV (Admin)' })
  async exportCsv(@Query() query: QueryStudentDto, @Res() res: any) {
    const csvData = await this.studentsService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="students_export_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  @Post('send-task-links')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk assign and email task test links to students (Admin)' })
  async sendBulkTaskLinks(@Body() dto: SendBulkTaskLinksDto) {
    return this.studentsService.sendBulkTaskLinks(dto?.studentIds);
  }

  @Post(':id/send-task-link')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign and email task test link to student (Admin)' })
  async sendTaskLink(
    @Param('id') id: string,
    @Body() dto: SendTaskLinkDto,
  ) {
    return this.studentsService.sendTaskLink(id, dto?.taskId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student details by ID (Admin)' })
  async findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }
}
