import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import Step5 from './Step5';

/**
 * Array of onboarding step components
 * Each step is a React component that renders a specific onboarding screen
 */
export const onboardingSteps = [Step1, Step2, Step3, Step4, Step5] as const;

/**
 * Type for the onboarding steps array
 */
export type OnboardingStep = typeof onboardingSteps[number];
