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

import { QuerySubmissionDto } from './dto/query-submission.dto';
import { SendOfferEmailDto } from './dto/send-offer.dto';

@ApiTags('Task Submissions & Evaluation')
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all task submissions for evaluation with pagination & search (Admin/Evaluator)' })
  async findAll(@Query() query: QuerySubmissionDto) {
    return this.submissionsService.findAll(query);
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
  @ApiOperation({ summary: 'Assign score, remarks, and selection status to submission (Evaluator/Admin)' })
  async evaluate(
    @Param('id') id: string,
    @Body() evaluateDto: EvaluateSubmissionDto,
    @Req() req: any,
  ) {
    return this.submissionsService.evaluate(id, evaluateDto, req.user?.id);
  }

  @Post(':id/send-offer')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send winner gift offer and campus invitation email to student (Admin)' })
  async sendOffer(
    @Param('id') id: string,
    @Body() dto: SendOfferEmailDto,
  ) {
    return this.submissionsService.sendOfferEmail(id, dto?.customMessage);
  }
}
