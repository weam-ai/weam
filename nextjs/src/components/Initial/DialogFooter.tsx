'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import Pagination from './Pagination';

const DialogFooter = ({
  totalSteps,
  currentStep,
  onSkip,
  onNext,
  onPrevious,
  isUpdating = false,
}) => {
  return (
    <div className="flex items-center justify-between sm:py-4 py-2 px-6 z-10 max-sm:flex-col max-sm:gap-y-3">
      <Button 
        className="text-font-14 font-bold underline hover:text-b5 text-black" 
        variant="ghost" 
        onClick={onSkip}
        disabled={isUpdating}
      >
        Skip
      </Button>
      <Pagination totalSteps={totalSteps} currentStep={currentStep} />
      <div className="flex space-x-2">
        {currentStep > 0 && (
          <Button 
            className="btn btn-outline-gray" 
            variant="outline" 
            onClick={onPrevious}
            disabled={isUpdating}
          >
            Previous
          </Button>
        )}
        <Button 
          className="btn btn-black" 
          onClick={onNext}
          disabled={isUpdating}
        >
          {currentStep === totalSteps - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default DialogFooter;
