import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  // =====================================================
  // CREATE CONTACT QUERY
  // =====================================================

  @Post()
  @ApiOperation({
    summary: 'Submit contact/query form',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact query submitted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request.',
  })
  async create(@Body() createContactDto: CreateContactDto) {
    const data = await this.contactService.create(createContactDto);

    return {
      success: true,
      message: 'Your query has been submitted successfully.',
      data,
    };
  }

  // =====================================================
  // GET ALL CONTACT QUERIES
  // =====================================================

  @Get('all')
  @ApiOperation({
    summary: 'Get all contact queries with pagination and search',
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
    example: 'Raj',
  })
  @ApiQuery({
    name: 'queryAbout',
    required: false,
    example: 'BUSINESS',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
    @Query('queryAbout')
    queryAbout?: string,
  ) {
    const data = await this.contactService.findAll(
      Number(page),
      Number(limit),
      search,
      queryAbout,
    );

    return {
      success: true,
      message: 'Contact queries fetched successfully.',
      data,
    };
  }

  // =====================================================
  // GET CONTACT BY ID
  // =====================================================

  @Get(':id')
  @ApiOperation({
    summary: 'Get contact query by ID',
  })
  async findOne(@Param('id') id: string) {
    const data = await this.contactService.findById(id);

    return {
      success: true,
      message: 'Contact query fetched successfully.',
      data,
    };
  }

  // =====================================================
  // MARK AS RESOLVED
  // =====================================================

  @Patch(':id/resolve')
  @ApiOperation({
    summary: 'Mark contact query as resolved',
  })
  async resolve(@Param('id') id: string) {
    const data = await this.contactService.resolve(id);

    return {
      success: true,
      message: 'Contact query marked as resolved.',
      data,
    };
  }

  // =====================================================
  // DELETE
  // =====================================================

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate contact query',
  })
  async remove(@Param('id') id: string) {
    const data = await this.contactService.remove(id);

    return {
      success: true,
      message: 'Contact query deleted successfully.',
      data,
    };
  }
}
