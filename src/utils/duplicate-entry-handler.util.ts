import { ConflictException } from '@nestjs/common';
import { isDatabaseError } from './database-error.util';

/**
 * Handles database duplicate entry errors by checking database-specific error codes
 * and throwing a standardized `ConflictException`.
 * This function supports PostgreSQL and MySQL error codes.
 * @param error - The error object to check.
 * @param errorMessage - The error message to throw.
 * @param logFunction - (Optional) A function to log a warning message. If provided, it will be executed before throwing the exception.
 * @throws {ConflictException} If the error is a recognized duplicate entry error.
 */
export function handleDuplicateEntryError(
  error: unknown,
  errorMessage: string,
  logFunction?: () => void,
): void {
  // Check if this is a duplicate entry error
  if (
    typeof error === 'object' &&
    error !== null &&
    isDatabaseError(error) &&
    ('code' in error || 'errno' in error) &&
    (error.code === 'ER_DUP_ENTRY' || // MySQL error code
      error.code === '23505' || // PostgreSQL error code
      error.errno === 1062) // MySQL error number
  ) {
    // Log the warning using the provided function if available
    if (logFunction) {
      logFunction();
    }

    throw new ConflictException(errorMessage);
  }
}
