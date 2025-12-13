import { InternalServerErrorException } from '@nestjs/common';

/**
 * Handles errors by either passing through allowed error types or converting others to InternalServerErrorException
 * @param error - The error object to handle
 * @param allowedErrorTypes - Array of error constructors that should be passed through
 * @param errorMessage - Custom error message for the InternalServerErrorException
 * @param logFunction - (Optional) A function to log the error. If provided, it will be executed before throwing the exception.
 * @returns Never returns - always throws an error
 * @throws The original error if it's an allowed type, or an InternalServerErrorException
 */
export function handleError(
  error: unknown,
  allowedErrorTypes: Array<new (...args: any[]) => Error>,
  errorMessage = 'An unexpected error occurred',
  logFunction?: () => void,
): never {
  // Check if the error is one of the allowed types
  if (allowedErrorTypes.some((errorType) => error instanceof errorType)) {
    throw error;
  }

  // Call the log function if provided
  if (logFunction) {
    logFunction();
  }

  throw new InternalServerErrorException(errorMessage);
}
