import { useState, useEffect } from 'react';
import Image from "next/image";

const Alert = ({ content, icon, isVisible, onHide, timeoutDuration }) => {
  useEffect(() => {
    let timeout;
    if (isVisible) {
      timeout = setTimeout(() => {
        onHide();
      }, timeoutDuration || 5000); // Default timeout duration is 5000 milliseconds
    }

    return () => clearTimeout(timeout);
  }, [isVisible, onHide, timeoutDuration]);

  return (
    <>
      {isVisible && (
        <div className="block absolute left-1/2 -translate-x-1/2 top-3 z-[1050] w-full mx-auto items-center rounded-custom bg-black px-4 py-2.5 text-font-14 font-bold text-white animate-[fade-in_0.3s_both] p-[auto] motion-reduce:transition-none motion-reduce:animate-none" role="alert" id="alert-static-primary" data-twe-alert-init style={{ maxWidth: '600px', width: 'fit-content' }}>
          <div className='flex items-center'>
            {icon && <Image src={icon} width={16} height={16} alt="Icon" className="mr-2 object-contain" />} {/* Assuming icon is a URL to an image */}
            <span>{content}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default Alert;