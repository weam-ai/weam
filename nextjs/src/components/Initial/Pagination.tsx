'use client';
import React from 'react';

const Pagination = ({ totalSteps, currentStep }) => {
  return (
    <div className="flex justify-center items-center space-x-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === currentStep;
        return (
          <div
            key={index}
            className={`h-[12px] w-[12px] rounded-full ${
              isActive ? 'bg-[#D0C1F9] w-[45px] h-[8px]' : 'bg-[#F0ECFC]'
            }`}
          />
        );
      })}
    </div>
  );
};

export default Pagination;
