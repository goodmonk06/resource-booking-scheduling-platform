# Quick Start Guide

This guide will get you up and running in 5 minutes.

## Prerequisites

Make sure you have installed:
- Node.js 18+ and npm 9+
- Docker and Docker Compose (for PostgreSQL and Redis)

## Setup Steps

### 1. Clone and Install Dependencies

```bash
cd resource-booking-scheduling-platform
npm install
```

This installs dependencies for the root workspace and both backend and frontend.

### 2. Start Database Services

```bash
npm run docker:up
```

This starts PostgreSQL on port 5432 and Redis on port 6379.

### 3. Setup Environment Variables

```bash
# Copy example env files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

The default values in `.env.example` work for local development with Docker.

### 4. Initialize Database

```bash
# Run migrations
npm run prisma:migrate

# Seed demo data
cd backend
npm run prisma:seed
cd ..
```

This creates the database schema and adds demo data:
- Tenant: "Demo Coworking Space"
- Admin user: `admin@demo.com` / `admin123`
- Sample resources (meeting rooms, desks)
- Opening hours (Mon-Fri 9am-6pm)

### 5. Start the Application

```bash
npm run dev
```

This starts both backend and frontend:
- Backend API: http://localhost:3001
- Frontend: http://localhost:3000
- API Docs: http://localhost:3001/api/docs

### 6. Test It Out!

1. Open http://localhost:3000
2. Click "Browse Resources"
3. Select a resource to view details
4. Click "Book Now" to make a reservation
5. Select date, duration, and time slot
6. Fill in your details and confirm

## What's Next?

### Explore the Admin Dashboard
Visit http://localhost:3000/admin to:
- View resource statistics
- Manage resources and groups
- Configure settings

### Try the API
Visit http://localhost:3001/api/docs for interactive API documentation.

### View Database
Run Prisma Studio to explore the database:
```bash
npm run prisma:studio
```

## Common Commands

```bash
# Start all services
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Stop Docker services
npm run docker:down

# View database with Prisma Studio
npm run prisma:studio

# Run database migrations
npm run prisma:migrate

# Build for production
npm run build
```

## Troubleshooting

### Port Already in Use
If port 3000 or 3001 is in use, change them in `.env`:
```env
BACKEND_PORT=3002
```
And update `NEXT_PUBLIC_API_URL` in `frontend/.env`.

### Database Connection Failed
Make sure Docker containers are running:
```bash
docker ps
```

You should see `booking_postgres` and `booking_redis` running.

### Prisma Client Error
Regenerate the Prisma client:
```bash
cd backend
npx prisma generate
```

## Need Help?

- Check the main [README.md](README.md) for detailed documentation
- View API documentation at http://localhost:3001/api/docs
- Check database with `npm run prisma:studio`
