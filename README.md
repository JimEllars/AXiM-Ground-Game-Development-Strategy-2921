# AXiM Ground Game MVP

A next-generation canvassing application built for reliability, performance, and exceptional user experience.

## 🎯 Project Overview

AXiM Ground Game is designed to be the most stable and reliable canvassing platform on the market. Our core philosophy prioritizes:

- **Performance**: Lightning-fast load times and smooth interactions
- **Reliability**: Rock-solid offline functionality and data synchronization
- **Battery Efficiency**: Optimized mobile apps that won't drain device batteries
- **User Experience**: Intuitive interfaces for field reps, managers, and admins

## 🏗️ Architecture

### Backend (Node.js/TypeScript)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with PostGIS extension for geospatial operations
- **Authentication**: JWT-based secure authentication
- **API**: RESTful API with comprehensive error handling

### Frontend (React/TypeScript)
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) for professional interface
- **Mapping**: react-map-gl with drawing capabilities
- **State Management**: React Query for server state
- **Routing**: React Router with hash routing

### Database Schema
- **Users**: Multi-role system (Admin, Manager, Rep)
- **Organizations**: Multi-tenant architecture
- **Territories**: Geospatial polygon boundaries
- **Leads**: Contact information with geocoded locations
- **Interactions**: Field activity tracking with offline sync

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- npm or yarn

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd server
   npm install
   ```

2. **Database Setup**
   ```bash
   # Create database
   createdb axim_ground_game
   
   # Enable PostGIS
   psql axim_ground_game -c "CREATE EXTENSION IF NOT EXISTS postgis;"
   
   # Run schema
   psql axim_ground_game < ../database/schema.sql
   ```

3. **Environment Configuration**
   ```bash
   # For development
   cp .env.example .env
   # Edit .env with your database credentials

   # For testing
   cp server/.env.test.example server/.env.test
   # Edit server/.env.test with your test database credentials
   ```

4. **Start Server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Open http://localhost:5173
   - Use demo accounts:
     - Admin: admin@axim.com / password
     - Manager: manager@axim.com / password
     - Rep: rep@axim.com / password

## 📱 Core Features

### Admin/Manager Portal
- **Territory Management**: Draw and assign territories using interactive maps
- **Lead Upload**: CSV import with automatic geocoding
- **Team Oversight**: Dashboard with performance metrics
- **User Management**: Role-based access control

### Field Rep Interface
- **Offline-First**: Complete functionality without internet
- **Territory Download**: Automatic sync of assigned areas and leads
- **Interaction Logging**: Quick disposition capture with notes
- **Battery Optimization**: Smart GPS usage to preserve battery life

## 🗺️ API Endpoints

### Authentication
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get current user profile

### Territories
- `POST /api/territories` - Create territory
- `GET /api/territories` - List territories
- `POST /api/territories/:id/assign` - Assign territory to rep

### Leads
- `POST /api/leads/upload` - Upload CSV leads
- `GET /api/leads` - List leads with filtering

### Field Operations
- `GET /api/reps/me/turf` - Get rep's assigned territory and leads
- `POST /api/interactions` - Submit interaction batch
- `GET /api/reps/me/stats` - Get rep performance statistics

## 🔧 Development

### Code Structure
```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── services/           # API client and utilities
├── common/             # Shared utilities
└── types/              # TypeScript type definitions

server/
├── src/
│   ├── controllers/    # Request handlers
│   ├── routes/         # API route definitions
│   ├── middleware/     # Authentication, validation
│   ├── services/       # Business logic
│   └── config/         # Database and app configuration
```

### Key Technologies
- **Mapping**: MapBox GL JS for high-performance maps
- **Geocoding**: Configurable provider (MapBox, Google, etc.)
- **Geospatial**: PostGIS for efficient spatial queries
- **File Upload**: Multer for CSV processing
- **CSV Parsing**: PapaParse for reliable data import

## 🎨 Design Principles

### Performance First
- Optimized database queries with spatial indexing
- Efficient batch operations for data sync
- Smart caching strategies for offline functionality

### Reliability Focus
- Comprehensive error handling and logging
- Graceful degradation when services are unavailable
- Robust offline data storage and sync

### User Experience
- Intuitive map-based interfaces
- Minimal clicks for common operations
- Clear visual feedback for all actions
- Mobile-optimized responsive design

## 🔒 Security

- JWT-based authentication with secure token handling
- Role-based access control (RBAC)
- SQL injection prevention with parameterized queries
- CORS and security headers configuration
- Environment-based configuration management

## 📊 Future Roadmap

### Phase 2: Competitive Parity
- Route optimization algorithms
- Custom surveys and scripts
- Appointment scheduling
- Gamification features

### Phase 3: Market Leadership
- AI-powered lead scoring
- Team collaboration features
- Advanced analytics dashboard
- Native mobile applications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary software developed for AXiM Ground Game.