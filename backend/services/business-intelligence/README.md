# Business Intelligence Service

**Phase 3 - Week 1 MVP**

Interactive dashboards, custom reports, and KPI tracking for data-driven decision making.

---

## 🎯 Features Implemented (MVP)

### ✅ Dashboard Management
- Create custom dashboards for different roles (Principal, Teacher, Department, etc.)
- Configure dashboard layouts with widgets
- Real-time data visualization
- Widget-based architecture
- Dashboard templates for different user types

### ✅ Widget System
- Multiple widget types supported:
  - KPI Cards (single metric display)
  - Line Charts (trends over time)
  - Bar Charts (comparisons)
  - Pie Charts (proportions)
  - Tables (detailed data)
  - Progress Bars (goal tracking)
  - Gauges (current vs target)

### ✅ Data Sources
- **Attendance Data**: Attendance rates, present/absent/late counts
- **Grades Data**: Average marks, pass rates, grade distributions
- **Examinations Data**: Exam status (scheduled/ongoing/completed)
- **Assignments Data**: Assignment counts by status
- **Students Data**: Total students, active/inactive counts

### ✅ Caching System
- Intelligent caching for performance
- Configurable TTL (Time To Live)
- Automatic cache invalidation
- Refresh on-demand option

---

## 📊 Database Schema

**Schema**: `analytics`

### Tables Created:
1. `dashboards` - Dashboard configurations
2. `dashboard_widgets` - Individual widgets
3. `reports` - Report definitions
4. `report_executions` - Report generation history
5. `kpi_definitions` - KPI calculations
6. `kpi_values` - Historical KPI data
7. `visualizations` - Reusable charts
8. `cache` - Analytics data cache

**Migration**: `008_create_business_intelligence_schema.sql`

---

## 🚀 API Endpoints

### Dashboard Endpoints

```
GET    /api/v1/bi/health                  - Health check (public)
POST   /api/v1/bi/dashboards              - Create dashboard (admin)
GET    /api/v1/bi/dashboards              - List dashboards
GET    /api/v1/bi/dashboards/:id          - Get dashboard
PUT    /api/v1/bi/dashboards/:id          - Update dashboard (admin)
DELETE /api/v1/bi/dashboards/:id          - Delete dashboard (admin)
GET    /api/v1/bi/dashboards/:id/data     - Get dashboard with widget data
```

---

## 📝 Usage Examples

### Create a Principal Dashboard

```bash
POST /api/v1/bi/dashboards
Authorization: Bearer <token>
Content-Type: application/json

{
  "school_id": "uuid-here",
  "dashboard_name": "Principal Overview",
  "dashboard_type": "principal",
  "description": "Main dashboard for principal",
  "layout": [
    {
      "widget_type": "kpi_card",
      "widget_title": "Total Students",
      "data_source": "students",
      "config": {
        "metric": "total"
      },
      "position": { "x": 0, "y": 0, "w": 3, "h": 2 }
    },
    {
      "widget_type": "kpi_card",
      "widget_title": "Attendance Rate",
      "data_source": "attendance",
      "config": {
        "metric": "attendance_rate",
        "unit": "%"
      },
      "position": { "x": 3, "y": 0, "w": 3, "h": 2 }
    },
    {
      "widget_type": "bar_chart",
      "widget_title": "Class Performance",
      "data_source": "grades",
      "config": {
        "groupBy": "class",
        "metric": "avg_percentage"
      },
      "position": { "x": 0, "y": 2, "w": 6, "h": 4 }
    }
  ],
  "is_default": true
}
```

### Get Dashboard Data

```bash
GET /api/v1/bi/dashboards/:dashboard_id/data?refresh=false
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "dashboard": {
      "dashboard_id": "uuid",
      "dashboard_name": "Principal Overview",
      "dashboard_type": "principal"
    },
    "widgets": [
      {
        "widget_type": "kpi_card",
        "widget_title": "Total Students",
        "data_source": "students",
        "position": { "x": 0, "y": 0, "w": 3, "h": 2 },
        "data": {
          "total": 1250,
          "active": 1200,
          "inactive": 50
        }
      },
      {
        "widget_type": "kpi_card",
        "widget_title": "Attendance Rate",
        "data_source": "attendance",
        "position": { "x": 3, "y": 0, "w": 3, "h": 2 },
        "data": {
          "attendance_rate": 92.5,
          "present": 1110,
          "absent": 90,
          "late": 50
        }
      }
    ],
    "generated_at": "2025-11-19T10:30:00Z"
  }
}
```

