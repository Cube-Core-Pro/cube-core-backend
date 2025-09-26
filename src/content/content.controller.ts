import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { Fortune500ContentConfig } from '../types/fortune500-types';

@ApiTags('content')
@Controller('content')
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get(':page')
  @ApiOperation({ summary: 'Get page content' })
  @ApiResponse({ status: 200 })
  async get(@Param('page') page: string) {
    return this.content.get(page);
  }

  @Post(':page')
  @ApiOperation({ summary: 'Set page content' })
  @ApiResponse({ status: 200 })
  async set(@Param('page') page: string, @Body() body: any) {
    return this.content.set(page, body);
  }
}

