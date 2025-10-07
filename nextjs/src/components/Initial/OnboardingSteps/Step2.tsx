import React from 'react';
import Image from 'next/image';
import { LLMOnboard1, LLMOnboard2, LLMOnboard3, LLMOnboard4 } from '@/icons/OnboardingIcons';
import StepItem from './StepItem';

const Step2 = () => {
  return (
    <div className="flex items-center gap-x-9 md:flex-row-reverse flex-col">
      <div className="w-[46%]">
        <Image
          src="/on-board2.png"
          alt="Multiple LLM Models"
          width={600}
          height={400}
          priority
        />
      </div>
      <div className="max-md:mt-5 max-md:text-center">
        <h5 className="text-font-14 text-b2">Pick your AI brain</h5>
        <h2 className="md:text-[36px] text-font-20 font-bold text-black">
          Use Multiple LLM Models
        </h2>
        <p className="md:text-font-16 text-font-14 text-b5 mb-3">
          And add the best AI models all in one place. Your task, your choice.
        </p>
        <div className="grid sm:grid-cols-2 grid-cols-1 gap-5">
          <StepItem
            layout="column"
            icon={<LLMOnboard1 width={40} height={40} className="w-10 h-auto mb-2 max-md:mx-auto" />}
            title="Compare Responses"
            description="Models with diverse capabilities"
          />
          <StepItem
            layout="column"
            icon={<LLMOnboard2 width={40} height={40} className="w-10 h-auto mb-2 max-md:mx-auto" />}
            title="Best for Tasks"
            description="Pick the right AI for each job"
          />
          <StepItem
            layout="column"
            icon={<LLMOnboard3 width={40} height={40} className="w-10 h-auto mb-2 max-md:mx-auto" />}
            title="Switch Seamlessly"
            description="Jump between models instantly"
          />
          <StepItem
            layout="column"
            icon={<LLMOnboard4 width={40} height={40} className="w-10 h-auto mb-2 max-md:mx-auto" />}
            title="Optimize Performance"
            description="Access to various AI models"
          />
        </div>
      </div>
    </div>
  );
};

export default Step2;
