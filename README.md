# Resource Booking & Scheduling Platform

A flexible, generic platform for managing bookings and scheduling across various resource types - from coworking spaces to healthcare clinics to community facilities.

## Overview

This platform provides a complete solution for resource booking and scheduling with support for:
- **Multiple resource types**: rooms, desks, equipment, vehicles, staff, and custom resources
- **Availability management**: Smart scheduling with opening hours, time slots, and conflict detection
- **Booking policies**: Customizable cancellation rules, duration limits, and advance booking windows
- **Multi-tenant architecture**: Support multiple organizations with isolated data
- **Payment integration**: Optional Stripe integration for paid bookings
- **Modern UI**: Responsive Next.js frontend with calendar views and slot pickers

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe development
- **Prisma ORM** - Database modeling and migrations
- **PostgreSQL** - Primary database
- **Redis** - Caching layer for availability queries
- **Stripe** - Payment processing (optional)

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe frontend
- **Tailwind CSS** - Utility-first styling
- **React Calendar** - Calendar component
- **Axios** - API client
- **React Hot Toast** - Toast notifications

## Features

### 1. Resource Management
- Create and organize resources into groups (rooms, desks, equipment, etc.)
- Define resource properties (capacity, amenities, location)
- Flexible metadata storage (JSON fields for custom properties)
- Active/inactive status management

### 2. Availability System
- Configure opening hours by day of week
- Support for both resource-specific and group-level hours
- Real-time availability calculation with caching
- Conflict detection for overlapping bookings
- Smart slot generation based on desired duration

### 3. Booking Flow
1. Browse available resources
2. View calendar with opening hours
3. Select date and duration
4. Pick from available time slots
5. Enter contact information
6. Confirm booking

### 4. Admin Interface
- Dashboard with resource statistics
- Manage resources and resource groups
- View and manage bookings
- Configure opening hours
- Set booking policies

### 5. Payment Integration
- Stripe payment intent creation
- Webhook handling for payment confirmation
- Automatic booking confirmation on successful payment
- Refund support

## Domain Model

```
Tenant
├── ResourceGroup (type: room, person, equipment, vehicle, custom)
│   ├── Resource (name, capacity, metadata)
│   │   ├── OpeningHours (weekday, start/end time)
│   │   └── Reservation (status: pending, confirmed, cancelled)
│   └── OpeningHours (group-level)
├── User (role: admin, manager, user)
└── BookingPolicy (cancellation rules, duration limits)
```

## Use Cases

### 1. Coworking Space Booking
Perfect for managing shared workspaces:
- **Hot desks**: Book desks by the hour or day
- **Meeting rooms**: Schedule conference rooms with equipment
- **Phone booths**: Quick 15-30 minute bookings
- **Private offices**: Long-term resource allocation

**Example Configuration:**
```json
{
  "resourceGroups": [
    {
      "name": "Meeting Rooms",
      "type": "ROOM",
      "resources": [
        {
          "name": "Conference Room A",
          "capacity": 12,
          "amenities": ["projector", "whiteboard", "video-conferencing"]
        }
      ]
    }
  ],
  "openingHours": {
    "monday-friday": "08:00-20:00",
    "saturday": "09:00-18:00"
  },
  "bookingPolicy": {
    "minDuration": "30min",
    "maxDuration": "8hrs",
    "advanceBooking": "30days",
    "cancellationDeadline": "24hrs"
  }
}
```

### 2. Healthcare/Clinic Appointment Booking
Optimize patient scheduling and resource utilization:
- **Consultation rooms**: Schedule patient appointments
- **Medical equipment**: Book diagnostic equipment slots
- **Staff scheduling**: Manage doctor/specialist availability
- **Treatment rooms**: Coordinate therapy and treatment sessions

**Example Configuration:**
```json
{
  "resourceGroups": [
    {
      "name": "Consultation Rooms",
      "type": "ROOM",
      "resources": [
        {
          "name": "Room 101",
          "capacity": 2,
          "amenities": ["examination-table", "computer", "sink"]
        }
      ]
    },
    {
      "name": "Doctors",
      "type": "PERSON",
      "resources": [
        {
          "name": "Dr. Smith",
          "specialty": "General Practice",
          "openingHours": "custom-schedule"
        }
      ]
    }
  ],
  "bookingPolicy": {
    "minDuration": "15min",
    "defaultDuration": "30min",
    "advanceBooking": "60days",
    "cancellationDeadline": "24hrs"
  }
}
```

