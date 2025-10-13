import React from 'react';
import Image from 'next/image';
import { LLMOnboard1, LLMOnboard2, LLMOnboard3, LLMOnboard4 } from '@/icons/OnboardingIcons';
import StepItem from './StepItem';

const Step5 = () => {
  return (
    <div className="flex md:flex-row-reverse flex-col items-center gap-x-9">
      <div className="w-[46%] flex justify-center">
        <Image
          src="/on-board5.png"
          alt="Multiple LLM Models"
          className="absolute right-[-170px] top-1/2 translate-y-[-52%]"
          width={650}
          height={300}
          priority
        />
      </div>
      <div className="md:w-1/2 max-md:text-center z-[2]">
        <h5 className="text-font-14 text-b2">Let's make epic stuff</h5>
        <h2 className="md:text-[36px] text-font-20 font-bold text-black">
          Be Part of the AI World
        </h2>
        <p className="text-font-16 text-b5 mb-5">
          Connect, collaborate, and create to stay ahead of the curve.
        </p>

        <div className="flex md:gap-x-5 max-md:gap-y-3 md:flex-row flex-col mb-5">
          <StepItem icon={<LLMOnboard1 width={40} height={40} className="w-10 h-auto" />} title="AI Community" />
          <StepItem icon={<LLMOnboard2 width={40} height={40} className="w-10 h-auto" />} title="Latest Updates" />
        </div>

        <div className="flex gap-x-5 max-md:gap-y-3 md:flex-row flex-col md:ml-[100px]">
          <StepItem icon={<LLMOnboard3 width={40} height={40} className="w-10 h-auto" />} title="Resources" />
          <StepItem icon={<LLMOnboard4 width={40} height={40} className="w-10 h-auto" />} title="Shape Future" />
        </div>
        <p className="mt-5">Time to explore what AI can do for you.</p>
      </div>
    </div>
  );
};

export default Step5;
