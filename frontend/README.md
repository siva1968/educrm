# EduCRM Frontend

Modern admin dashboard built with Next.js 14, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Query** for data fetching
- **Zustand** for state management
- **NextAuth.js** for authentication
- **Responsive Design** (mobile-first)
- **Dark Mode** support
- **Production-ready** Docker configuration

## 📦 Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Data Fetching**: TanStack Query (React Query)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/       # Dashboard layout group
│   │   │   ├── dashboard/     # Main dashboard
│   │   │   ├── students/      # Student management
│   │   │   ├── attendance/    # Attendance management
│   │   │   ├── fees/          # Fee management
│   │   │   └── grades/        # Grade management
│   │   ├── auth/login/        # Login page
│   │   ├── layout.tsx         # Root layout
│   │   └── providers.tsx      # App providers
│   ├── components/            # React components
│   │   ├── ui/               # shadcn/ui components
│   │   ├── dashboard/        # Dashboard components
│   │   ├── students/         # Student components
│   │   └── layout/           # Layout components
│   ├── lib/                  # Utilities
│   │   ├── api-client.ts     # API client
│   │   └── utils.ts          # Helper functions
│   ├── services/             # API services
│   ├── hooks/                # Custom React hooks
│   ├── store/                # Zustand stores
│   └── types/                # TypeScript types
├── public/                   # Static files
├── Dockerfile               # Docker configuration
└── package.json             # Dependencies

```

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001)

## 🔧 Environment Variables

Create a `.env.local` file with:

```bash
# Application
NEXT_PUBLIC_APP_NAME=EduCRM
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Backend API URLs
NEXT_PUBLIC_STUDENT_SERVICE_URL=http://localhost:4100
NEXT_PUBLIC_ATTENDANCE_SERVICE_URL=http://localhost:4101
NEXT_PUBLIC_FEE_SERVICE_URL=http://localhost:4140
NEXT_PUBLIC_GRADEBOOK_SERVICE_URL=http://localhost:4111

# Authentication
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-key-change-in-production
```

## 🐳 Docker

### Build

```bash
docker build -t educrm-frontend .
```

### Run

```bash
docker run -p 3001:3001 educrm-frontend
```

### Docker Compose

```bash
docker-compose -f docker-compose-production.yml up frontend
```

## 📱 Modules

### Dashboard
- Analytics overview
- Quick stats
- Attendance charts
- Fee collection charts
- Recent activities

### Student Management
- Student list with pagination
- Student details
- Add/Edit/Delete students
- Search and filters
- Export to CSV/PDF

### Attendance Management
- Mark attendance
- Bulk attendance marking
- Attendance reports
- Absence tracking
- Monthly/Weekly views

### Fee Management
- Fee structures
- Invoice generation
- Payment tracking
- Receipt printing
- Overdue notifications

### Grade Management
- Grade entry
- Report cards
- GPA calculation
- Grade analytics
- Performance tracking

## 🔐 Authentication

The app uses NextAuth.js for authentication with JWT tokens.

**Default Login** (Development):
- Email: admin@educrm.com
- Password: admin123

## 🎨 Customization

### Theme

Edit `src/app/globals.css` to customize colors:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  /* ... more variables */
}
```

### Components

All UI components are in `src/components/ui` and can be customized.

## 📊 API Integration

API clients are configured in `src/lib/api-client.ts` for each microservice:

- `studentApi` - Port 4100
- `attendanceApi` - Port 4101
- `feeApi` - Port 4140
- `gradebookApi` - Port 4111
- `timetableApi` - Port 4110

## 🧪 Testing

```bash
# Run tests
npm test

# Coverage
npm run test:coverage
```

## 🏗️ Build

```bash
# Production build
npm run build

# Start production server
npm start
```

## 📈 Performance

- **Server-side rendering** for initial load
- **Code splitting** for optimal bundle size
- **Image optimization** with next/image
- **Lazy loading** for components
- **React Query caching** for API calls

## 🔒 Security

- CSRF protection
- XSS prevention
- Secure headers (Helmet)
- Input validation
- JWT token authentication

## 📝 License

Proprietary - EduCRM Platform

## 👥 Support

For issues and feature requests, contact the development team.

---

**Built with** ❤️ **using Next.js 14**
