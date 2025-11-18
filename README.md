# Resource Booking & Scheduling Platform

A production-ready, type-safe platform for managing bookings and scheduling across various resource types - from coworking spaces to healthcare clinics to community facilities.

## Overview

This platform provides a **complete, end-to-end solution** for resource booking and scheduling:

- ✅ **Multiple resource types**: rooms, desks, equipment, vehicles, staff, and custom resources
- ✅ **Intelligent availability**: Smart scheduling with opening hours and automatic conflict detection
- ✅ **Booking workflows**: Complete flow from browsing → booking → confirmation
- ✅ **Multi-tenant architecture**: Support multiple organizations with complete data isolation
- ✅ **Type-safe API**: Full TypeScript with validated DTOs end-to-end
- ✅ **Payment integration**: Optional Stripe integration for paid bookings
- ✅ **Production-ready**: Docker support, comprehensive testing, CI/CD ready

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework with dependency injection
- **TypeScript** - Type-safe development
- **Prisma ORM** - Type-safe database modeling and migrations
- **PostgreSQL** - Primary relational database
- **Redis** - Caching layer for performance optimization
- **Stripe** - Payment processing (optional)
- **class-validator** - DTO validation
- **Jest** - Unit and integration testing

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe frontend development
- **Tailwind CSS** - Utility-first styling
- **React Calendar** - Interactive calendar component
- **Axios** - Type-safe API client
- **React Hot Toast** - Toast notifications

## Domain Model Summary

```
Tenant (Organization)
├── ResourceGroup (type: ROOM | PERSON | EQUIPMENT | VEHICLE | CUSTOM)
│   ├── Resource (bookable entity with capacity, metadata)
│   │   ├── OpeningHours (weekly schedule: weekday, start/end time)
│   │   └── Reservation (booking with status: PENDING | CONFIRMED | CANCELLED | COMPLETED)
│   └── OpeningHours (group-level defaults)
├── User (ADMIN | MANAGER | USER roles with JWT authentication)
└── BookingPolicy (rules: cancellation deadline, max duration, advance booking days)
```

**Key Relationships:**
- Resources belong to ResourceGroups → Tenants (multi-tenant isolation)
- OpeningHours: resource-specific overrides group-level defaults
- Reservations: Users book Resources with automatic conflict detection
- BookingPolicy: Flexible JSON rules per tenant

## Getting Started

### Requirements
- **Node.js** 18+ and npm 9+
- **Docker & Docker Compose** (recommended) OR
- **PostgreSQL** 15+ and **Redis** 7+ (if running locally)

### Quick Start (Recommended - 5 minutes)

```bash
# 1. Clone and setup environment
git clone <repository-url>
cd resource-booking-scheduling-platform
cp .env.example .env

# 2. Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# 3. Install, migrate, and seed
npm run setup

# 4. Start development servers
npm run dev
```

**Access the application:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:3001
- 📚 API Docs: http://localhost:3001/api/docs
- 🎨 Prisma Studio: `npm run db:studio` → http://localhost:5555

**Demo Credentials:**
- Email: `admin@demo.com`
- Password: `admin123`

### Setup Steps Explained

| Step | Command | Description |
|------|---------|-------------|
| 1 | `npm run docker:up` | Starts PostgreSQL (5432) and Redis (6379) |
| 2 | `npm run setup` | Installs deps → Runs migrations → Seeds demo data |
| 3 | `npm run dev` | Starts backend (3001) and frontend (3000) |

## Example Flow: Complete Booking Journey

This platform includes a **fully functional vertical slice** demonstrating the entire booking workflow:

### API Flow

```bash
# 1. Browse Resources
GET /resources
→ Returns all available resources with groups and metadata

# 2. View Resource Details
GET /resources/:id
→ Returns resource with opening hours and upcoming reservations

# 3. Check Availability
GET /availability/slots/:resourceId?startDate=2024-12-01&endDate=2024-12-01&duration=60
→ Returns available time slots (accounts for opening hours + conflicts)

# 4. Create Reservation
POST /reservations
{
  "resourceId": "...",
  "startsAt": "2024-12-01T10:00:00Z",
  "endsAt": "2024-12-01T11:00:00Z",
  "metaJson": {
    "customerName": "John Doe",
    "customerEmail": "john@example.com"
  }
}
→ Creates PENDING reservation (validates no conflicts)

# 5. Confirm Booking (with optional payment)
POST /reservations/:id/confirm
{ "stripePaymentId": "pi_123..." }
→ Marks reservation as CONFIRMED

# 6. Cancel Booking
POST /reservations/:id/cancel
{ "cancellationNote": "Plans changed" }
→ Marks reservation as CANCELLED
```

