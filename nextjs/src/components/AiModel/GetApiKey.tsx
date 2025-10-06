import React from 'react';
import Link from 'next/link';
import { AI_MODEL_CODE } from '@/utils/constant';

const dashboardLink = {
    [AI_MODEL_CODE.OPEN_AI]: 'https://platform.openai.com/api-keys',
    [AI_MODEL_CODE.HUGGING_FACE]: 'https://ui.endpoints.huggingface.co',
    [AI_MODEL_CODE.ANTHROPIC]: 'https://console.anthropic.com/dashboard',
    [AI_MODEL_CODE.GEMINI]: 'https://ai.google.dev'
}

const GetApiKey = ({ name, code }) => {
    const link = dashboardLink[code];

  return (
    <div className='my-4'>
        <p className='text-font-14 text-b6'>
        Get your API key from  <Link href={link} className='underline hover:text-b5' target='_blank'>{name}</Link>.</p>
    </div>
  );
};

export default GetApiKey;