-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);

-- Existing accounts before this feature should not be forced through onboarding.
UPDATE "User" SET "onboardingCompletedAt" = CURRENT_TIMESTAMP WHERE "onboardingCompletedAt" IS NULL;
