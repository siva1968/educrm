#!/usr/bin/env node

/**
 * Generate complete docker-compose.yml with all 54 microservices
 */

const fs = require('fs');
const path = require('path');

// All 54 services with their details
const services = [
  // Foundation & AI Services (4000-4013)
  { name: 'graphql-gateway', port: 4000, envPrefix: 'GRAPHQL_GATEWAY' },
  { name: 'nlp-service', port: 4001, envPrefix: 'NLP_SERVICE' },
  { name: 'computer-vision-service', port: 4002, envPrefix: 'COMPUTER_VISION_SERVICE' },
  { name: 'prediction-engine', port: 4003, envPrefix: 'PREDICTION_ENGINE' },
  { name: 'payment-gateway', port: 4004, envPrefix: 'PAYMENT_GATEWAY' },
  { name: 'communication-service', port: 4005, envPrefix: 'COMMUNICATION_SERVICE' },
  { name: 'sso-service', port: 4006, envPrefix: 'SSO_SERVICE' },
  { name: 'mobile-api', port: 4007, envPrefix: 'MOBILE_API' },
  { name: 'analytics-service', port: 4010, envPrefix: 'ANALYTICS_SERVICE' },
  { name: 'workflow-engine', port: 4013, envPrefix: 'WORKFLOW_ENGINE' },

  // Student Management Services (4100-4105)
  { name: 'student-information-service', port: 4100, envPrefix: 'SIS' },
  { name: 'attendance-management-service', port: 4101, envPrefix: 'ATTENDANCE' },
  { name: 'student-gatepass-service', port: 4102, envPrefix: 'GATEPASS' },
  { name: 'learner-profile-service', port: 4103, envPrefix: 'LEARNER_PROFILE' },
  { name: 'login-statistics-service', port: 4104, envPrefix: 'LOGIN_STATS' },
  { name: 'achievement-tracking-service', port: 4105, envPrefix: 'ACHIEVEMENT' },

  // Academic Management Services (4110-4117)
  { name: 'timetable-management-service', port: 4110, envPrefix: 'TIMETABLE' },
  { name: 'gradebook-service', port: 4111, envPrefix: 'GRADEBOOK' },
  { name: 'examination-management-service', port: 4112, envPrefix: 'EXAMINATION' },
  { name: 'assignment-management-service', port: 4113, envPrefix: 'ASSIGNMENT' },
  { name: 'subject-management-service', port: 4114, envPrefix: 'SUBJECT' },
  { name: 'lms-service', port: 4115, envPrefix: 'LMS' },
  { name: 'teaching-plan-service', port: 4116, envPrefix: 'TEACHING_PLAN' },
  { name: 'online-classes-service', port: 4117, envPrefix: 'ONLINE_CLASSES' },

  // Content & Resources Services (4120-4122)
  { name: 'content-management-service', port: 4120, envPrefix: 'CONTENT_MANAGEMENT' },
  { name: 'library-service', port: 4121, envPrefix: 'LIBRARY' },
  { name: 'certificate-service', port: 4122, envPrefix: 'CERTIFICATE' },

  // HR & Administration Services (4130-4134)
  { name: 'hr-management-service', port: 4130, envPrefix: 'HR_MANAGEMENT' },
  { name: 'payroll-management-service', port: 4131, envPrefix: 'PAYROLL_MANAGEMENT' },
  { name: 'leave-management-service', port: 4132, envPrefix: 'LEAVE_MANAGEMENT' },
  { name: 'performance-management-service', port: 4133, envPrefix: 'PERFORMANCE_MANAGEMENT' },
  { name: 'visitor-management-service', port: 4134, envPrefix: 'VISITOR_MANAGEMENT' },

  // Finance Services (4140-4142)
  { name: 'fee-management-service', port: 4140, envPrefix: 'FEE_MANAGEMENT' },
  { name: 'collections-service', port: 4141, envPrefix: 'COLLECTIONS' },
  { name: 'financial-accounting-service', port: 4142, envPrefix: 'FINANCIAL_ACCOUNTING' },

  // Transport & Facilities Services (4150-4152)
  { name: 'fleet-management-service', port: 4150, envPrefix: 'FLEET_MANAGEMENT' },
  { name: 'transport-safety-service', port: 4151, envPrefix: 'TRANSPORT_SAFETY' },
  { name: 'vehicle-maintenance-service', port: 4152, envPrefix: 'VEHICLE_MAINTENANCE' },

  // Inventory & Operations Services (4160-4161)
  { name: 'inventory-service', port: 4160, envPrefix: 'INVENTORY' },
  { name: 'dynamic-forms-service', port: 4161, envPrefix: 'DYNAMIC_FORMS' },

  // CRM & Admissions Services (4170-4174)
  { name: 'lead-management-service', port: 4170, envPrefix: 'LEAD_MANAGEMENT' },
  { name: 'admissions-service', port: 4171, envPrefix: 'ADMISSIONS' },
  { name: 'crm-service', port: 4172, envPrefix: 'CRM' },
  { name: 'alumni-service', port: 4173, envPrefix: 'ALUMNI' },
  { name: 'ecommerce-service', port: 4174, envPrefix: 'ECOMMERCE' },

  // Specialized Services (4180-4185)
  { name: 'eca-sports-service', port: 4180, envPrefix: 'ECA_SPORTS' },
  { name: 'preschool-service', port: 4181, envPrefix: 'PRESCHOOL' },
  { name: 'school-drive-service', port: 4182, envPrefix: 'SCHOOL_DRIVE' },
  { name: 'concern-management-service', port: 4183, envPrefix: 'CONCERN_MANAGEMENT' },
  { name: 'sqaa-service', port: 4184, envPrefix: 'SQAA' },
  { name: 'naac-nirf-service', port: 4185, envPrefix: 'NAAC_NIRF' }
];

