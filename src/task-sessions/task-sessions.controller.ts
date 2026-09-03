import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TaskSessionsService } from './task-sessions.service';
import { StartTaskSessionDto } from './dto/start-task-session.dto';
import { SaveAnswerDto } from './dto/save-answer.dto';
import { LogCheatingEventDto } from './dto/log-cheating-event.dto';
import { SubmitTaskDto } from './dto/submit-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Task 60-Min Sessions & Anti-Cheating')
@Controller('task-sessions')
export class TaskSessionsController {
  constructor(private readonly taskSessionsService: TaskSessionsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start or resume a 60-minute task session' })
  async startSession(@Body() dto: StartTaskSessionDto) {
    return this.taskSessionsService.startSession(dto);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check task session and submission status for student and task' })
  async checkSessionStatus(
    @Query('studentId') studentId: string,
    @Query('taskId') taskId: string,
  ) {
    return this.taskSessionsService.checkSessionStatus(studentId, taskId);
  }

  @Get('active/:studentId')
  @ApiOperation({ summary: 'Get active session and remaining seconds for a student' })
  async getActiveSession(@Param('studentId') studentId: string) {
    return this.taskSessionsService.getActiveSession(studentId);
  }

  @Patch(':id/save')
  @ApiOperation({ summary: 'Auto-save draft answer periodically' })
  async saveAnswer(
    @Param('id') sessionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.taskSessionsService.saveAnswer(sessionId, dto);
  }

  @Put(':id/save')
  @ApiOperation({ summary: 'Auto-save draft answer periodically (PUT support)' })
  async saveAnswerPut(
    @Param('id') sessionId: string,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.taskSessionsService.saveAnswer(sessionId, dto);
  }

  @Post(':id/log-event')
  @ApiOperation({ summary: 'Record anti-cheating event (tab switch, fullscreen exit, copy/paste)' })
  async logCheatingEvent(
    @Param('id') sessionId: string,
    @Body() dto: LogCheatingEventDto,
  ) {
    return this.taskSessionsService.logCheatingEvent(sessionId, dto);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Finalize and submit task answers' })
  async submitSession(
    @Param('id') sessionId: string,
    @Body() dto: SubmitTaskDto,
  ) {
    return this.taskSessionsService.submitSession(sessionId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get task session monitoring data & anti-cheating log (Admin)' })
  async findSessionById(@Param('id') id: string) {
    return this.taskSessionsService.findSessionById(id);
  }
}
