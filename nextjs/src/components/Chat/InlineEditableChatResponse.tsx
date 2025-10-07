import { useState, useRef, useEffect } from 'react';
import { MarkOutPut } from './MartOutput';
import TextAreaBox from '@/widgets/TextAreaBox';

interface InlineEditableChatResponseProps {
  response: string;
  onSave?: (updatedResponse: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
  className?: string;
}

const InlineEditableChatResponse = ({
  response,
  onSave,
  onCancel,
  disabled = false,
  className = ''
}: InlineEditableChatResponseProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(response);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditContent(response);
  }, [response]);


  const handleSave = () => {
    setIsEditing(false);
    if (onSave && editContent !== response) {
      onSave(editContent);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent(response);
    if (onCancel) {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditContent(e.target.value);
  };

  if (isEditing) {
    return (
      <div className={`inline-editable-response ${className}`}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <TextAreaBox
              message={editContent}
              handleChange={handleChange}
              handleKeyDown={handleKeyDown}
              isDisable={false}
              className="min-h-[100px] border-2 border-b10 focus:border-b2 focus:ring-2 focus:ring-b10 rounded-lg p-3 text-sm leading-relaxed"
              placeholder="Edit your response..."
              ref={textareaRef}
            />
          </div>
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
              title="Save (Cmd+Enter)"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              title="Cancel (Esc)"
            >
              Cancel
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Press Cmd+Enter to save, Esc to cancel
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        inline-editable-response rounded-lg p-3
        ${className}
      `}
    >
      <div className="prose prose-sm max-w-none">
        {MarkOutPut(response)}
      </div>
      
    </div>
  );
};

export default InlineEditableChatResponse; 