### Frontend Flow

1. **Browse** `/resources` - Grid of available resources with filters
2. **Details** `/resources/:id` - Resource info, calendar, opening hours
3. **Book** `/resources/:id/book` - Interactive form:
   - Select date (calendar picker)
   - Choose duration (dropdown: 30min, 1hr, 2hrs, etc.)
   - Pick time slot (list of available slots)
   - Enter contact info
4. **Confirm** `/bookings/:id` - Confirmation page with booking details

**Try it yourself:**
```bash
npm run dev
# Visit http://localhost:3000
# Click "Browse Resources" → "Conference Room A" → "Book Now"
# Complete the booking flow!
```

## Available Scripts

### Development
```bash
npm run dev              # Start both backend & frontend (recommended)
npm run dev:backend      # Start backend only (port 3001)
npm run dev:frontend     # Start frontend only (port 3000)
```

### Building
```bash
npm run build            # Build both for production
npm run build:backend    # Build NestJS backend → dist/
npm run build:frontend   # Build Next.js frontend → .next/
```

### Production
```bash
npm start                # Start both in production mode
npm run start:backend    # node dist/main
npm run start:frontend   # next start
```

### Testing
```bash
npm test                 # Run all tests with Jest
npm run test:watch       # Run in watch mode
npm run test:cov         # Generate coverage report
```

### Linting
```bash
npm run lint             # Lint backend & frontend
npm run lint:backend     # ESLint + Prettier
npm run lint:frontend    # Next.js linter
```

### Database
```bash
npm run db:migrate       # Run Prisma migrations (dev)
npm run db:push          # Push schema without migration
npm run db:seed          # Seed demo data (tenant, resources, hours)
npm run db:studio        # Open Prisma Studio GUI
npm run db:reset         # ⚠️ Reset database (deletes all data)
```

### Docker
```bash
npm run docker:up        # Start services (postgres, redis, backend, frontend)
npm run docker:down      # Stop all services
npm run docker:build     # Build Docker images
npm run docker:logs      # View live logs
```

### Utilities
```bash
npm run setup            # Full setup: install + migrate + seed
npm run clean            # Remove node_modules and build artifacts
```

## API Endpoints

### Resources
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/resources` | - | List all resources (filter by groupId, isActive) |
| GET | `/resources/:id` | - | Get resource details with opening hours |
| POST | `/resources` | ✓ | Create new resource (DTO validated) |
| PATCH | `/resources/:id` | ✓ | Update resource |
| DELETE | `/resources/:id` | ✓ | Delete resource |

### Availability
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/availability/slots/:resourceId` | - | Get available time slots (query: startDate, endDate, duration, interval) |
| POST | `/availability/check` | - | Check if specific slot is available |

### Reservations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reservations` | - | List reservations (filter by resourceId, userId, status, dates) |
| GET | `/reservations/:id` | - | Get reservation details |
| POST | `/reservations` | - | Create reservation (validates conflicts) |
| POST | `/reservations/:id/confirm` | ✓ | Confirm reservation |
| POST | `/reservations/:id/cancel` | - | Cancel reservation |
| PATCH | `/reservations/:id` | ✓ | Update reservation |
| DELETE | `/reservations/:id` | ✓ | Delete reservation |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login → JWT token |
| POST | `/auth/register` | Register new user |

**Full API documentation:** http://localhost:3001/api/docs (Swagger UI)

## Testing

Comprehensive test coverage with Jest:

```bash
npm test          # Run all tests
npm run test:cov  # With coverage report
```

**Test Suites:**
- ✅ **ResourcesService** - CRUD operations, filtering, validation
- ✅ **ReservationsService** - Booking, conflict detection, cancellation
- ✅ **AvailabilityService** - Slot generation, opening hours, conflicts
- ✅ **DTOs** - Validation with class-validator
- ✅ **Error Handling** - Global exception filter