const generateServiceDefinition = (service) => {
  return `  ${service.name}:
    build:
      context: ./backend/services/${service.name}
      dockerfile: Dockerfile
    container_name: ${service.name}
    environment:
      - NODE_ENV=\${NODE_ENV:-production}
      - ${service.envPrefix}_PORT=${service.port}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=\${DB_NAME:-educrm}
      - DB_USER=\${DB_USER:-postgres}
      - DB_PASSWORD=\${DB_PASSWORD:-postgres}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=\${JWT_SECRET}
      - CACHE_ENABLED=true
      - RATE_LIMIT_ENABLED=true
    ports:
      - "${service.port}:${service.port}"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - educrm-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:${service.port}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
`;
};

const dockerComposeContent = `version: '3.8'

services:
  # =========================================
  # INFRASTRUCTURE SERVICES
  # =========================================

  postgres:
    image: postgres:15-alpine
    container_name: educrm-postgres
    environment:
      POSTGRES_DB: \${DB_NAME:-educrm}
      POSTGRES_USER: \${DB_USER:-postgres}
      POSTGRES_PASSWORD: \${DB_PASSWORD:-postgres}
      POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=en_US.UTF-8 --lc-ctype=en_US.UTF-8"
    ports:
      - "\${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/migrations:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${DB_USER:-postgres}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - educrm-network

  redis:
    image: redis:7-alpine
    container_name: educrm-redis
    command: redis-server --appendonly yes
    ports:
      - "\${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - educrm-network

  prometheus:
    image: prom/prometheus:latest
    container_name: educrm-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/rules:/etc/prometheus/rules
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - educrm-network

  grafana:
    image: grafana/grafana:latest
    container_name: educrm-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - educrm-network

  # =========================================
  # MICROSERVICES (54 SERVICES)
  # =========================================

${services.map(generateServiceDefinition).join('\n')}

  # =========================================
  # NGINX REVERSE PROXY
  # =========================================

  nginx:
    image: nginx:alpine
    container_name: educrm-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - graphql-gateway
      - student-information-service
    networks:
      - educrm-network
    restart: unless-stopped

# =========================================
# VOLUMES
# =========================================

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local

# =========================================
# NETWORKS
# =========================================

networks:
  educrm-network:
    driver: bridge
`;

// Write the file
const outputPath = path.join(__dirname, '../../../docker-compose-production.yml');
fs.writeFileSync(outputPath, dockerComposeContent);

console.log('');
console.log('✅ Generated docker-compose-production.yml');
console.log(`📁 Location: ${outputPath}`);
console.log(`📦 Services: ${services.length} microservices`);
console.log('');
console.log('Usage:');
console.log('  docker-compose -f docker-compose-production.yml up -d');
console.log('  docker-compose -f docker-compose-production.yml ps');
console.log('  docker-compose -f docker-compose-production.yml down');
console.log('');
