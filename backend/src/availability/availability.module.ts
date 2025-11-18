import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { OpeningHoursModule } from '../opening-hours/opening-hours.module';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [OpeningHoursModule, ReservationsModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