### 3. Community Center/Welfare Facility
Enable public access to community resources:
- **Activity rooms**: Book spaces for classes, meetings, events
- **Sports facilities**: Schedule courts, fields, gyms
- **Equipment**: Reserve items like projectors, chairs, tables
- **Visitation rooms**: Schedule family visits (welfare centers)

**Example Configuration:**
```json
{
  "resourceGroups": [
    {
      "name": "Activity Rooms",
      "type": "ROOM",
      "resources": [
        {
          "name": "Multi-Purpose Hall",
          "capacity": 50,
          "amenities": ["stage", "sound-system", "chairs"]
        }
      ]
    }
  ],
  "openingHours": {
    "monday-sunday": "06:00-22:00"
  },
  "bookingPolicy": {
    "minDuration": "1hr",
    "maxDuration": "6hrs",
    "requiresApproval": true
  }
}
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm 9+
- PostgreSQL 15+
- Redis 7+
- (Optional) Stripe account for payments

### 1. Clone and Install

```bash
git clone <repository-url>
cd resource-booking-scheduling-platform
npm install
```

### 2. Configure Environment

Create `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://booking_user:booking_password@localhost:5432/booking_db?schema=public"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Backend
BACKEND_PORT=3001
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Start Database Services

```bash
# Start PostgreSQL and Redis with Docker
npm run docker:up

# Or start them manually if installed locally
```

### 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 5. Seed Demo Data

```bash
cd backend
npm run prisma:seed
```

This creates:
- Demo tenant: "Demo Coworking Space"
- Admin user: admin@demo.com / admin123
- Sample resources: Meeting rooms, hot desks, phone booths
- Opening hours: Monday-Friday schedules
- Default booking policy

### 6. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start individually
npm run dev:backend  # http://localhost:3001
npm run dev:frontend # http://localhost:3000
```

### 7. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Prisma Studio**: `npm run prisma:studio` (http://localhost:5555)

## API Endpoints

### Resources
- `GET /resources` - List all resources
- `GET /resources/:id` - Get resource details
- `POST /resources` - Create resource (auth required)
- `PATCH /resources/:id` - Update resource (auth required)
- `DELETE /resources/:id` - Delete resource (auth required)

### Resource Groups
- `GET /resource-groups` - List all groups
- `GET /resource-groups/:id` - Get group details
- `POST /resource-groups` - Create group (auth required)

### Availability
- `GET /availability/slots/:resourceId` - Get available time slots
  - Query params: `startDate`, `endDate`, `duration`, `interval`
- `POST /availability/check` - Check if specific slot is available

### Reservations
- `GET /reservations` - List reservations
  - Query params: `resourceId`, `userId`, `status`, `startDate`, `endDate`
- `GET /reservations/:id` - Get reservation details
- `POST /reservations` - Create reservation
- `POST /reservations/:id/confirm` - Confirm reservation (auth required)
- `POST /reservations/:id/cancel` - Cancel reservation
- `PATCH /reservations/:id` - Update reservation (auth required)

### Opening Hours
- `GET /opening-hours` - List opening hours
- `GET /opening-hours/resource/:resourceId` - Get hours for resource
- `POST /opening-hours` - Create opening hours (auth required)

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

### Payments
- `POST /payments/create-payment-intent` - Create Stripe payment (auth required)
- `POST /payments/webhook` - Stripe webhook handler
- `POST /payments/refund` - Process refund (auth required)

## Frontend Pages

- `/` - Landing page with feature overview
- `/resources` - Browse all available resources
- `/resources/:id` - Resource detail with calendar
- `/resources/:id/book` - Booking form with slot picker
- `/bookings/:id` - Booking confirmation page
- `/admin` - Admin dashboard (resource management)

## Architecture Decisions

### Why Caching?
Availability calculation can be expensive with many resources and reservations. Redis caching:
- Reduces database load
- Speeds up slot queries
- 5-minute TTL balances freshness and performance

### Why JSON Metadata Fields?
- **Flexibility**: Each tenant can add custom properties without schema changes
- **Resource-specific data**: Amenities, floor numbers, special requirements
- **Booking metadata**: Customer info, notes, preferences
- **Policy rules**: Complex cancellation logic, pricing tiers

### Conflict Detection Algorithm
Checks for overlapping intervals using four conditions:
1. New booking starts during existing booking
2. New booking ends during existing booking
3. New booking contains existing booking
4. Existing booking contains new booking

### Opening Hours Hierarchy
Resource-specific hours override group-level hours, allowing:
- Default hours for entire group
- Exceptions for specific resources
- Easy bulk management

## Customization Guide

### Adding New Resource Types

1. Update Prisma enum:
```prisma
enum ResourceType {
  ROOM
  PERSON
  EQUIPMENT
  VEHICLE
  CUSTOM
  YOUR_NEW_TYPE  // Add here
}
```

2. Run migration:
```bash
npx prisma migrate dev --name add_new_resource_type
```

### Adding Custom Metadata

Resources and reservations support `metaJson` fields:

```typescript
// Create resource with custom data
await prisma.resource.create({
  data: {
    name: "Yoga Studio",
    metaJson: {
      floor: 3,
      amenities: ["mirrors", "mats", "sound-system"],
      squareFeet: 800,
      maxParticipants: 20,
      temperature: "climate-controlled"
    }
  }
})
```

### Implementing Payment Logic

The platform includes Stripe integration points:

```typescript
// 1. Create payment intent
const { clientSecret } = await paymentsService.createPaymentIntent(
  reservationId,
  amount
)

