import React, { useState } from 'react';
import InlineEditableResponse from './InlineEditableResponse';

const InlineEditableDemo: React.FC = () => {
  const [response, setResponse] = useState(`Here's a sample chat response that you can edit inline.

This is the second paragraph of the response. You can click on any paragraph to edit it.

And here's a third paragraph with some **bold text** and *italic text* to show markdown support.

The component supports:
- Clicking on any paragraph to edit
- Keyboard shortcuts (Cmd+Enter to save, Esc to cancel)
- Markdown rendering
- Auto-resizing textarea`);

  const handleSave = (updatedResponse: string) => {
    setResponse(updatedResponse);
    // Here you would typically make an API call to save the updated response
  };

  const handleCancel = () => {
    console.log('Edit cancelled');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Inline Editable Chat Response Demo</h1>
        <p className="text-gray-600">
          Click on any paragraph below to edit it inline. Use Cmd+Enter to save or Esc to cancel.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 border">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">AI Response:</h2>
        </div>
        
        <InlineEditableResponse
          response={response}
          onSave={handleSave}
          onCancel={handleCancel}
          className="text-gray-800"
        />
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Click on any paragraph to edit it inline</li>
          <li>Keyboard shortcuts: Cmd+Enter to save, Esc to cancel</li>
          <li>Markdown support for formatting</li>
          <li>Auto-resizing textarea</li>
          <li>Visual feedback with hover states</li>
          <li>Clean, modern UI with Tailwind CSS</li>
        </ul>
      </div>
    </div>
  );
};

export default InlineEditableDemo; 