import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { PrismaModule } from './prisma/prisma.module';
import { LibModule } from './lib/lib.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ResourceGroupsModule } from './resource-groups/resource-groups.module';
import { ResourcesModule } from './resources/resources.module';
import { OpeningHoursModule } from './opening-hours/opening-hours.module';
import { ReservationsModule } from './reservations/reservations.module';
import { BookingPoliciesModule } from './booking-policies/booking-policies.module';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RecurringReservationsModule } from './recurring-reservations/recurring-reservations.module';
import { EventBus } from './lib/events/domain-events';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      ttl: 300, // 5 minutes default TTL
    }),
    PrismaModule,
    LibModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ResourceGroupsModule,
    ResourcesModule,
    OpeningHoursModule,
    ReservationsModule,
    BookingPoliciesModule,
    AvailabilityModule,
    PaymentsModule,
    ReviewsModule,
    NotificationsModule,
    RecurringReservationsModule,
  ],
  providers: [
    {
      provide: EventBus,
      useValue: new EventBus(),
    },
  ],
  exports: [EventBus],
})
export class AppModule {}
