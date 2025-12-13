/**
 * Database Error Utility
 *
 * Provides utilities for handling database errors
 */

// Define an interface for database errors
export interface DatabaseError {
  code: string;
  errno?: number;
  sqlMessage?: string;
}

/**
 * Type guard function to check if an error is a database error
 *
 * @param error The error to check
 * @returns Whether the error is a database error
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  if (error === null || typeof error !== 'object') {
    return false;
  }
  const potentialDbError = error as Record<string, unknown>;
  const hasCodeProperty = 'code' in potentialDbError;
  const isCodeString = typeof potentialDbError.code === 'string';
  return hasCodeProperty && isCodeString;
}
