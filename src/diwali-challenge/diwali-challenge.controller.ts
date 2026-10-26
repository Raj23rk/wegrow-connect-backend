import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DiwaliChallengeService } from './diwali-challenge.service';
import { EnrollDiwaliChallengeDto } from './dto/enroll-challenge.dto';
import { SubmitDiwaliChallengeDto } from './dto/submit-challenge.dto';
import { QueryDiwaliChallengeDto } from './dto/query-challenge.dto';
import { RedeemDemoTicketDto } from './dto/redeem-ticket.dto';

@ApiTags('Diwali QR Challenge & Free Demo Pass')
@Controller('diwali-challenge')
export class DiwaliChallengeController {
  constructor(
    private readonly diwaliChallengeService: DiwaliChallengeService,
  ) {}

  // =====================================================
  // 1. GET 20 CHALLENGE QUESTIONS (SAFE - NO ANSWERS)
  // =====================================================
  @Get('questions')
  @ApiOperation({
    summary: 'Get 20 challenge questions for the timed quiz (answers omitted)',
  })
  getQuestions() {
    const questions = this.diwaliChallengeService.getPublicQuestions();
    return {
      success: true,
      message: 'Challenge questions loaded successfully',
      data: {
        totalQuestions: questions.length,
        marksPerQuestion: 5,
        totalMarks: 100,
        passingCutoff: 80,
        questions,
      },
    };
  }

  // =====================================================
  // 2. ENROLL STUDENT VIA QR SCAN
  // =====================================================
  @Post('enroll')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Enroll student details after scanning the campus Diwali poster QR code',
  })
  async enroll(@Body() dto: EnrollDiwaliChallengeDto) {
    const result = await this.diwaliChallengeService.enroll(dto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 3. SUBMIT 20 ANSWERS & EVALUATE SCORE
  // =====================================================
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit 20 answers, calculate score (5 marks each, 100 total), unlock 1-Week Demo if >= 80, and send email',
  })
  async submit(@Body() dto: SubmitDiwaliChallengeDto) {
    const result = await this.diwaliChallengeService.submitAnswers(dto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 4. CAMPUS DESK: VERIFY DEMO TICKET
  // =====================================================
  @Get('verify-ticket/:code')
  @ApiOperation({
    summary: 'Verify student demo ticket and score at campus reception',
  })
  async verifyTicket(@Param('code') code: string) {
    const result = await this.diwaliChallengeService.verifyTicket(code);
    return {
      success: result.success,
      message: 'Demo ticket verified',
      data: result,
    };
  }

  // =====================================================
  // 5. CAMPUS DESK: REDEEM DEMO TICKET
  // =====================================================
  @Post('redeem-ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Campus desk activates the 1-Week Free Demo for student',
  })
  async redeemTicket(@Body() dto: RedeemDemoTicketDto) {
    const result = await this.diwaliChallengeService.redeemTicket(dto);
    return {
      success: result.success,
      message: result.message,
      data: result,
    };
  }

  // =====================================================
  // 6. ADMIN: GET ALL CHALLENGE SUBMISSIONS
  // =====================================================
  @Get('admin/submissions')
  @ApiOperation({
    summary:
      'Get all enrolled students and test submissions with search, course, score >= 80 filter, and pagination',
  })
  async adminGetSubmissions(@Query() query: QueryDiwaliChallengeDto) {
    const result = await this.diwaliChallengeService.adminGetSubmissions(query);
    return {
      success: true,
      message: 'Challenge submissions retrieved successfully',
      data: result,
    };
  }

  // =====================================================
  // 7. ADMIN: GET STATS SUMMARY
  // =====================================================
  @Get('admin/stats')
  @ApiOperation({
    summary:
      'Get aggregate statistics: average score, qualification rate, and course breakdown',
  })
  async adminGetStats() {
    const stats = await this.diwaliChallengeService.adminGetStats();
    return {
      success: true,
      message: 'Admin challenge stats retrieved',
      data: stats,
    };
  }
}
