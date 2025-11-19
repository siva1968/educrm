/**
 * Standard API response helper
 */

class ApiResponse {
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
    });
  }

  static error(res, message = 'Error', statusCode = 500, errors = null) {
    const response = {
      status: 'error',
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static noContent(res, message = 'Operation successful') {
    return res.status(204).json({
      status: 'success',
      message,
    });
  }

  static paginated(res, data, pagination, message = 'Success') {
    return res.status(200).json({
      status: 'success',
      message,
      data,
      pagination: {
        total_count: pagination.totalCount || 0,
        page: pagination.page || 1,
        page_size: pagination.pageSize || 50,
        total_pages: pagination.totalPages || 1,
      },
    });
  }

  static validationError(res, errors) {
    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors,
    });
  }

  static notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      status: 'fail',
      message,
    });
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      status: 'fail',
      message,
    });
  }

  static forbidden(res, message = 'Forbidden') {
    return res.status(403).json({
      status: 'fail',
      message,
    });
  }

  static conflict(res, message = 'Resource already exists') {
    return res.status(409).json({
      status: 'fail',
      message,
    });
  }
}

module.exports = ApiResponse;
