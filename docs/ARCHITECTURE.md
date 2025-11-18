# Architecture Overview

## System Architecture

The Resource Booking & Scheduling Platform follows a **Domain-Driven Design (DDD)** approach with clean architecture principles, organized into distinct layers and modules.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│                   (Next.js / React)                         │
│  - UI Components  - State Management  - API Client         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API / GraphQL
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                        │
│                   (NestJS Controllers)                      │
│  - Request Validation  - Auth Guards  - Exception Filters  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│              (Service / Use Case Layer)                     │
│  - Business Logic  - Orchestration  - Event Publishing     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Domain Layer                             │
│                (Domain Models & Events)                     │
│  - Entities  - Value Objects  - Domain Events              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Infrastructure Layer                         │
│         (Database, Cache, External Services)                │
│  - Prisma ORM  - Redis Cache  - Notification Adapters     │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Tenants Module
**Purpose**: Multi-tenant isolation and management

**Responsibilities**:
- Tenant registration and configuration
- Tenant-level settings and customization
- Data isolation boundaries

**Key Files**:
- `src/tenants/tenants.service.ts`
- `src/tenants/tenants.controller.ts`

### 2. Resources Module
**Purpose**: Resource catalog and management

**Responsibilities**:
- Resource CRUD operations
- Resource grouping and categorization
- Capacity and metadata management
- Opening hours association

**Key Files**:
- `src/resources/resources.service.ts`
- `src/resources/resources.controller.ts`
- `src/resource-groups/resource-groups.service.ts`

### 3. Reservations Module
**Purpose**: Core booking and scheduling engine

**Responsibilities**:
- Reservation lifecycle management (create, confirm, cancel, complete)
- Conflict detection and validation
- Recurring reservation support
- Booking policy enforcement

**Key Files**:
- `src/reservations/reservations.service.ts`
- `src/reservations/reservations.controller.ts`
- `src/recurring-reservations/recurring-reservations.service.ts`

### 4. Availability Module
**Purpose**: Real-time availability calculation

**Responsibilities**:
- Time slot generation based on opening hours
- Conflict checking across existing reservations
- Capacity-aware availability
- Exception handling (holidays, maintenance)

**Key Files**:
- `src/availability/availability.service.ts`
- `src/availability/availability.controller.ts`

### 5. Reviews Module
**Purpose**: Post-booking feedback and ratings

**Responsibilities**:
- Review creation and moderation
- Rating aggregation
- Review filtering and display
- Event publishing for new reviews

**Key Files**:
- `src/reviews/reviews.service.ts`
- `src/reviews/reviews.controller.ts`

### 6. Notifications Module
**Purpose**: Multi-channel notification delivery

**Responsibilities**:
- Event-driven notification triggers
- Multi-channel delivery (email, SMS, in-app)
- Retry logic and failure handling
- Notification history tracking

**Key Files**:
- `src/notifications/notifications.service.ts`
- `src/notifications/notification.processor.ts`
- `src/lib/adapters/notification.adapter.ts`

### 7. Analytics Module
**Purpose**: Business intelligence and reporting

**Responsibilities**:
- Resource utilization metrics
- Revenue analytics
- Popular times analysis
- Booking trends and forecasting

**Key Files**:
- `src/analytics/analytics.service.ts`
- `src/analytics/analytics.controller.ts`

### 8. Payments Module
**Purpose**: Payment processing and billing

**Responsibilities**:
- Payment intent creation
- Payment confirmation tracking
- Refund handling
- Payment adapter abstraction (Stripe, PayPal)

**Key Files**:
- `src/payments/payments.service.ts`
- `src/lib/adapters/payment.adapter.ts`

## Infrastructure Layer

### Database (PostgreSQL + Prisma)
- **ORM**: Prisma for type-safe database access
- **Migrations**: Version-controlled schema migrations
- **Connection Pooling**: Managed by Prisma Client
- **Transaction Support**: ACID compliance for critical operations

### Caching (Redis)
- **Use Cases**:
  - Session storage
  - API response caching
  - Rate limiting
  - Temporary data storage
- **TTL**: Configurable per cache key (default 5 minutes)
- **Invalidation**: Event-driven cache invalidation

### Event Bus (In-Memory)
- **Pattern**: Observer pattern for domain events
- **Event Types**:
  - `reservation.created`
  - `reservation.confirmed`
  - `reservation.cancelled`
  - `review.created`
  - `payment.processed`
- **Handlers**: Decoupled event processors (e.g., NotificationProcessor)

### Adapters (Plugin Architecture)

#### Notification Adapter
```typescript
interface INotificationAdapter {
  supports(channel: NotificationChannel): boolean;
  send(params: SendNotificationParams): Promise<SendNotificationResult>;
}
```

