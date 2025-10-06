import React from 'react'; 
import StartChat from '../../../public/chat-icon-blue.svg'
import Image from 'next/image';
const StartChats = ({ onNext, onPrev }) => {
  return (
    <div>
             {/* Content start */}
            <div className='text-center'>
              <div className='icon-wrap mx-auto mb-5 [&>svg]:h-20 [&>svg]:w-auto [&>svg]:object-contain [&>svg]:fill-blue [&>svg]:mx-auto'>
                <Image src={StartChat} width="80" height="80" className="w-auto h-20 object-contain mx-auto" alt='Start Chats'/>
              </div>
              <h5 className='text-font-20 font-semibold text-b2 mb-1.5'>Start Chats</h5>
              <p className='text-font-16 leading-7 font-normal text-b2'>Personal & Shared chats with unlimited members.</p>
            </div>
            {/* Content start */}

             {/* Next Prev Button Start */}
             <div className='flex justify-center gap-2.5 absolute bottom-0 w-full'>
              <button type="button" onClick={onPrev} className='btn btn-outline-gray'>
                <svg className='me-2.5 inline-block align-middle -mt-0.5 fill-current' width="6" height="11" viewBox="0 0 6 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2.29657e-07 5.74606L5.25394 0.492119L6 1.23818L4.19265 3.03503L1.48161 5.74606L4.19264 8.45709L5.98949 10.2539L5.24343 11L2.29657e-07 5.74606Z"/>
                </svg>
                Back
              </button>
              <button type="button" onClick={onNext} className='btn btn-black'>Next
                <svg className='ms-2.5 inline-block align-middle -mt-0.5' width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.4 0.399902L7.42 1.3799L11.34 5.2999H0V6.6999H11.34L7.42 10.6199L8.4 11.5999L14 5.9999L8.4 0.399902Z" fill="white"/>
                </svg>
              </button>
            </div>
            {/* Next Prev Button End */}
    </div>
  );
};

export default StartChats;