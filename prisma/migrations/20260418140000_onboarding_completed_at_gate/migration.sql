-- Null means incomplete; only POST /api/me/onboarding sets this after the user taps Continue.
-- Reverts the blanket backfill from 20260418020736.
UPDATE "User" SET "onboardingCompletedAt" = NULL;
