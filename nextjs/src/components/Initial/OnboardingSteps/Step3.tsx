import React from 'react';
import Image from 'next/image';
import { LLMOnboard1, LLMOnboard2, LLMOnboard3, LLMOnboard4 } from '@/icons/OnboardingIcons';
import StepItem from './StepItem';

const Step3 = () => {
  return (
    <>
    <div className='md:max-w-[420px] max-md:text-center'>
        <h5 className="text-font-14 text-b2">Learn, test, and share</h5>
        <h2 className="md:text-[34px] text-font-20 font-bold text-black">
          Build Your Own Solutions
        </h2>
        <p className="md:text-font-16 text-font-14 text-b5 mb-5">
          DIY custom workflows and solutions that actually help you with your
          work.
        </p>
    </div>
    <div className="flex items-center md:flex-row flex-col">
      <div className='flex justify-center w-[42%]'>
        <Image
          src="/on-board3.png"
          alt="Multiple LLM Models"
          width={200}
          height={200}
          priority
        />
      </div>
      
      <div className="max-md:mt-5 max-md:text-center w-[58%]">
        <Image
          src="/on-board6.png"
          alt="Multiple LLM Models"
          className='absolute top-[-10%] right-[12%] max-md:hidden'
          width={270}
          height={200}
          priority
        />      
        <div className="grid md:grid-cols-2 grid-cols-1 gap-5">
          <StepItem
            icon={<LLMOnboard1 width={40} height={40} className="w-10 h-auto" />}
            title="Custom Workflows"
            description="Build it your way"
          />
          <StepItem
            icon={<LLMOnboard2 width={40} height={40} className="w-10 h-auto" />}
            title="Tool Integration"
            description="Connect your favorite apps"
          />
          <StepItem
            icon={<LLMOnboard3 width={40} height={40} className="w-10 h-auto" />}
            title="Domain Solutions"
            description="Industry-specific tools"
          />
          <StepItem
            icon={<LLMOnboard4 width={40} height={40} className="w-10 h-auto" />}
            title="No-Code Approach"
            description="Build without coding"
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default Step3;
