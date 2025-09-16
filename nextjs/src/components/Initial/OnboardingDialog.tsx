'use client';
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { OnboardingUtils } from '@/utils/onboarding';
import DialogFooter from './DialogFooter';
import WeamLogo from '../Shared/WeamLogo';
import Close from '@/icons/Close';
import { onboardingSteps } from './OnboardingSteps';

/**
 * OnboardingDialog component
 * Shows onboarding steps to new users
 * 
 * Behavior:
 * - Appears automatically after 2 seconds for new users (when onboard: true in database)
 * - Once closed/skipped/finished, never appears again (updates onboard: false in database)
 * - Cannot be closed by clicking outside or pressing Escape
 * - Persists across all devices and sessions for the same user account
 */
const OnboardingDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const totalSteps = onboardingSteps.length;

  useEffect(() => {
    if (OnboardingUtils.shouldShowOnboarding()) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const closeDialog = async () => {
    try {
      setIsUpdating(true);
      await OnboardingUtils.markOnboardingAsSeen();
      setIsOpen(false);
    } catch (error) {
      // Still close the dialog even if database update fails
      setIsOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await closeDialog();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const StepContent = onboardingSteps[currentStep];

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="lg:max-w-[900px] overflow-hidden md:max-w-[700px] max-w-[calc(100%-30px)] py-7 border-none bg-[linear-gradient(115deg,#E7F1FF,#FFFFFF)]"
        showCloseButton={false}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className="rounded-t-10 px-[30px] pb-5">
          <DialogTitle className="flex justify-between items-center z-10">
            <WeamLogo width={125} height={50} className={'w-[75px] h-auto'} />
            <button 
              onClick={closeDialog} 
              className="focus:outline-none"
              disabled={isUpdating}
            >
              <Close width={18} height={18} className="w-4 h-auto fill-black" />
            </button>
          </DialogTitle>
        </DialogHeader>
        <div className="px-8 py-4 max-md:h-[calc(100vh-300px)] overflow-y-auto">
          <StepContent />
        </div>
        <DialogFooter
          totalSteps={totalSteps}
          currentStep={currentStep}
          onSkip={closeDialog}
          onNext={handleNext}
          onPrevious={handlePrevious}
          isUpdating={isUpdating}
        />
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingDialog;
