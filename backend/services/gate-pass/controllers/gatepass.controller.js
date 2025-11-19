const gatePassService = require('../services/gatepass.service');
const ApiResponse = require('../../../shared/utils/response');
const {
  gatePassSchema,
  approveGatePassSchema,
  verifyGatePassSchema,
  gateAccessLogSchema,
  visitorSchema,
  gatePassQuerySchema,
} = require('../validators/gatepass.validator');

class GatePassController {
  /**
   * Create gate pass request
   */
  async createGatePass(req, res, next) {
    try {
      const { error, value } = gatePassSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const gatePass = await gatePassService.createGatePass(value, userId);

      return ApiResponse.created(res, gatePass, 'Gate pass created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get gate pass by ID
   */
  async getGatePass(req, res, next) {
    try {
      const { id } = req.params;
      const gatePass = await gatePassService.getGatePassById(id);

      return ApiResponse.success(res, gatePass);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get gate pass by pass number
   */
  async getGatePassByNumber(req, res, next) {
    try {
      const { pass_number } = req.params;
      const gatePass = await gatePassService.getGatePassByNumber(pass_number);

      return ApiResponse.success(res, gatePass);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List gate passes
   */
  async listGatePasses(req, res, next) {
    try {
      const { error, value } = gatePassQuerySchema.validate(req.query);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const result = await gatePassService.listGatePasses(value);

      return ApiResponse.paginated(
        res,
        result.gatePasses,
        result.pagination,
        'Gate passes retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject gate pass
   */
  async approveGatePass(req, res, next) {
    try {
      const { id } = req.params;

      const { error, value } = approveGatePassSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const gatePass = await gatePassService.approveGatePass(id, value, userId);

      return ApiResponse.success(
        res,
        gatePass,
        `Gate pass ${value.approval_status.toLowerCase()} successfully`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify gate pass at gate
   */
  async verifyGatePass(req, res, next) {
    try {
      const { error, value } = verifyGatePassSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const gatePass = await gatePassService.verifyGatePass(value, userId);

      return ApiResponse.success(res, gatePass, 'Gate pass verified successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log gate access
   */
  async logGateAccess(req, res, next) {
    try {
      const { error, value } = gateAccessLogSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const log = await gatePassService.logGateAccess(value, userId);

      return ApiResponse.created(res, log, 'Gate access logged successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Register visitor
   */
  async registerVisitor(req, res, next) {
    try {
      const { error, value } = visitorSchema.validate(req.body);
      if (error) {
        return ApiResponse.validationError(res, error.details.map(d => d.message));
      }

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const visitor = await gatePassService.registerVisitor(value, userId);

      return ApiResponse.created(res, visitor, 'Visitor registered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Checkout visitor
   */
  async checkoutVisitor(req, res, next) {
    try {
      const { id } = req.params;

      const userId = req.user?.userId || '00000000-0000-0000-0000-000000000000';
      const visitor = await gatePassService.checkoutVisitor(id, userId);

      return ApiResponse.success(res, visitor, 'Visitor checked out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get gate access logs
   */
  async getAccessLogs(req, res, next) {
    try {
      const { school_id, student_id, from_date, to_date } = req.query;

      if (!school_id) {
        return ApiResponse.validationError(res, ['school_id is required']);
      }

      const logs = await gatePassService.getAccessLogs(school_id, {
        student_id,
        from_date,
        to_date,
      });

      return ApiResponse.success(res, logs, 'Access logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GatePassController();