**Implementations**:
- `EmailNotificationAdapter`
- `SMSNotificationAdapter`
- `ConsoleNotificationAdapter`

#### Payment Adapter
```typescript
interface IPaymentAdapter {
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;
  confirmPayment(intentId: string): Promise<PaymentResult>;
  refund(paymentId: string, amount?: number): Promise<RefundResult>;
}
```

**Implementations**:
- `MockPaymentAdapter` (for testing/development)
- `StripePaymentAdapter` (production-ready, stub)

#### Calendar Adapter
```typescript
interface ICalendarAdapter {
  sync(reservations: Reservation[]): Promise<SyncResult>;
  createEvent(reservation: Reservation): Promise<CalendarEvent>;
  updateEvent(eventId: string, updates: Partial<Reservation>): Promise<CalendarEvent>;
}
```

**Implementations**:
- `StubCalendarAdapter` (placeholder for Google/Outlook integration)

## Cross-Cutting Concerns

### Logging (LoggerService)
- **Format**: Structured JSON logs
- **Context**: Per-service contextual logging
- **Levels**: DEBUG, INFO, WARN, ERROR
- **Correlation**: Request correlation IDs

**Usage**:
```typescript
constructor(private logger: LoggerService) {
  this.logger.setContext('MyService');
}

this.logger.info('Operation completed', { userId, resourceId });
```

### Metrics (MetricsService)
- **Types**:
  - **Counters**: Monotonically increasing values (e.g., `reservations.created`)
  - **Gauges**: Current value snapshots (e.g., `active_reservations`)
  - **Histograms**: Value distributions (e.g., `booking_duration_ms`)

**Usage**:
```typescript
this.metrics.incrementCounter('reservations.created', { status: 'confirmed' });
this.metrics.setGauge('cache.hit_rate', hitRate);
this.metrics.recordHistogram('api.response_time', duration);
```

### Validation
- **DTO Validation**: class-validator decorators on DTOs
- **Global Pipe**: ValidationPipe enabled globally in `main.ts`
- **Error Handling**: Automatic 400 Bad Request responses

**Example**:
```typescript
export class CreateResourceDto {
  @IsUUID()
  groupId: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
```

### Authentication & Authorization
- **Strategy**: JWT-based authentication
- **Guards**: `@UseGuards(JwtAuthGuard)` for protected routes
- **User Context**: Injected via `@CurrentUser()` decorator

### Exception Handling
- **Global Filter**: `AllExceptionsFilter` catches all exceptions
- **Standardized Responses**:
```json
{
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/resources/invalid-id",
  "method": "GET",
  "message": "Resource not found"
}
```

## Data Flow Examples

### Creating a Reservation

```
1. Client → POST /reservations
   ↓
2. ReservationsController validates DTO
   ↓
3. ReservationsService checks availability
   ↓
4. AvailabilityService queries conflicts
   ↓
5. BookingPoliciesService validates policies
   ↓
6. PrismaService creates reservation
   ↓
7. EventBus publishes 'reservation.created'
   ↓
8. NotificationProcessor listens to event
   ↓
9. NotificationsService sends confirmation
   ↓
10. Response → Client with reservation details
```

### Processing Analytics Request

```
1. Client → GET /analytics/revenue?startDate=...&endDate=...
   ↓
2. AnalyticsController validates query params
   ↓
3. AnalyticsService queries reservations with filters
   ↓
4. Data aggregation and calculations
   ↓
5. MetricsService records analytics query
   ↓
6. Response → Client with revenue breakdown
```

## Scalability Considerations

### Horizontal Scaling
- **Stateless Services**: All services are stateless, enabling horizontal scaling
- **Shared Cache**: Redis for distributed caching
- **Load Balancing**: Supports multiple backend instances

### Performance Optimizations
- **Database Indexing**: Strategic indexes on frequently queried fields
- **Connection Pooling**: Prisma connection pool configuration
- **Caching Strategy**: Cache frequently accessed data (availability slots, resource details)
- **Pagination**: All list endpoints support pagination

### Multi-Tenancy
- **Data Isolation**: Tenant ID filtering at database query level
- **Schema**: Shared schema with tenant discrimination
- **Scaling**: Per-tenant resource limits and quotas (future)

## Security

### Data Protection
- **Input Validation**: All inputs validated via DTOs
- **SQL Injection**: Prevented by Prisma parameterized queries
- **XSS Protection**: Output encoding in frontend
- **CORS**: Configurable CORS policy

### Authentication Flow
```
1. User login → POST /auth/login
2. Validate credentials
3. Generate JWT token
4. Return token to client
5. Client includes token in Authorization header
6. JwtAuthGuard validates token on protected routes
7. User context available in request
```

## Testing Strategy

