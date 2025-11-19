const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const AzureAdOAuth2Strategy = require('passport-azure-ad').OIDCStrategy;
const OAuth2Strategy = require('passport-oauth2');
const SamlStrategy = require('passport-saml').Strategy;
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * SSO Service
 * Handles Single Sign-On with Google, Microsoft, OAuth 2.0, and SAML 2.0
 */
class SSOService {
  constructor() {
    this.strategies = {
      google: false,
      microsoft: false,
      oauth2: false,
      saml: false
    };

    this.initialize();
  }

  /**
   * Initialize SSO strategies
   */
  initialize() {
    // Initialize Google OAuth 2.0
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      this.initializeGoogleStrategy();
      this.strategies.google = true;
    }

    // Initialize Microsoft Azure AD
    if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
      this.initializeMicrosoftStrategy();
      this.strategies.microsoft = true;
    }

    // Initialize generic OAuth 2.0
    if (process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET) {
      this.initializeOAuth2Strategy();
      this.strategies.oauth2 = true;
    }

    // Initialize SAML 2.0
    if (process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER) {
      this.initializeSAMLStrategy();
      this.strategies.saml = true;
    }

    console.log('✓ SSO Service initialized');
    console.log('  Enabled strategies:', Object.entries(this.strategies)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name)
      .join(', ') || 'none');
  }

  // =============================================
  // GOOGLE OAUTH 2.0
  // =============================================

  /**
   * Initialize Google OAuth 2.0 strategy
   */
  initializeGoogleStrategy() {
    passport.use('google', new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SSO_BASE_URL}/api/v1/sso/google/callback`,
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        const userInfo = {
          provider: 'google',
          providerId: profile.id,
          email: profile.emails[0].value,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          displayName: profile.displayName,
          photo: profile.photos[0]?.value,
          accessToken,
          refreshToken
        };

        return done(null, userInfo);
      } catch (error) {
        return done(error, null);
      }
    }));

    console.log('  ✓ Google OAuth 2.0 strategy configured');
  }

  /**
   * Initiate Google OAuth flow
   */
  initiateGoogleAuth() {
    if (!this.strategies.google) {
      throw new Error('Google OAuth is not configured');
    }

    return passport.authenticate('google', {
      scope: ['profile', 'email'],
      accessType: 'offline',
      prompt: 'consent'
    });
  }

  // =============================================
  // MICROSOFT AZURE AD
  // =============================================

  /**
   * Initialize Microsoft Azure AD strategy
   */
  initializeMicrosoftStrategy() {
    passport.use('microsoft', new AzureAdOAuth2Strategy({
      identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: `${process.env.SSO_BASE_URL}/api/v1/sso/microsoft/callback`,
      allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
      scope: ['profile', 'email', 'openid'],
      passReqToCallback: false,
      validateIssuer: true,
      loggingLevel: 'error'
    }, async (iss, sub, profile, accessToken, refreshToken, done) => {
      try {
        const userInfo = {
          provider: 'microsoft',
          providerId: profile.oid,
          email: profile.upn || profile.email,
          firstName: profile.given_name,
          lastName: profile.family_name,
          displayName: profile.name,
          accessToken,
          refreshToken
        };

        return done(null, userInfo);
      } catch (error) {
        return done(error, null);
      }
    }));

    console.log('  ✓ Microsoft Azure AD strategy configured');
  }

  /**
   * Initiate Microsoft OAuth flow
   */
  initiateMicrosoftAuth() {
    if (!this.strategies.microsoft) {
      throw new Error('Microsoft Azure AD is not configured');
    }

    return passport.authenticate('microsoft', {
      scope: ['profile', 'email', 'openid']
    });
  }

  // =============================================
  // GENERIC OAUTH 2.0
  // =============================================

  /**
   * Initialize generic OAuth 2.0 strategy
   */
  initializeOAuth2Strategy() {
    passport.use('oauth2', new OAuth2Strategy({
      authorizationURL: process.env.OAUTH2_AUTHORIZATION_URL,
      tokenURL: process.env.OAUTH2_TOKEN_URL,
      clientID: process.env.OAUTH2_CLIENT_ID,
      clientSecret: process.env.OAUTH2_CLIENT_SECRET,
      callbackURL: `${process.env.SSO_BASE_URL}/api/v1/sso/oauth2/callback`,
      scope: ['openid', 'profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Fetch user info from userinfo endpoint
        const userInfoResponse = await axios.get(process.env.OAUTH2_USERINFO_URL, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        const userInfo = {
          provider: 'oauth2',
          providerId: userInfoResponse.data.sub,
          email: userInfoResponse.data.email,
          firstName: userInfoResponse.data.given_name,
          lastName: userInfoResponse.data.family_name,
          displayName: userInfoResponse.data.name,
          accessToken,
          refreshToken
        };

        return done(null, userInfo);
      } catch (error) {
        return done(error, null);
      }
    }));

    console.log('  ✓ Generic OAuth 2.0 strategy configured');
  }

  /**
   * Initiate OAuth 2.0 flow
   */
  initiateOAuth2Auth() {
    if (!this.strategies.oauth2) {
      throw new Error('OAuth 2.0 is not configured');
    }

    return passport.authenticate('oauth2');
  }

  // =============================================
  // SAML 2.0
  // =============================================

  /**
   * Initialize SAML 2.0 strategy
   */
  initializeSAMLStrategy() {
    passport.use('saml', new SamlStrategy({
      entryPoint: process.env.SAML_ENTRY_POINT,
      issuer: process.env.SAML_ISSUER,
      callbackUrl: `${process.env.SSO_BASE_URL}/api/v1/sso/saml/callback`,
      cert: process.env.SAML_CERT,
      identifierFormat: process.env.SAML_IDENTIFIER_FORMAT || 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'
    }, async (profile, done) => {
      try {
        const userInfo = {
          provider: 'saml',
          providerId: profile.nameID,
          email: profile.email || profile.nameID,
          firstName: profile.firstName || profile.givenName,
          lastName: profile.lastName || profile.surname,
          displayName: profile.displayName || profile.name,
          attributes: profile
        };

        return done(null, userInfo);
      } catch (error) {
        return done(error, null);
      }
    }));

    console.log('  ✓ SAML 2.0 strategy configured');
  }

  /**
   * Initiate SAML flow
   */
  initiateSAMLAuth() {
    if (!this.strategies.saml) {
      throw new Error('SAML 2.0 is not configured');
    }

    return passport.authenticate('saml');
  }

  // =============================================
  // USER MANAGEMENT
  // =============================================

  /**
   * Find or create user from SSO profile
   * @param {Object} ssoProfile - SSO user profile
   */
  async findOrCreateUser(ssoProfile) {
    // TODO: Implement database queries
    // This is a placeholder implementation

    // Check if user exists by email
    const existingUser = null; // await db.query('SELECT * FROM users WHERE email = $1', [ssoProfile.email]);

    if (existingUser) {
      // Update SSO information
      return {
        userId: existingUser.id,
        email: existingUser.email,
        role: existingUser.role,
        isNewUser: false
      };
    }

    // Create new user
    const newUser = {
      userId: uuidv4(),
      email: ssoProfile.email,
      firstName: ssoProfile.firstName,
      lastName: ssoProfile.lastName,
      displayName: ssoProfile.displayName,
      provider: ssoProfile.provider,
      providerId: ssoProfile.providerId,
      isNewUser: true,
      createdAt: new Date().toISOString()
    };

    // TODO: Save to database
    // await db.query('INSERT INTO users ...', [newUser]);

    return newUser;
  }

  /**
   * Link SSO account to existing user
   */
  async linkSSOAccount(userId, ssoProfile) {
    // TODO: Implement database update
    return {
      userId,
      provider: ssoProfile.provider,
      providerId: ssoProfile.providerId,
      linkedAt: new Date().toISOString()
    };
  }

  /**
   * Unlink SSO account
   */
  async unlinkSSOAccount(userId, provider) {
    // TODO: Implement database update
    return {
      userId,
      provider,
      unlinkedAt: new Date().toISOString()
    };
  }

  // =============================================
  // TOKEN MANAGEMENT
  // =============================================

  /**
   * Generate JWT token for authenticated user
   * @param {Object} user - User object
   */
  generateJWT(user) {
    const payload = {
      userId: user.userId,
      email: user.email,
      role: user.role || 'student',
      provider: user.provider
    };

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * Verify JWT token
   */
  verifyJWT(token) {
    const secret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(provider, refreshToken) {
    switch (provider) {
      case 'google':
        return await this.refreshGoogleToken(refreshToken);
      case 'microsoft':
        return await this.refreshMicrosoftToken(refreshToken);
      default:
        throw new Error(`Token refresh not supported for provider: ${provider}`);
    }
  }

  /**
   * Refresh Google access token
   */
  async refreshGoogleToken(refreshToken) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      throw new Error(`Failed to refresh Google token: ${error.message}`);
    }
  }

  /**
   * Refresh Microsoft access token
   */
  async refreshMicrosoftToken(refreshToken) {
    try {
      const response = await axios.post(
        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID,
          client_secret: process.env.AZURE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in
      };
    } catch (error) {
      throw new Error(`Failed to refresh Microsoft token: ${error.message}`);
    }
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Get enabled strategies
   */
  getEnabledStrategies() {
    return Object.entries(this.strategies)
      .filter(([_, enabled]) => enabled)
      .map(([name]) => name);
  }

  /**
   * Get strategy status
   */
  getStrategyStatus() {
    return {
      google: {
        enabled: this.strategies.google,
        configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      },
      microsoft: {
        enabled: this.strategies.microsoft,
        configured: !!(process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET)
      },
      oauth2: {
        enabled: this.strategies.oauth2,
        configured: !!(process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_CLIENT_SECRET)
      },
      saml: {
        enabled: this.strategies.saml,
        configured: !!(process.env.SAML_ENTRY_POINT && process.env.SAML_ISSUER)
      }
    };
  }

  /**
   * Get SSO statistics
   */
  async getStatistics() {
    // TODO: Implement database queries
    return {
      totalUsers: 0,
      usersByProvider: {
        google: 0,
        microsoft: 0,
        oauth2: 0,
        saml: 0
      },
      loginsLast24h: 0,
      loginsLast7d: 0,
      loginsLast30d: 0
    };
  }
}

module.exports = new SSOService();
