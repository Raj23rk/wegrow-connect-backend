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
import { ArtCompetitionService } from './art-competition.service';
import { CreateArtParticipantDto } from './dto/create-art-participant.dto';
import { QueryArtParticipantDto } from './dto/query-art-participant.dto';
import { UpdateArtParticipantDto } from './dto/update-art-participant.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';

@ApiTags('Art Competition')
@Controller('art-competition')
export class ArtCompetitionController {
  constructor(
    private readonly artCompetitionService: ArtCompetitionService,
  ) {}

  // =====================================================
  // REGISTER PARTICIPANT (PUBLIC)
  // =====================================================
  @Post('register')
  @ApiOperation({ summary: 'Register for Art Competition (Public)' })
  async register(@Body() dto: CreateArtParticipantDto) {
    const data = await this.artCompetitionService.register(dto);
    return {
      success: true,
      message: 'Participant registration submitted successfully',
      data,
    };
  }

  // Alias for root POST /api/v1/art-competition
  @Post()
  @ApiOperation({ summary: 'Register for Art Competition (Public alias)' })
  async registerRoot(@Body() dto: CreateArtParticipantDto) {
    return this.register(dto);
  }

  // =====================================================
  // GET ALL PARTICIPANTS (ADMIN)
  // =====================================================
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Get all competition participants with pagination, total count, search & filters (Admin)',
  })
  async findAll(@Query() query: QueryArtParticipantDto) {
    return this.artCompetitionService.findAll(query);
  }

  // =====================================================
  // GET PARTICIPANT STATS (ADMIN)
  // =====================================================
  @Get('stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get participant statistics & breakdowns (Admin)' })
  async getStats() {
    const stats = await this.artCompetitionService.getStats();
    return { success: true, stats };
  }

  // =====================================================
  // EXPORT CSV (ADMIN)
  // =====================================================
  @Get('export')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export filtered participants as CSV (Admin)' })
  async exportCsv(@Query() query: QueryArtParticipantDto, @Res() res: any) {
    const csvData = await this.artCompetitionService.exportCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="art_participants_${Date.now()}.csv"`,
    );
    return res.status(200).send(csvData);
  }

  // =====================================================
  // GET PARTICIPANT BY ID OR REG NUMBER (ADMIN)
  // =====================================================
  @Get(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get participant details by ID or Registration Number (Admin)' })
  async findOne(@Param('id') id: string) {
    const data = await this.artCompetitionService.findOne(id);
    return { success: true, data };
  }

  // =====================================================
  // UPDATE PARTICIPANT (ADMIN)
  // =====================================================
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update participant record by ID (Admin)' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateArtParticipantDto,
  ) {
    const data = await this.artCompetitionService.update(id, dto);
    return {
      success: true,
      message: 'Participant record updated successfully',
      data,
    };
  }

  // =====================================================
  // DELETE PARTICIPANT (ADMIN)
  // =====================================================
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete/deactivate participant record by ID (Admin)' })
  async remove(@Param('id') id: string) {
    return this.artCompetitionService.remove(id);
  }
}
