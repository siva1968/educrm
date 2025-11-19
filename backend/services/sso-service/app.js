const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');
const session = require('express-session');
const ssoService = require('./services/sso.service');
const errorHandler = require('../../shared/middleware/errorHandler');

const app = express();
const PORT = process.env.SSO_SERVICE_PORT || 4006;

// =============================================
// MIDDLEWARE
// =============================================

app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// =============================================
// ROUTES
// =============================================

app.get('/', (req, res) => {
  res.json({
    service: 'SSO Integration Service',
    status: 'Running',
    version: '1.0.0',
    providers: ssoService.getStrategyStatus(),
    endpoints: {
      google: '/api/v1/sso/google',
      microsoft: '/api/v1/sso/microsoft',
      oauth2: '/api/v1/sso/oauth2',
      saml: '/api/v1/sso/saml'
    }
  });
});

// Google OAuth routes
app.get('/api/v1/sso/google', (req, res, next) => {
  const auth = ssoService.initiateGoogleAuth();
  auth(req, res, next);
});

app.get('/api/v1/sso/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    const user = await ssoService.findOrCreateUser(req.user);
    const token = ssoService.generateJWT(user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Microsoft OAuth routes
app.get('/api/v1/sso/microsoft', (req, res, next) => {
  const auth = ssoService.initiateMicrosoftAuth();
  auth(req, res, next);
});

app.post('/api/v1/sso/microsoft/callback',
  passport.authenticate('microsoft', { failureRedirect: '/auth/failure' }),
  async (req, res) => {
    const user = await ssoService.findOrCreateUser(req.user);
    const token = ssoService.generateJWT(user);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Health check
app.get('/api/v1/sso/health', (req, res) => {
  res.json({
    service: 'SSO Integration Service',
    status: 'Active',
    version: '1.0.0',
    strategies: ssoService.getEnabledStrategies(),
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

// =============================================
// START SERVER
// =============================================

let server;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`\n🔐 SSO Service running on port ${PORT}`);
    console.log(`   Enabled: ${ssoService.getEnabledStrategies().join(', ') || 'none'}\n`);
  });
}

module.exports = app;
