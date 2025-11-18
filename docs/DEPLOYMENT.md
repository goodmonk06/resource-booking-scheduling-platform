# Deployment Guide

This guide covers deploying the Resource Booking & Scheduling Platform to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Database Migrations](#database-migrations)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Recovery](#backup--recovery)
- [Security Checklist](#security-checklist)

## Prerequisites

### System Requirements

- **Node.js**: v18 or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v6 or higher
- **Docker**: v20 or higher (for containerized deployment)
- **Docker Compose**: v2 or higher

### Development Tools

- **npm**: v9 or higher
- **Git**: v2.30 or higher
- **Prisma CLI**: Included in dependencies

## Environment Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/booking_platform?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server
PORT=3001
NODE_ENV=development

# Notification Adapters (Optional)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Payment Adapters (Optional)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret

# Calendar Integration (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Frontend (Create .env.local in frontend directory)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Production Environment Variables

For production, use environment-specific values:

```bash
# Production Database (use connection pooling)
DATABASE_URL="postgresql://user:password@prod-db.example.com:5432/booking_platform?schema=public&connection_limit=10&pool_timeout=60"

# Production Redis (use SSL if available)
REDIS_HOST=prod-redis.example.com
REDIS_PORT=6379
REDIS_TLS=true

# Strong JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=<generated-secret>
JWT_EXPIRES_IN=1d

# Production Server
PORT=3001
NODE_ENV=production

# Enable HTTPS
FORCE_HTTPS=true

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/resource-booking-platform.git
cd resource-booking-platform
```

### 2. Install Dependencies

```bash
npm install
```

This installs dependencies for both backend and frontend via workspace configuration.

### 3. Setup Database

```bash
# Start PostgreSQL and Redis using Docker Compose
docker-compose up -d postgres redis

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### 4. Start Development Servers

```bash
# Start both backend and frontend
npm run dev

# Or start individually:
npm run dev:backend
npm run dev:frontend
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api

## Docker Deployment

### Using Docker Compose (Recommended for Development)

#### 1. Build and Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- Backend API server
- Frontend web server

#### 2. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
```

#### 3. Stop Services

```bash
docker-compose down

# Remove volumes (caution: deletes data)
docker-compose down -v
```

### Custom Docker Build

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
COPY backend/prisma ./prisma/

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json ./

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy Prisma schema and migrations
COPY backend/prisma ./prisma

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

USER nestjs

EXPOSE 3001

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

#### Frontend Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

## Production Deployment

### Option 1: Cloud Platform (AWS, GCP, Azure)

#### AWS Deployment with ECS

1. **Build and Push Docker Images**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build images
docker build -t booking-backend:latest -f backend/Dockerfile .
docker build -t booking-frontend:latest -f frontend/Dockerfile .

# Tag images
docker tag booking-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/booking-backend:latest
docker tag booking-frontend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/booking-frontend:latest

# Push images
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/booking-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/booking-frontend:latest
```

2. **Create ECS Task Definition**

```json
{
  "family": "booking-platform",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/booking-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:..."
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/booking-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

3. **Setup RDS PostgreSQL**

```bash
# Create DB instance
aws rds create-db-instance \
  --db-instance-identifier booking-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name my-db-subnet-group
```

4. **Setup ElastiCache Redis**

```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id booking-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxx
```

### Option 2: Platform-as-a-Service (Heroku, Railway, Render)

#### Heroku Deployment

1. **Install Heroku CLI**

```bash
npm install -g heroku
heroku login
```

2. **Create Heroku App**

```bash
heroku create booking-platform-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=<your-secret>
```

3. **Deploy**

```bash
# Backend
cd backend
git init
heroku git:remote -a booking-platform-backend
git add .
git commit -m "Initial deployment"
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

#### Railway Deployment

1. **Install Railway CLI**

```bash
npm install -g @railway/cli
railway login
```

2. **Initialize Project**

```bash
railway init
railway link
```

3. **Add Services**

```bash
# Add PostgreSQL
railway add --service postgres

# Add Redis
railway add --service redis
```

4. **Deploy**

```bash
railway up
```

### Option 3: Kubernetes

#### Kubernetes Manifests

**backend-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: booking-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: booking-backend
  template:
    metadata:
      labels:
        app: booking-backend
    spec:
      containers:
      - name: backend
        image: your-registry/booking-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: booking-secrets
              key: database-url
        - name: REDIS_HOST
          value: "redis-service"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: booking-backend-service
spec:
  selector:
    app: booking-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

**postgres-statefulset.yaml**:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: booking_platform
        - name: POSTGRES_USER
          value: admin
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: booking-secrets
              key: postgres-password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Database Migrations

### Running Migrations

#### Development

```bash
# Create new migration
npm run db:migrate

# Apply migrations
npx prisma migrate deploy
```

#### Production

```bash
# SSH into production server or container
ssh user@production-server

# Navigate to application directory
cd /app

# Run migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### Rollback Migrations

Prisma doesn't support automatic rollbacks. To rollback:

1. **Restore database backup**
2. **Remove migration files**
3. **Recreate schema from desired state**

```bash
# Restore from backup
pg_restore -d booking_platform backup.dump

# Reset Prisma migration history
npx prisma migrate resolve --rolled-back <migration-name>
```

## Monitoring & Logging

### Application Logging

Logs are output in JSON format for easy parsing:

```json
{
  "level": "info",
  "message": "Reservation created",
  "context": "ReservationsService",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "reservationId": "uuid",
    "userId": "uuid"
  }
}
```

### Log Aggregation

#### Using CloudWatch (AWS)

```bash
# Install CloudWatch agent
sudo yum install amazon-cloudwatch-agent

# Configure log streaming
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/app/logs/*.log",
            "log_group_name": "/aws/booking-platform",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json \
  -s
```

#### Using ELK Stack

```yaml
# docker-compose.elk.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - "5000:5000"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
```

### Metrics & Monitoring

#### Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus-data:
  grafana-data:
```

## Backup & Recovery

### Database Backups

#### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups
DB_NAME=booking_platform

# Create backup
pg_dump -Fc $DB_NAME > $BACKUP_DIR/backup_$DATE.dump

# Compress
gzip $BACKUP_DIR/backup_$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.dump.gz s3://my-backups/

# Clean old backups (keep last 30 days)
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +30 -delete
```

#### Restore from Backup

```bash
# Download backup from S3
aws s3 cp s3://my-backups/backup_20240115_103000.dump.gz .

# Uncompress
gunzip backup_20240115_103000.dump.gz

# Restore
pg_restore -d booking_platform -c backup_20240115_103000.dump
```

### Redis Backups

```bash
# Create snapshot
redis-cli BGSAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backups/redis_backup_$(date +%Y%m%d).rdb
```

## Security Checklist

### Pre-Deployment

- [ ] Change all default passwords
- [ ] Generate strong JWT secret
- [ ] Enable HTTPS/TLS
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Scan dependencies for vulnerabilities (`npm audit`)
- [ ] Review environment variables
- [ ] Enable database connection encryption
- [ ] Configure Content Security Policy headers
- [ ] Set up security headers (Helmet.js)
- [ ] Disable directory listing
- [ ] Remove development endpoints in production
- [ ] Enable SQL injection protection (Prisma)
- [ ] Validate all user inputs
- [ ] Implement API authentication
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Test disaster recovery plan
- [ ] Document security procedures

### Post-Deployment

- [ ] Monitor logs for suspicious activity
- [ ] Review access logs regularly
- [ ] Keep dependencies updated
- [ ] Perform security audits
- [ ] Test backup restoration
- [ ] Review and rotate secrets regularly
- [ ] Monitor SSL certificate expiration
- [ ] Conduct penetration testing
- [ ] Review user permissions
- [ ] Update documentation

## Troubleshooting

### Common Issues

#### Database Connection Errors

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

#### Redis Connection Errors

```bash
# Check Redis is running
redis-cli ping

# Check Redis configuration
redis-cli CONFIG GET "*"
```

#### Migration Failures

```bash
# Check migration status
npx prisma migrate status

# Force resolve stuck migration
npx prisma migrate resolve --applied <migration-name>

# Reset database (development only!)
npx prisma migrate reset
```

#### Out of Memory Errors

```bash
# Check Node.js memory usage
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Monitor memory in production
pm2 start dist/main.js --max-memory-restart 1G
```

## Performance Tuning

### Database Optimization

```sql
-- Add indexes
CREATE INDEX idx_reservations_resource_time ON reservations(resource_id, start_time, end_time);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_resources_group ON resources(group_id);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM reservations WHERE resource_id = 'uuid';

-- Vacuum and analyze
VACUUM ANALYZE;
```

### Redis Configuration

```conf
# redis.conf
maxmemory 256mb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### Node.js Optimization

```bash
# Use production mode
NODE_ENV=production

# Enable clustering
pm2 start dist/main.js -i max

# Optimize V8
NODE_OPTIONS="--max-old-space-size=4096 --optimize-for-size"
```

## Conclusion

This deployment guide covers the essential steps for deploying the Resource Booking & Scheduling Platform. For specific questions or issues, refer to the main README or open an issue in the repository.
