# eBike Fleet Management Application

A comprehensive fleet management system for electric bikes, built with FastAPI and React. This application enables administrators to manage bikes, batteries, drivers, rentals, maintenance records, and financial transactions, while providing drivers with access to their assigned bikes and rental information.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Design Patterns](#design-patterns)
- [Testing](#testing)
- [Database Migrations](#database-migrations)
- [Development](#development)
- [Deployment](#deployment)

## Features

### Core Functionality

- **User Management**
  - User authentication with JWT tokens (access + refresh tokens)
  - Role-based access control (Admin and Driver roles)
  - User profile management
  - Admin bootstrap functionality for first-time setup

- **Bike Management**
  - Create, read, update, and delete bikes
  - Track bike status (available, assigned, maintenance, retired)
  - Monitor mileage and last service date
  - Assign bikes to driver profiles
  - Search and filter bikes by serial number, make, model, or status

- **Battery Management**
  - Manage battery inventory with serial numbers
  - Track battery capacity (Wh), charge level, and cycle count
  - Monitor battery health status (good, degraded, poor)
  - Track battery status (available, assigned, charging, maintenance, retired)
  - Assign batteries to bikes
  - Search and filter batteries

- **Rental Management**
  - Create and manage bike rentals
  - Track rental periods (start and end dates)
  - Filter rentals by bike, driver, or date range
  - Automatic notifications on rental events

- **Maintenance Records**
  - Record maintenance activities for bikes and batteries
  - Track maintenance costs with multi-currency support
  - Link maintenance to specific bikes and/or batteries
  - Search and filter maintenance records

- **Financial Management**
  - Track income and expense transactions
  - Multi-currency support (RSD, EUR, USD)
  - Exchange rate management
  - Financial analytics and reporting
  - Link transactions to rentals and maintenance records
  - Currency conversion functionality

- **Notifications**
  - Email notifications
  - SMS notifications (configurable)
  - In-app notifications
  - Strategy pattern for extensible notification methods

### User Roles

- **Admin**: Full access to all features including user management, fleet management, rentals, maintenance, and financial analytics
- **Driver**: Access to assigned bikes, batteries, and personal rental history

## Architecture

The application follows a microservices-inspired architecture with clear separation of concerns:

```
┌─────────────────┐
│   Frontend      │  React + TypeScript + Vite
│   (Port 5173)   │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│   API Gateway   │  FastAPI
│   (Port 8000)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│ Auth  │ │  Fleet    │
│Service│ │  Service  │
└───────┘ └───────────┘
         │
┌────────▼────────┐
│   PostgreSQL    │
│   (Port 5432)   │
└─────────────────┘
```

### Key Components

- **API Gateway**: FastAPI application that routes requests to appropriate services
- **Authentication Service**: Handles user authentication, authorization, and profile management
- **Fleet Service**: Manages bikes, batteries, rentals, maintenance, and financial transactions
- **Frontend**: React-based application with role-based UI

## Tech Stack

### Backend

- **Python 3.12**
- **FastAPI**: Modern, fast web framework for building APIs
- **SQLAlchemy**: ORM for database operations
- **Alembic**: Database migration tool
- **PostgreSQL 15**: Relational database
- **Pydantic**: Data validation using Python type annotations
- **python-jose**: JWT token handling
- **pytest**: Testing framework

### Frontend

- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **React Router**: Client-side routing
- **TanStack Query**: Data fetching and caching
- **Axios**: HTTP client
- **Tailwind CSS**: Utility-first CSS framework
- **jsPDF**: PDF generation for reports

### Infrastructure

- **Docker & Docker Compose**: Containerization and orchestration
- **PostgreSQL**: Database server

## Prerequisites

Before you begin, ensure you have the following installed:

- **Docker** (version 20.10 or later)
- **Docker Compose** (version 2.0 or later)
- **Git**

For local development (without Docker):

- **Python 3.12+**
- **Node.js 20+** and npm
- **PostgreSQL 15+**

## Installation

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ebike_fleet_app
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env  # If .env.example exists, or create .env manually
   ```

3. **Configure environment variables**
   Edit `.env` file with your configuration (see [Configuration](#configuration) section)

4. **Start the application**
   ```bash
   docker-compose up --build
   ```

   This will:
   - Build the API Docker image
   - Start PostgreSQL database
   - Start the API server
   - Start the frontend development server
   - Run database migrations automatically

5. **Access the application**
   - Frontend: http://localhost:5173
   - API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

### Local Development Setup

#### Backend Setup

1. **Create a virtual environment**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up PostgreSQL database**
   ```bash
   # Create database
   createdb ebike_db
   ```

4. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ebike_db
   JWT_SECRET=your-secret-key-here-change-in-production
   JWT_ALGORITHM=HS256
   ADMIN_EMAILS_CSV=
   ```

5. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

6. **Start the API server**
   ```bash
   uvicorn api_gateway.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at http://localhost:5173

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT token signing | Yes | - |
| `JWT_ALGORITHM` | Algorithm for JWT tokens | Yes | `HS256` |
| `ADMIN_EMAILS_CSV` | Comma-separated list of admin emails (optional) | No | `""` |

### Example `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/ebike_db
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
JWT_ALGORITHM=HS256
ADMIN_EMAILS_CSV=admin@example.com,superadmin@example.com
```

### Frontend Environment Variables

The frontend uses Vite environment variables. For development, configure:

- `VITE_API_PROXY_TARGET`: API server URL (default: `http://localhost:8000`)

In Docker, this is automatically set to `http://api:8000`.

## Running the Application

### Using Docker Compose

**Start all services:**
```bash
docker-compose up
```

**Start in detached mode:**
```bash
docker-compose up -d
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop all services:**
```bash
docker-compose down
```

**Stop and remove volumes (⚠️ deletes database data):**
```bash
docker-compose down -v
```

**Rebuild containers:**
```bash
docker-compose up --build
```

### Individual Services

**Start only database:**
```bash
docker-compose up db
```

**Start only API:**
```bash
docker-compose up api
```

**Start only frontend:**
```bash
docker-compose up frontend
```

## API Documentation

### Interactive API Documentation

Once the API is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### API Endpoints Overview

#### Authentication (`/auth`)
- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get access token
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout and invalidate refresh token
- `GET /auth/me/profile` - Get current user's profile
- `PUT /auth/me/profile` - Update current user's profile
- `POST /auth/bootstrap-admin` - Promote user to admin (if no admins exist)
- `PUT /auth/users/{user_id}/role` - Set user role (admin only)
- `PUT /auth/users/by-email/{email}/role` - Set user role by email (admin only)

#### Fleet Management (`/fleet`)

**Bikes:**
- `POST /fleet/bikes` - Create a bike (admin only)
- `GET /fleet/bikes` - List bikes (filtered by role)
- `GET /fleet/bikes/{bike_id}` - Get bike details
- `PUT /fleet/bikes/{bike_id}` - Update bike (admin only)
- `DELETE /fleet/bikes/{bike_id}` - Delete bike (admin only)
- `POST /fleet/bikes/{bike_id}/assign-profile/{profile_id}` - Assign bike to driver (admin only)
- `POST /fleet/bikes/{bike_id}/unassign-profile` - Unassign bike (admin only)

**Batteries:**
- `POST /fleet/batteries` - Create a battery (admin only)
- `GET /fleet/batteries` - List batteries (filtered by role)
- `GET /fleet/batteries/{battery_id}` - Get battery details
- `PUT /fleet/batteries/{battery_id}` - Update battery (admin only)
- `DELETE /fleet/batteries/{battery_id}` - Delete battery (admin only)
- `POST /fleet/bikes/{bike_id}/assign-battery/{battery_id}` - Assign battery to bike (admin only)
- `POST /fleet/bikes/{bike_id}/unassign-battery/{battery_id}` - Unassign battery (admin only)
- `GET /fleet/me/bikes` - Get current user's bikes with batteries

**Rentals:**
- `POST /fleet/rentals` - Create a rental (admin only)
- `GET /fleet/rentals` - List rentals (filtered by role)
- `GET /fleet/rentals/{rental_id}` - Get rental details
- `PUT /fleet/rentals/{rental_id}` - Update rental (admin only)
- `DELETE /fleet/rentals/{rental_id}` - Delete rental (admin only)

**Maintenance:**
- `POST /fleet/maintenance` - Create maintenance record (admin only)
- `GET /fleet/maintenance` - List maintenance records (admin only)
- `GET /fleet/maintenance/{record_id}` - Get maintenance record (admin only)
- `PUT /fleet/maintenance/{record_id}` - Update maintenance record (admin only)
- `DELETE /fleet/maintenance/{record_id}` - Delete maintenance record (admin only)

**Financial Transactions:**
- `POST /fleet/transactions` - Create transaction (admin only)
- `GET /fleet/transactions` - List transactions (admin only)
- `GET /fleet/transactions/{transaction_id}` - Get transaction (admin only)
- `PUT /fleet/transactions/{transaction_id}` - Update transaction (admin only)
- `DELETE /fleet/transactions/{transaction_id}` - Delete transaction (admin only)

**Analytics & Settings:**
- `GET /fleet/analytics/financial` - Get financial analytics (admin only)
- `GET /fleet/settings/currency` - Get currency setting (admin only)
- `PUT /fleet/settings/currency` - Update currency setting (admin only)
- `POST /fleet/exchange-rates/refresh` - Refresh exchange rates (admin only)
- `GET /fleet/exchange-rates/convert` - Convert currency amount (admin only)

**Drivers:**
- `GET /fleet/drivers` - List drivers (admin only)
- `POST /fleet/drivers` - Create driver (admin only)

### Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login**: Send credentials to `/auth/login` to receive an access token
2. **Access Token**: Include in `Authorization` header: `Bearer <access_token>`
3. **Refresh Token**: Stored in HTTP-only cookie, used to refresh access token
4. **Token Expiration**: Access tokens expire; use refresh endpoint to get new tokens

Example:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

## Project Structure

```
ebike_fleet_app/
├── alembic/                 # Database migrations
│   ├── versions/           # Migration scripts
│   └── env.py              # Alembic environment configuration
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── auth/       # Authentication module
│   │   │   ├── shell/      # Main application shell
│   │   │   └── users/      # User-related hooks
│   │   └── shared/         # Shared utilities
│   ├── dist/               # Production build output
│   └── package.json
├── src/
│   ├── api_gateway/        # FastAPI application
│   │   ├── core/           # Core configuration
│   │   │   ├── config.py   # Application settings
│   │   │   ├── database.py # Database connection
│   │   │   └── security.py # Security utilities
│   │   ├── routers/        # API route handlers
│   │   │   ├── auth_router.py
│   │   │   └── fleet_router.py
│   │   └── main.py         # FastAPI app entry point
│   └── services/           # Business logic services
│       ├── authentication/ # Authentication service
│       │   ├── models.py   # SQLAlchemy models
│       │   ├── schemas.py  # Pydantic schemas
│       │   └── service.py  # Business logic
│       └── fleet/          # Fleet management service
│           ├── models.py
│           ├── schemas.py
│           ├── service.py
│           ├── notification_service.py
│           └── exchange_rate_service.py
├── tests/                  # Test suite
│   ├── conftest.py         # Pytest configuration
│   ├── test_api.py
│   ├── test_auth_service.py
│   ├── test_fleet_service.py
│   ├── test_security.py
│   └── test_design_patterns.py
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # API Docker image
├── requirements.txt        # Python dependencies
├── pytest.ini              # Pytest configuration
├── alembic.ini             # Alembic configuration
├── start.sh                # API startup script
├── DESIGN_PATTERNS.md      # Design patterns documentation
├── LICENSE                 # Licensing
```

## Design Patterns

This application implements two key design patterns:

### 1. Singleton Pattern

**Location**: `src/services/fleet/notification_service.py`

The `NotificationService` uses the Singleton pattern to ensure only one instance exists throughout the application lifecycle. This provides:
- Centralized notification management
- Resource efficiency
- Consistent state across the application

### 2. Strategy Pattern

**Location**: `src/services/fleet/notification_service.py`

The notification system uses the Strategy pattern to support different notification delivery methods:
- **EmailNotificationStrategy**: Email delivery
- **SMSNotificationStrategy**: SMS delivery
- **InAppNotificationStrategy**: In-app notifications

Benefits:
- Easy to add new notification methods
- Separation of concerns
- Runtime strategy selection
- Testable components

For detailed documentation, see [DESIGN_PATTERNS.md](./DESIGN_PATTERNS.md).

## Testing

### Running Tests 

**Run all tests locally:**
```bash
pytest
```

**Run all tests in docker:**
```bash
docker-compose exec api pytest
```

**Run with coverage:**
```bash
pytest --cov=src --cov-report=html
```

**Run specific test file:**
```bash
pytest tests/test_auth_service.py
```

**Run specific test:**
```bash
pytest tests/test_auth_service.py::test_create_user
```

### Test Structure

- `test_api.py`: API endpoint integration tests
- `test_auth_service.py`: Authentication service unit tests
- `test_fleet_service.py`: Fleet service unit tests
- `test_security.py`: Security and authorization tests
- `test_design_patterns.py`: Design pattern verification tests

### Test Database

Tests use a separate test database configured in `tests/conftest.py`. The test database is created and destroyed for each test session.

## Database Migrations

### Creating Migrations

**Create a new migration:**
```bash
alembic revision --autogenerate -m "description of changes"
```

**Create an empty migration:**
```bash
alembic revision -m "description of changes"
```

### Applying Migrations

**Apply all pending migrations:**
```bash
alembic upgrade head
```

**Apply migrations up to a specific revision:**
```bash
alembic upgrade <revision>
```

**Rollback one migration:**
```bash
alembic downgrade -1
```

**Rollback to a specific revision:**
```bash
alembic downgrade <revision>
```

**View current migration status:**
```bash
alembic current
```

**View migration history:**
```bash
alembic history
```

### Migration Files

Migrations are stored in `alembic/versions/` directory. Each migration file contains:
- Upgrade function: Applies the migration
- Downgrade function: Reverts the migration

## Development

### Code Style

- **Python**: Follow PEP 8 style guide
- **TypeScript/React**: Use ESLint and Prettier (if configured)

### Adding New Features

1. **Backend**:
   - Add models in `src/services/<service>/models.py`
   - Add schemas in `src/services/<service>/schemas.py`
   - Implement business logic in `src/services/<service>/service.py`
   - Add routes in `src/api_gateway/routers/<router>.py`
   - Create database migration if needed

2. **Frontend**:
   - Add components in `frontend/src/modules/`
   - Add API calls in `frontend/src/shared/api.ts`
   - Add routes in `frontend/src/main.tsx`

### Database Schema Changes

1. Modify models in `src/services/*/models.py`
2. Create migration: `alembic revision --autogenerate -m "description"`
3. Review and edit migration file if needed
4. Apply migration: `alembic upgrade head`
5. Update schemas if needed

### Debugging

**Backend:**
- API logs are printed to console
- Use FastAPI's interactive docs at `/docs` for testing endpoints
- Set breakpoints in your IDE

**Frontend:**
- Use browser DevTools
- React DevTools extension recommended
- Check browser console for errors

## Deployment

### Production Considerations

1. **Environment Variables**:
   - Use strong, unique `JWT_SECRET`
   - Use secure database credentials
   - Set `JWT_ALGORITHM` appropriately

2. **Database**:
   - Use managed PostgreSQL service
   - Enable backups
   - Configure connection pooling

3. **Security**:
   - Enable HTTPS
   - Set secure cookie flags (`secure=True`, `samesite="strict"`)
   - Implement rate limiting
   - Add CORS configuration for production domains

4. **Frontend Build**:
   ```bash
   cd frontend
   npm run build
   ```
   Serve `frontend/dist` with a web server (nginx, Apache, etc.)

5. **Docker Production**:
   - Use multi-stage builds
   - Don't use `--reload` flag in production
   - Use environment-specific docker-compose files
   - Set up proper logging

### Example Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  api:
    build: .
    command: uvicorn api_gateway.main:app --host 0.0.0.0 --port 8000
    env_file:
      - .env.prod
    depends_on:
      - db
    restart: always

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    depends_on:
      - api
    restart: always

volumes:
  postgres_data:
```

## Troubleshooting

### Common Issues

**Database connection errors:**
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check network connectivity between containers

**Migration errors:**
- Ensure database is accessible
- Check migration files for syntax errors
- Verify Alembic configuration

**Frontend can't connect to API:**
- Check `VITE_API_PROXY_TARGET` environment variable
- Verify API is running on correct port
- Check CORS configuration

**Authentication issues:**
- Verify `JWT_SECRET` is set
- Check token expiration
- Ensure refresh token cookie is being sent

