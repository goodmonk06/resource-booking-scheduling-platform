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
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new resource' })
  create(@Body() createDto: CreateResourceDto) {
    return this.resourcesService.create({
      name: createDto.name,
      description: createDto.description,
      capacity: createDto.capacity,
      metaJson: createDto.metaJson,
      isActive: createDto.isActive ?? true,
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
  update(@Param('id') id: string, @Body() updateDto: UpdateResourceDto) {
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
