class ApiResponse {
  success(message, data = {}) {
    return { success: true, message, data, timestamp: Date.now() };
  }

  error(code, error, details = null) {
    return { success: false, error: { code, message: error, details }, timestamp: Date.now() };
  }
}

export default ApiResponse;