import React from 'react';

const GptNavigation = ({ currentStep, onStepClick }) => {
  const handleClick = (stepIndex) => {
    if (stepIndex <= currentStep) {
      onStepClick(stepIndex);
    }
  };

  return (
    <ul className='gpt-sidebar flex xl:flex-col gap-0.5 xl:mx-0 xl:mb-0 mb-3 max-md:gap-x-1'>
      <li className={`text-font-14 relative rounded-custom py-[10px] px-[14px] max-md:py-[6px] max-md:px-[14px] transition-all duration-150 ease-in-out text-left  cursor-not-allowed ${currentStep === 0 ? 'active  text-white bg-b2' : 'text-b4 bg-b12'}`} onClick={() => handleClick(0)}>Overview</li>
      <li className={`text-font-14 relative rounded-custom py-[10px] px-[14px] max-md:py-[6px] max-md:px-[14px] transition-all duration-150 ease-in-out text-left xl:mt-1 cursor-not-allowed ${currentStep === 1 ? 'active  text-white bg-b2' : 'text-b4 bg-b12'}`} onClick={() => handleClick(1)}>Model</li>
      <li className={`text-font-14 relative rounded-custom py-[10px] px-[14px] max-md:py-[6px] max-md:px-[14px] transition-all duration-150 ease-in-out text-left xl:mt-1 cursor-not-allowed ${currentStep === 2 ? 'active  text-white bg-b2' : 'text-b4 bg-b12'}`} onClick={() => handleClick(2)}>Docs</li>
    </ul>
  );
};

export default GptNavigation;