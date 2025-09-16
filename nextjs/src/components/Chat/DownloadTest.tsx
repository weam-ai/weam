import React from 'react';
import { downloadResponse } from '@/utils/downloadUtils';
import DownloadResponse from './DownloadResponse';

const DownloadTest: React.FC = () => {
  const sampleContent = `# Sample AI Response

This is a **sample response** from the AI with some *formatting*.

## Code Example
Here's some code:
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

## List Example
- Item 1
- Item 2
- Item 3

## Numbered List Example
1. First item
2. Second item
3. Third item

## Link Example
Check out [Google](https://google.com) for more information.

## Inline Code Example
You can use \`console.log()\` to print to the console.

## Reference Links
Here are some references: [1](https://example.com/ref1), [2](https://example.com/ref2), [3](https://example.com/ref3)

This response demonstrates various markdown features that should be properly handled during download.

### Subsection
This is a subsection with **bold text** and *italic text*.

#### Another Level
This shows how headers work at different levels.

## Another Code Block
\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\``;

  const handleTestDownload = (format: 'pdf' | 'html' | 'txt') => {
    downloadResponse(sampleContent, format, {
      title: 'Test AI Response',
      filename: 'test-response',
      includeTimestamp: true
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Download Feature Test</h1>
      
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Sample Content</h2>
        <div className="prose max-w-none">
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {sampleContent}
          </pre>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Test Downloads</h2>
        <div className="flex gap-4">
          <button
            onClick={() => handleTestDownload('pdf')}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Test PDF Download
          </button>
          <button
            onClick={() => handleTestDownload('html')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test HTML Download
          </button>
          <button
            onClick={() => handleTestDownload('txt')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Test TXT Download
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Download Component Test</h2>
        <DownloadResponse 
          content={sampleContent}
          title="Test Response"
        />
      </div>
    </div>
  );
};

export default DownloadTest; 