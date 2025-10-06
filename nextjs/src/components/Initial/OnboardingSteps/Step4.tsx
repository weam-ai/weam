import React from 'react';
import Image from 'next/image';
import { LLMOnboard1, LLMOnboard2, LLMOnboard3, LLMOnboard4 } from '@/icons/OnboardingIcons';
import StepItem from './StepItem';

const Step4 = () => {
  return (
    <div className="flex md:flex-col-reverse flex-col gap-y-9">
      <div className="w-full relative">
        <Image
          src="/on-board4.png"
          alt="Multiple LLM Models"
          className="ml-[150px] max-md:mx-auto"
          width={250}
          height={200}
          priority
        />
        <Image
          src="/on-board-dots.png"
          alt="Multiple LLM Models"
          className="absolute right-0 bottom-0 max-md:hidden"
          width={300}
          height={200}
          priority
        />
      </div>
      <div className="max-md:text-center">
        <h5 className="text-font-14 text-b2">Your Custom AI Agent</h5>
        <h2 className="md:text-[36px] text-font-20 font-bold text-black">
          Create Your Own Agent & Prompt Library
        </h2>
        <p className="md:text-font-16 text-font-14 text-b5 mb-5">
          Build smart AI helpers and save your best prompts for the whole team.
        </p>
        <div className="grid md:grid-cols-4 grid-cols-1 gap-5">
          <StepItem
            icon={<LLMOnboard1 width={40} height={40} className="w-10 h-auto" />}
            title="Custom AI Agents"
            description="Create specialized helpers for different tasks"
          />
          <StepItem
            icon={<LLMOnboard2 width={40} height={40} className="w-10 h-auto" />}
            title="Prompt Library"
            description="Build a collection of winning prompts"
          />
          <StepItem
            icon={<LLMOnboard3 width={40} height={40} className="w-10 h-auto" />}
            title="Share Templates"
            description="Share your best agents with the team"
          />
          <StepItem
            icon={<LLMOnboard4 width={40} height={40} className="w-10 h-auto" />}
            title="Reuse Prompts"
            description="Adapt and reuse what works"
          />
        </div>
      </div>
    </div>
  );
};

export default Step4;
