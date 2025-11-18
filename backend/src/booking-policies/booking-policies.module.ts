import { Module } from '@nestjs/common';
import { BookingPoliciesController } from './booking-policies.controller';
import { BookingPoliciesService } from './booking-policies.service';

@Module({
  controllers: [BookingPoliciesController],
  providers: [BookingPoliciesService],
  exports: [BookingPoliciesService],
})
export class BookingPoliciesModule {}
