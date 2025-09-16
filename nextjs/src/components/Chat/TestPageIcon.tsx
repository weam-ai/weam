import React from 'react';
import HoverActionIcon from './HoverActionIcon';

const TestPageIcon = () => {
  const mockMessage = {
    id: 'test-message-id',
    response: 'This is a test response',
    responseModel: 'GPT-4',
    chatId: 'test-chat-id',
    user: { email: 'test@example.com', fname: 'Test', lname: 'User', id: 'test-user-id' },
    brain: { title: 'Test Brain', slug: 'test-brain', id: 'test-brain-id' },
    model: { title: 'Open AI', code: 'OPEN_AI', id: 'test-model-id' },
    tokens: { totalUsed: 100 },
    responseAPI: 'OPEN_AI',
    companyId: 'test-company-id'
  };

  const handleAddToPages = () => {
    alert('Add to pages clicked!');
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Test Page Icon</h2>
      
      <div className="border border-gray-300 rounded-lg p-4">
        <p className="mb-4">This is a test response with action icons:</p>
        
        <div className="relative">
          <div className="bg-gray-100 p-4 rounded-lg mb-4">
            <p>{mockMessage.response}</p>
          </div>
          
          <HoverActionIcon
            content={mockMessage.response}
            proAgentData=""
            conversation={[]}
            sequence={Date.now()}
            onOpenThread={() => console.log('Open thread')}
            copyToClipboard={() => console.log('Copy to clipboard')}
            getAgentContent={() => mockMessage.response}
            onAddToPages={handleAddToPages}
            hasBeenEdited={true}
          />
        </div>
      </div>
    </div>
  );
};

export default TestPageIcon;

