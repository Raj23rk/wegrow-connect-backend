import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

import { UploadAnswerKeyDto, UploadQuestionsDto } from './dto/upload-questions.dto';

@ApiTags('Tasks Management')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new task (Admin)' })
  async create(@Req() req: any, @Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto, req.user?.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tasks (Admin)' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  async findAll(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool =
      isActive === undefined ? undefined : isActive === 'true';
    return this.tasksService.findAll(category, activeBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details by ID' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update task (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Put(':id/questions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or update questions list for a task (Admin)' })
  async uploadQuestions(
    @Param('id') id: string,
    @Body() dto: UploadQuestionsDto,
  ) {
    return this.tasksService.uploadQuestions(id, dto.questions);
  }

  @Put(':id/answer-key')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload or update separate answer key for a task (Admin)' })
  async uploadAnswerKey(
    @Param('id') id: string,
    @Body() dto: UploadAnswerKeyDto,
  ) {
    return this.tasksService.uploadAnswerKey(id, dto.answerKey);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle task active/inactive status (Admin)' })
  async toggleStatus(@Param('id') id: string) {
    return this.tasksService.toggleStatus(id);
  }
}
