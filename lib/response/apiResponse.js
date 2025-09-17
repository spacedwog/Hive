class ApiResponse {
  static success(message, data = {}) {
    return {
      success: true,
      message: message,
      data: data,
      timestamp: Date.now()
    };
  }

  static error(code, error, details = null) {
    return {
      success: false,
      error: {
        code: code,
        message: error,
        details: details
      },
      timestamp: Date.now()
    };
  }
}

export default ApiResponse;