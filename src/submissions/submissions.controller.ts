import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { EvaluateSubmissionDto } from './dto/evaluate-submission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Task Submissions & Evaluation')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all task submissions for evaluation (Admin/Evaluator)' })
  @ApiQuery({ name: 'status', required: false, description: 'PENDING or EVALUATED' })
  @ApiQuery({ name: 'studentId', required: false })
  @ApiQuery({ name: 'taskId', required: false })
  async findAll(
    @Query('status') status?: string,
    @Query('studentId') studentId?: string,
    @Query('taskId') taskId?: string,
  ) {
    return this.submissionsService.findAll(status, studentId, taskId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get submission details by ID' })
  async findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(id);
  }

  @Post(':id/evaluate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign score and feedback to submission (Evaluator/Admin)' })
  async evaluate(
    @Param('id') id: string,
    @Body() evaluateDto: EvaluateSubmissionDto,
    @Req() req: any,
  ) {
    return this.submissionsService.evaluate(id, evaluateDto, req.user?.id);
  }
}
