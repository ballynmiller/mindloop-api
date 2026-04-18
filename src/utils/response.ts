/**
 * Response helper functions for consistent API responses
 */

export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  createdAt: string;
  onboardingCompletedAt: string | null;
}

export interface AuthSuccessResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Create a user response object from user data
 */
export function createUserResponse(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
    onboardingCompletedAt: user.onboardingCompletedAt ? user.onboardingCompletedAt.toISOString() : null,
  };
}

/**
 * Create an authentication success response
 */
export function createAuthSuccessResponse(
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    createdAt: Date;
    onboardingCompletedAt: Date | null;
  },
  accessToken: string,
  refreshToken: string
): AuthSuccessResponse {
  return {
    user: createUserResponse(user),
    accessToken,
    refreshToken,
  };
}

/**
 * Create an error response
 */
export function createErrorResponse(error: string, message: string): ErrorResponse {
  return {
    error,
    message,
  };
}