---

## 🏗️ Architecture

```
business-intelligence/
├── validators/
│   ├── dashboard.validator.js  - Dashboard validation schemas
│   ├── report.validator.js     - Report validation schemas
│   └── kpi.validator.js         - KPI validation schemas
├── services/
│   └── dashboard.service.js    - Dashboard business logic
├── controllers/
│   └── dashboard.controller.js - HTTP request handlers
├── routes/
│   └── index.js                - Route definitions
├── app.js                      - Express app setup
├── package.json                - Dependencies
└── README.md                   - This file
```

---

## 🔒 Authentication & Authorization

**All routes (except /health) require:**
- Valid JWT token
- School isolation (can only access own school's data)

**Admin-only operations:**
- Create dashboard
- Update dashboard
- Delete dashboard

**All authenticated users can:**
- View dashboards
- Get dashboard data

---

## 📦 Installation

```bash
cd backend/services/business-intelligence
npm install
```

---

## 🚀 Running the Service

```bash
# Development
npm run dev

# Production
npm start
```

**Service runs on port:** `3010` (configurable via `BI_SERVICE_PORT` env var)

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:3010/api/v1/bi/health

# List dashboards (requires auth)
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3010/api/v1/bi/dashboards?school_id=<school-id>"

# Get dashboard data
curl -H "Authorization: Bearer <token>" \
     "http://localhost:3010/api/v1/bi/dashboards/<dashboard-id>/data"
```

---

## 📅 Roadmap

### Week 2 (Next):
- [ ] Report generation service
- [ ] PDF/Excel export functionality
- [ ] Scheduled reports
- [ ] Email delivery

### Week 3:
- [ ] KPI calculation engine
- [ ] KPI tracking and trending
- [ ] Alert triggers based on KPIs

### Week 4:
- [ ] Advanced visualizations
- [ ] Custom report builder UI
- [ ] Performance optimization

---

## 🛠️ Database Setup

**Apply migration:**
```bash
psql -U postgres -d educrm_dev -f backend/database/migrations/008_create_business_intelligence_schema.sql
```

**Verify schema:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'analytics';
```

---

## 📊 Widget Data Sources

### Attendance
- **Data**: Attendance rates, present/absent/late counts
- **Filters**: Date range, class, section
- **Refresh**: 5 minutes (cached)

### Grades
- **Data**: Average marks, pass rates, grade distribution
- **Filters**: Class, subject, assessment type
- **Refresh**: 5 minutes (cached)

### Examinations
- **Data**: Exam counts by status
- **Filters**: Status, date range
- **Refresh**: 5 minutes (cached)

### Assignments
- **Data**: Assignment counts by status
- **Filters**: Status, class, subject
- **Refresh**: 5 minutes (cached)

### Students
- **Data**: Total students, active/inactive counts
- **Filters**: Class, status
- **Refresh**: 15 minutes (cached)

---

## 🔧 Configuration

### Environment Variables

```env
BI_SERVICE_PORT=3010
DATABASE_URL=postgresql://user:password@localhost:5432/educrm_dev
JWT_SECRET=your-secret-key
```

### Cache TTL

Default: 300 seconds (5 minutes)

Can be customized per widget via `refresh_interval` config.

---

## 🐛 Troubleshooting

### Dashboard data not loading
- Check database connection
- Verify migration 008 is applied
- Check Phase 2 data exists (grades, attendance, etc.)
- Clear cache: DELETE FROM analytics.cache

### Widgets showing errors
- Verify data source exists in Phase 2 services
- Check widget configuration is valid
- Review database logs for SQL errors

---

## 📈 Performance

**Optimization strategies:**
- Caching layer for frequently accessed data
- Lazy loading of widget data
- Pagination for large datasets
- Database query optimization
- Index creation for common queries

---

## 🎯 Status

**Implementation**: ✅ Week 1 MVP Complete
**Testing**: ⏸️ Pending (requires migration 008 + Phase 2 data)
**Production**: ❌ Not ready (testing required)

**Next Step**: Apply migration 008 and test dashboard creation/data retrieval

---

**Created**: 2025-11-19
**Service**: Business Intelligence
**Phase**: 3 - Week 1
**Version**: 1.0.0 (MVP)