// 2. Process payment on frontend
// 3. Webhook confirms booking automatically
```

### Custom Booking Policies

Store rules in `BookingPolicy.rulesJson`:

```json
{
  "cancellationDeadlineHours": 24,
  "maxDurationHours": 8,
  "minDurationMinutes": 30,
  "advanceBookingDays": 30,
  "requiresApproval": false,
  "allowRecurring": true,
  "pricing": {
    "baseRate": 25,
    "currency": "USD",
    "perHour": true
  }
}
```

## Production Deployment

### Environment Variables

Ensure production values for:
- `DATABASE_URL` - Production PostgreSQL
- `REDIS_HOST` - Production Redis
- `JWT_SECRET` - Strong random secret
- `NODE_ENV=production`
- `STRIPE_SECRET_KEY` - Production Stripe key

### Database Migrations

```bash
cd backend
npx prisma migrate deploy
```

### Build Commands

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

### Docker Deployment

```bash
# Start services
docker-compose up -d

# Run migrations
docker exec -it booking_backend npx prisma migrate deploy
```

### Security Considerations

1. **Authentication**: Implement proper JWT validation
2. **Rate limiting**: Add rate limiting to prevent abuse
3. **Input validation**: All DTOs use class-validator
4. **SQL injection**: Prisma provides parameterized queries
5. **CORS**: Configure allowed origins
6. **Stripe webhooks**: Verify webhook signatures

## Monitoring & Debugging

### Prisma Studio
Visual database browser:
```bash
npm run prisma:studio
```

### API Documentation
Swagger UI available at:
```
http://localhost:3001/api/docs
```

### Logs
- Backend: Console logs in development
- Frontend: Browser console
- Production: Configure logging service (Winston, DataDog, etc.)

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Test connection
psql postgresql://booking_user:booking_password@localhost:5432/booking_db
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Prisma Client Not Generated
```bash
cd backend
npx prisma generate
```

### Port Already in Use
```bash
# Change ports in .env
BACKEND_PORT=3002
# Update NEXT_PUBLIC_API_URL accordingly
```

## Testing

```bash
# Backend unit tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - feel free to use this platform for commercial or personal projects.

## Support

For issues, questions, or contributions:
- GitHub Issues: Report bugs and request features
- Documentation: Check API docs at `/api/docs`
- Examples: See use cases above

---

Built with ❤️ using NestJS, Prisma, PostgreSQL, Redis, and Next.js
