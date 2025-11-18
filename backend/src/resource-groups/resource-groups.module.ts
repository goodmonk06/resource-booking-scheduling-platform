import { Module } from '@nestjs/common';
import { ResourceGroupsController } from './resource-groups.controller';
import { ResourceGroupsService } from './resource-groups.service';

@Module({
  controllers: [ResourceGroupsController],
  providers: [ResourceGroupsService],
  exports: [ResourceGroupsService],
})
export class ResourceGroupsModule {}
