class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = null) {
    const response = {
      success: true,
      message,
    };
    if (data !== null && data !== undefined) {
      response.data = data;
    }
    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Created successfully', data = null) {
    return ApiResponse.success(res, 201, message, data);
  }

  static error(res, statusCode = 500, message = 'Error', errors = []) {
    const response = {
      success: false,
      message,
    };
    if (errors && errors.length > 0) {
      response.errors = errors;
    }
    return res.status(statusCode).json(response);
  }

  static paginated(res, message = 'Success', records = [], pagination = {}) {
    return res.status(200).json({
      success: true,
      message,
      data: records,
      pagination,
    });
  }
}

module.exports = ApiResponse;

