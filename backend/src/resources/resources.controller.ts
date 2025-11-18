import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new resource' })
  create(
    @Body()
    createDto: {
      groupId: string;
      name: string;
      description?: string;
      capacity?: number;
      metaJson?: any;
    },
  ) {
    return this.resourcesService.create({
      name: createDto.name,
      description: createDto.description,
      capacity: createDto.capacity,
      metaJson: createDto.metaJson,
      group: {
        connect: { id: createDto.groupId },
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all resources' })
  findAll(
    @Query('groupId') groupId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.resourcesService.findAll(
      groupId,
      isActive ? isActive === 'true' : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  findOne(@Param('id') id: string) {
    return this.resourcesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update resource' })
  update(
    @Param('id') id: string,
    @Body()
    updateDto: {
      name?: string;
      description?: string;
      capacity?: number;
      metaJson?: any;
      isActive?: boolean;
    },
  ) {
    return this.resourcesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete resource' })
  remove(@Param('id') id: string) {
    return this.resourcesService.remove(id);
  }
}
