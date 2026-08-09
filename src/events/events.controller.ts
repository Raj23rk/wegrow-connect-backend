import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiQuery,
} from '@nestjs/swagger';

import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';


@ApiTags('Events')
@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) { }

    // ================= CREATE EVENT =================

    @Post('create-event')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new event (Admin Only)' })
    @ApiResponse({
        status: 201,
        description: 'Event created successfully.',
    })
    async create(@Body() dto: CreateEventDto) {
        const data = await this.eventsService.create(dto);

        return {
            message: 'Event created successfully',
            data,
        };
    }

    // ================= GET ALL EVENTS =================

    // @Get('all-event')
    // @ApiOperation({
    //     summary: 'Get all events with pagination and search',
    // })
    // @ApiResponse({
    //     status: 200,
    //     description: 'Events fetched successfully.',
    // })
    // @ApiQuery({ name: 'page', required: false, example: 1 })
    // @ApiQuery({ name: 'limit', required: false, example: 10 })
    // @ApiQuery({ name: 'search', required: false, example: 'AI' })
    // @ApiQuery({
    //     name: 'type',
    //     required: false,
    //     example: 'STUDENT',
    // })
    // async findAll(
    //     @Query('page') page = 1,
    //     @Query('limit') limit = 10,
    //     @Query('search') search?: string,
    //     @Query('type') type?: string,
    // ) {
    //     const data = await this.eventsService.findAll(
    //         Number(page),
    //         Number(limit),
    //         search,
    //         type,
    //     );

    //     return {
    //         message: 'Event fetched successfully',
    //         data,
    //     };
    // }
      @Get('all-event')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      'Get events based on logged-in user role',
  })
  @ApiResponse({
    status: 200,
    description: 'Events fetched successfully.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Python',
  })
  async findAll(
    @Req() req: Request,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    const user = (req as any).user;

    let type: 'STUDENT' | 'BUSINESS' | undefined;

    // Logged-in STUDENT
    if (user?.role === 'STUDENT') {
      type = 'STUDENT';
    }

    // Logged-in BUSINESS
    else if (user?.role === 'BUSINESS') {
      type = 'BUSINESS';
    }

    // Not logged in
    // type = undefined
    // Service returns both types

    const data =
      await this.eventsService.findAll(
        Number(page),
        Number(limit),
        search,
        type,
      );

    return {
      message: 'Events fetched successfully',
      data,
    };
  }

    // ================= GET EVENT BY ID =================

    @Get(':id')
  @ApiOperation({
    summary: 'Get event by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Event fetched successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Event not found.',
  })
  async findOne(
    @Param('id') id: string,
  ) {
    const data =
      await this.eventsService.findById(id);

    return {
      message: 'Event fetched successfully',
      data,
    };
  }


    // ================= UPDATE EVENT =================

    @Put(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update event (Admin Only)' })
    @ApiResponse({
        status: 200,
        description: 'Event updated successfully.',
    })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateEventDto,
    ) {
        const data = await this.eventsService.update(id, dto);

        return {
            message: 'Event updated successfully',
            data,
        };
    }

    // ================= DELETE EVENT =================

    @Delete(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete event (Admin Only)' })
    @ApiResponse({
        status: 200,
        description: 'Event deleted successfully.',
    })
    async remove(@Param('id') id: string) {
        await this.eventsService.remove(id);

        return {
            message: 'Event deleted successfully',
        };
    }
}