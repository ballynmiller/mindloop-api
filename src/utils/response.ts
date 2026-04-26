export const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  displayName: true,
  isAdmin: true,
  createdAt: true,
  onboardingCompletedAt: true,
} as const;

export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  isAdmin: boolean;
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

export function createUserResponse(user: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: Date;
  onboardingCompletedAt: Date | null;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
    onboardingCompletedAt: user.onboardingCompletedAt ? user.onboardingCompletedAt.toISOString() : null,
  };
}

export function createAuthSuccessResponse(
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    isAdmin: boolean;
    createdAt: Date;
    onboardingCompletedAt: Date | null;
  },
  accessToken: string,
  refreshToken: string,
): AuthSuccessResponse {
  return {
    user: createUserResponse(user),
    accessToken,
    refreshToken,
  };
}

export function createErrorResponse(error: string, message: string): ErrorResponse {
  return {
    error,
    message,
  };
}
