import React, { useState, useEffect } from 'react';
import { downloadResponse } from '@/utils/downloadUtils';
import ThreeDotLoader from '../Loader/ThreeDotLoader';
import DownloadIcon from '@/icons/DownloadIcon';

interface DownloadResponseProps {
  content: string;
  title?: string;
  className?: string;
}

const DownloadResponse: React.FC<DownloadResponseProps> = ({
  content,
  title = 'AI Response',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle Escape key to close dropdown
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleDownload = async (format: 'pdf' | 'html' | 'txt') => {
    if (!content.trim()) return;
    
    setIsDownloading(true);
    try {
      await downloadResponse(content, format, {
        title,
        filename: 'weam-ai-response',
        includeTimestamp: true
      });
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Download Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
        className="flex items-center justify-center w-8 h-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-all duration-200"
        title="Download response"
      >
        {isDownloading ? (
          <ThreeDotLoader />
        ) : (
          <DownloadIcon className="w-4 h-4" />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px]">
          <div className="py-1">
            <button
              onClick={() => handleDownload('pdf')}
              disabled={isDownloading}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <DownloadIcon className="w-4 h-4 text-red-500" fileType="pdf" />
              PDF
            </button>
            
            <button
              onClick={() => handleDownload('html')}
              disabled={isDownloading}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <DownloadIcon className="w-4 h-4 text-b5" fileType="html" />
              HTML
            </button>
            
            <button
              onClick={() => handleDownload('txt')}
              disabled={isDownloading}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <DownloadIcon className="w-4 h-4 text-gray-500" fileType="txt" />
              TXT
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default DownloadResponse; 