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
import { ResourceGroupsService } from './resource-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('resource-groups')
@Controller('resource-groups')
export class ResourceGroupsController {
  constructor(private readonly resourceGroupsService: ResourceGroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new resource group' })
  create(
    @Body()
    createDto: {
      tenantId: string;
      name: string;
      type: string;
      configJson?: any;
    },
  ) {
    return this.resourceGroupsService.create({
      name: createDto.name,
      type: createDto.type as any,
      configJson: createDto.configJson,
      tenant: {
        connect: { id: createDto.tenantId },
      },
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all resource groups' })
  findAll(@Query('tenantId') tenantId?: string) {
    return this.resourceGroupsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource group by ID' })
  findOne(@Param('id') id: string) {
    return this.resourceGroupsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update resource group' })
  update(
    @Param('id') id: string,
    @Body() updateDto: { name?: string; type?: string; configJson?: any },
  ) {
    return this.resourceGroupsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete resource group' })
  remove(@Param('id') id: string) {
    return this.resourceGroupsService.remove(id);
  }
}
