import { Module } from '@nestjs/common';
import { RecurringReservationsController } from './recurring-reservations.controller';
import { RecurringReservationsService } from './recurring-reservations.service';

@Module({
  controllers: [RecurringReservationsController],
  providers: [RecurringReservationsService],
  exports: [RecurringReservationsService],
})
export class RecurringReservationsModule {}