### Unit Tests
- **Coverage**: Services, utility functions, domain logic
- **Mocking**: Prisma, external adapters
- **Framework**: Jest

### Integration Tests
- **Coverage**: API endpoints, database interactions
- **Setup**: In-memory database or test database
- **Framework**: Jest + Supertest

### E2E Tests
- **Coverage**: Critical user flows
- **Setup**: Full application stack
- **Framework**: Jest

## Deployment Architecture

### Docker Containers
- **Backend**: Node.js container with production optimizations
- **Frontend**: Next.js container with static asset serving
- **PostgreSQL**: Official PostgreSQL image
- **Redis**: Official Redis image

### Container Orchestration
```yaml
services:
  postgres:
    - Health checks
    - Persistent volume
    - Network isolation

  redis:
    - Health checks
    - Memory limits
    - Network isolation

  backend:
    - Depends on postgres + redis
    - Auto-migration on startup
    - Environment-based config

  frontend:
    - Depends on backend
    - Static asset optimization
    - Environment-based config
```

## Extension Points

### Adding a New Vertical Slice

1. **Create Module Structure**
   ```bash
   mkdir -p src/my-feature
   touch src/my-feature/my-feature.module.ts
   touch src/my-feature/my-feature.service.ts
   touch src/my-feature/my-feature.controller.ts
   ```

2. **Define DTOs with Validation**
   ```typescript
   export class CreateMyFeatureDto {
     @IsString()
     name: string;
   }
   ```

3. **Implement Service with DI**
   ```typescript
   @Injectable()
   export class MyFeatureService {
     constructor(
       private prisma: PrismaService,
       private logger: LoggerService,
       private metrics: MetricsService,
       private eventBus: EventBus,
     ) {}
   }
   ```

4. **Create Controller with Swagger**
   ```typescript
   @ApiTags('My Feature')
   @Controller('my-feature')
   export class MyFeatureController {}
   ```

5. **Register in AppModule**
   ```typescript
   @Module({
     imports: [MyFeatureModule, ...],
   })
   export class AppModule {}
   ```

### Adding a New Adapter

1. **Define Interface**
   ```typescript
   export interface IMyAdapter {
     operation(params: OperationParams): Promise<Result>;
   }
   ```

2. **Create Implementation**
   ```typescript
   export class MyAdapterImpl implements IMyAdapter {
     async operation(params: OperationParams): Promise<Result> {
       // Implementation
     }
   }
   ```

3. **Register in Service**
   ```typescript
   constructor() {
     this.registerAdapter(new MyAdapterImpl());
   }
   ```

## Best Practices

### Service Design
- **Single Responsibility**: Each service handles one domain concept
- **Dependency Injection**: Always use constructor injection
- **Error Handling**: Use specific exception types
- **Logging**: Log all critical operations

### Data Access
- **Repository Pattern**: Services interact with Prisma, not controllers
- **Transactions**: Use Prisma transactions for multi-step operations
- **Eager Loading**: Use `include` to prevent N+1 queries
- **Indexing**: Add indexes for foreign keys and frequently queried fields

### API Design
- **RESTful**: Follow REST conventions
- **Versioning**: Plan for API versioning (e.g., `/v1/resources`)
- **Pagination**: Always paginate list endpoints
- **Filtering**: Support filtering via query parameters
- **Swagger**: Document all endpoints with decorators

### Event-Driven Architecture
- **Events**: Publish events for state changes
- **Handlers**: Keep handlers lightweight and idempotent
- **Async**: Use events for async operations (notifications, analytics)
- **Decoupling**: Events enable loose coupling between modules

## Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Via MetricsService
- **System Metrics**: CPU, memory, disk (infrastructure)
- **Business Metrics**: Bookings, revenue, utilization

### Logging
- **Structured Logs**: JSON format for parsing
- **Log Aggregation**: Compatible with ELK, Datadog, etc.
- **Correlation IDs**: Track requests across services

### Health Checks
- **Database**: Connection pool health
- **Redis**: Cache availability
- **Dependencies**: External service health

## Future Enhancements

### Planned Features
- **Webhooks**: Outbound webhooks for integrations
- **GraphQL**: GraphQL API alongside REST
- **Real-time**: WebSocket support for live updates
- **Mobile API**: Optimized mobile endpoints
- **Audit Trail**: Comprehensive audit logging (partially implemented)
- **RBAC**: Fine-grained role-based access control
- **Multi-region**: Geographic distribution

### Technical Improvements
- **Microservices**: Extract modules into separate services
- **Message Queue**: RabbitMQ/SQS for async processing
- **CQRS**: Command Query Responsibility Segregation
- **Event Sourcing**: Event-based persistence
- **API Gateway**: Dedicated gateway service (Kong, API Gateway)
