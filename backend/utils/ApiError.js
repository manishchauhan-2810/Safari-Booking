class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.details = details;
    this.isOperational = true;
  }
}
export default ApiError;