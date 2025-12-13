import * as bcrypt from 'bcrypt';

/**
 * Hash a password using bcrypt
 *
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plain text password with a hashed password
 *
 * @param plainPassword Plain text password
 * @param hashedPassword Hashed password
 * @returns True if passwords match, false otherwise
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}
