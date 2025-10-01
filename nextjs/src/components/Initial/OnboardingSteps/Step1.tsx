import React from 'react';
import Image from 'next/image';
import { SecureOnboard, ShareOnboard, TimeOnboard } from '@/icons/OnboardingIcons';
import StepItem from './StepItem';

/**
 * Step 1 of the onboarding flow
 * Displays team collaboration features and benefits
 */
const Step1 = () => {
  return (
    <div className="flex items-center md:gap-x-9 md:flex-row flex-col">
      <div className="w-[46%]">
        <Image
          src="/invite-team.png"
          alt="Invite your team"
          width={600}
          height={400}
          priority
        />
      </div>
      <div className="max-md:mt-3 max-md:text-center">
        <h5 className="text-font-14 text-b2">Ready to team up?</h5>
        <h2 className="md:text-[36px] text-font-20 font-bold text-black">
          Invite Your Team Members
        </h2>
        <p className="md:text-font-16 text-font-14 text-b5 mb-3">
          Let's get your crew working together with AI-powered collaboration.
        </p>
        <StepItem
          className="px-2 my-5"
          icon={<ShareOnboard width={40} height={40} className="w-10 h-auto" />}
          title="Share Workspaces"
          description="To keep everyone on the same 'chat page'"
        />
        <StepItem
          className="px-2 my-5"
          icon={<TimeOnboard width={40} height={40} className="w-10 h-auto" />}
          title="Real-time Collaboration"
          description="Work together instantly"
        />
        <StepItem
          className="px-2 my-5"
          icon={<SecureOnboard width={40} height={40} className="w-10 h-auto" />}
          title="Team Permissions"
          description="You control who sees what"
        />
        <p>Time to adopt AI, together!</p>
      </div>
    </div>
  );
};

export default Step1;