**Example Test:**
```typescript
describe('ReservationsService', () => {
  it('should create reservation when no conflicts', async () => {
    const result = await service.create({
      resourceId: 'resource-1',
      startsAt: new Date('2024-12-01T10:00:00Z'),
      endsAt: new Date('2024-12-01T11:00:00Z'),
    });
    expect(result.status).toBe(ReservationStatus.PENDING);
  });

  it('should throw error when conflicts exist', async () => {
    await expect(service.create(overlappingBooking)).rejects.toThrow();
  });
});
```

## Use Cases

### 1. Coworking Space Booking
Manage hot desks, meeting rooms, phone booths:
- Members book resources by hour/day
- Calendar shows availability in real-time
- Automatic conflict prevention
- Admin dashboard for utilization tracking

### 2. Healthcare/Clinic Scheduling
Schedule patient appointments and resources:
- Consultation rooms with doctor assignment
- Medical equipment booking
- Patient metadata (notes, requirements)
- Cancellation policies (24hr notice)

### 3. Community Center/Welfare Facilities
Public facility booking system:
- Activity rooms, sports courts
- Equipment rental (projectors, tables)
- Approval workflows (optional)
- Opening hours per day of week

## Architecture Highlights

### Validation & Error Handling
- **DTOs**: `class-validator` decorators for request validation
- **Global Filter**: Consistent error response format
- **Swagger**: Auto-generated API docs from decorators

### Caching Strategy
- **Redis**: 5-minute TTL for availability queries
- **Performance**: Reduces DB load on high-traffic endpoints
- **Invalidation**: Automatic on reservation changes

### Conflict Detection Algorithm
Prevents double-booking with interval overlap detection:
```typescript
// Detects 4 overlap scenarios:
// 1. New booking starts during existing
// 2. New booking ends during existing
// 3. New booking contains existing
// 4. Existing booking contains new
```

### Type Safety
- **End-to-end TypeScript**: Backend → Database → Frontend
- **Prisma Client**: Auto-generated types from schema
- **DTOs**: Validated and transformed automatically

## Production Deployment

### Environment Variables
```env
# Required
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_HOST=redis-host
JWT_SECRET=your-secret-key

# Optional
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Docker Deployment
```bash
# Build and start all services
npm run docker:build
npm run docker:up

# Migrations run automatically on backend startup
# Check logs
npm run docker:logs
```

The `docker-compose.yml` includes:
- PostgreSQL with health checks
- Redis with health checks
- Backend (runs migrations on startup)
- Frontend
- Proper service dependencies

### Manual Deployment
```bash
# Build
npm run build

# Database
npm run db:migrate

# Start
npm start
```

## Future Extensions

Designed for extensibility:

### Phase 3 Roadmap
- [ ] Recurring bookings (weekly/monthly patterns)
- [ ] Approval workflows (manager approval)
- [ ] Email/SMS notifications
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Calendar sync (Google, Outlook)
- [ ] Waitlist system
- [ ] Resource bundles (book multiple together)
- [ ] Dynamic pricing tiers
- [ ] Access control (QR codes, door locks)

### Easy to Extend
```typescript
// Add new resource types
enum ResourceType {
  PARKING_SPOT,  // ← Add new type
  LOCKER,        // ← Add new type
}

// Custom booking rules
{
  "rulesJson": {
    "requiresApproval": true,
    "requiresDeposit": 50,
    "allowOvernight": false,
    "maxConsecutiveDays": 7
  }
}
```

## Troubleshooting

### Port already in use
```bash
# Change ports in .env
BACKEND_PORT=3002
```

### Database connection failed
```bash
# Check Docker services
docker ps

# Restart services
npm run docker:down && npm run docker:up
```

### Prisma client not generated
```bash
cd backend && npx prisma generate
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Make changes with tests
4. Ensure `npm test` and `npm run lint` pass
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing`)
7. Open Pull Request

## License

MIT License - free for commercial and personal use.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: API docs at `/api/docs`
- **Quick Start**: See [SETUP.md](./SETUP.md)

---

**Built with:** NestJS · Prisma · PostgreSQL · Redis · Next.js · TypeScript · Docker

**Status:** ✅ Production Ready | 🧪 Tested | 📦 Dockerized | 📝 Well Documented | 🚀 Phase 2 Complete
