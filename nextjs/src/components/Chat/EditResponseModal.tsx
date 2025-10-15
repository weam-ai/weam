"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// WYSIWYG (HTML) editor
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";

// Unified markdown/html toolchain for stable round-trips
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import rehypeSanitize from "rehype-sanitize";
import remarkStringify from "remark-stringify";

interface EditResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (messageId: string, updatedResponse: string) => Promise<void>;
  initialContent: string;
  messageId: string;
}

/**
 * Enhanced Response Editor with stable Markdown/HTML round-trips
 * - Uses unified ecosystem for better conversion
 * - Preserves original markdown structure
 * - Provides WYSIWYG editing experience
 */
export default function EditResponseModal({
  isOpen,
  onClose,
  onSave,
  initialContent,
  messageId
}: EditResponseModalProps) {
  const [markdown, setMarkdown] = useState<string>(initialContent || "");
  const [html, setHtml] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quill toolbar restricted to markdown-safe features only
  const quillModules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "strike", "code"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link"],
      ],
      clipboard: { matchVisual: false },
    }),
    []
  );

  const quillFormats = [
    "bold",
    "italic",
    "strike",
    "blockquote",
    "code-block",
    "list",
    "bullet",
    "link",
    "code",
  ];

  // --- Markdown -> HTML (for showing in the editor) ---
  async function mdToHtml(md: string): Promise<string> {
    try {
      const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeSanitize)
        .use(rehypeStringify)
        .process(md);
      return String(file);
    } catch (error) {
      console.error('Error converting Markdown to HTML:', error);
      // Fallback: return the markdown as-is wrapped in a div
      return `<div>${md.replace(/\n/g, '<br>')}</div>`;
    }
  }

  // Function to preserve code block language information during HTML processing
  function preserveCodeBlockLanguages(html: string): string {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Find all pre elements (code blocks)
    const preElements = tempDiv.querySelectorAll('pre');
    
    preElements.forEach((pre) => {
      const code = pre.querySelector('code');
      if (code) {
        // Check if there's a class that indicates the language
        const classList = Array.from(code.classList);
        const languageClass = classList.find(cls => cls.startsWith('language-'));
        
        if (languageClass) {
          const language = languageClass.replace('language-', '');
          // Add a data attribute to preserve the language information
          pre.setAttribute('data-language', language);
        }
      }
    });
    
    return tempDiv.innerHTML;
  }

  // Function to restore code block language information in markdown
  function restoreCodeBlockLanguages(markdown: string, originalMarkdown: string): string {
    // Extract code blocks with languages from original markdown
    const originalCodeBlocks = originalMarkdown.match(/```(\w+)\n[\s\S]*?```/g) || [];
    const originalLanguages = originalCodeBlocks.map(block => {
      const match = block.match(/```(\w+)/);
      return match ? match[1] : null;
    }).filter(Boolean);

    // Find code blocks in the converted markdown
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let result = markdown;
    let languageIndex = 0;

    // Replace code blocks with proper language identifiers
    result = result.replace(codeBlockRegex, (fullMatch, language, code) => {
      if (language) {
        // Already has a language, keep it
        return fullMatch;
      } else if (languageIndex < originalLanguages.length) {
        // Restore the original language
        const originalLanguage = originalLanguages[languageIndex];
        languageIndex++;
        return `\`\`\`${originalLanguage}\n${code}\`\`\``;
      } else {
        // No language to restore, keep as is
        return fullMatch;
      }
    });

    return result;
  }

  // --- HTML -> Markdown (for syncing back to markdown) ---
  async function htmlToMd(docHtml: string, originalMarkdown?: string): Promise<string> {
    try {
      // First, let's preserve code block language information by preprocessing the HTML
      const processedHtml = preserveCodeBlockLanguages(docHtml);
      
      const file = await unified()
        .use(rehypeParse, { fragment: true })
        .use(rehypeSanitize)
        .use(rehypeRemark)
        .use(remarkGfm)
        .use(remarkStringify, {
          bullet: "-",
          fences: true,
          listItemIndent: "one",
          rule: "-",
          emphasis: "*",
          strong: "*",
          incrementListMarker: false,
        })
        .process(processedHtml);
      
      let result = String(file).trim();
      
      // Restore code block languages if original markdown is provided
      if (originalMarkdown) {
        result = restoreCodeBlockLanguages(result, originalMarkdown);
      }
      
      return result;
    } catch (error) {
      console.error('Error converting HTML to Markdown:', error);
      // Fallback: try with minimal configuration
      try {
        const processedHtml = preserveCodeBlockLanguages(docHtml);
        const file = await unified()
          .use(rehypeParse, { fragment: true })
          .use(rehypeSanitize)
          .use(rehypeRemark)
          .use(remarkGfm)
          .use(remarkStringify)
          .process(processedHtml);
        
        let result = String(file).trim();
        
        // Restore code block languages if original markdown is provided
        if (originalMarkdown) {
          result = restoreCodeBlockLanguages(result, originalMarkdown);
        }
        
        return result;
      } catch (fallbackError) {
        console.error('Fallback conversion also failed:', fallbackError);
        throw new Error('Failed to convert HTML to Markdown');
      }
    }
  }

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && initialContent) {
      setMarkdown(initialContent);
      setError(null);
    }
  }, [isOpen, initialContent]);

  // Keep HTML and Markdown in sync (bidirectional)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const htmlStr = await mdToHtml(markdown);
        if (active) {
          setHtml(htmlStr);
          // Check for changes by comparing text content
          const currentText = extractTextContent(htmlStr);
          const originalText = extractTextContent(await mdToHtml(initialContent));
          setHasChanges(currentText.trim() !== originalText.trim());
        }
      } catch (e: any) {
        if (active) setError(e?.message || "Failed to load content");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [markdown, initialContent]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMarkdown('');
      setHtml('');
      setError(null);
      setHasChanges(false);
      setLoading(true);
    }
  }, [isOpen]);

  async function handleHtmlChange(updatedHtml: string) {
    setHtml(updatedHtml);
    // Don't automatically convert HTML to Markdown during editing
    // This preserves the original structure until save
    
    // Check for changes by comparing text content
    try {
      const currentText = extractTextContent(updatedHtml);
      const originalText = extractTextContent(await mdToHtml(initialContent));
      setHasChanges(currentText.trim() !== originalText.trim());
    } catch (error) {
      console.error('Error checking changes:', error);
    }
    
    setError(null);
  }

  // Helper function to extract plain text from HTML
  function extractTextContent(html: string): string {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      
      // Get the final markdown to save
      let finalMarkdown = initialContent; // Start with original
      
      // Extract text content to compare
      const currentText = extractTextContent(html);
      const originalText = extractTextContent(await mdToHtml(initialContent));
      
      // Only convert if there are actual text changes
      if (currentText.trim() !== originalText.trim()) {
        try {
          // Convert HTML to Markdown with original markdown for language preservation
          const convertedMd = await htmlToMd(html, initialContent);
          
          // Use smart preservation to keep original structure
          finalMarkdown = preserveOriginalStructure(initialContent, convertedMd, currentText, originalText);
        } catch (conversionError) {
          console.error('Conversion failed, keeping original:', conversionError);
          // If conversion fails, keep original markdown
          finalMarkdown = initialContent;
        }
      }
      
      // Debug logging to help understand what's happening
      console.log('=== Edit Response Debug ===');
      console.log('Original Markdown:', initialContent);
      console.log('Current HTML:', html);
      console.log('Original Text:', originalText);
      console.log('Current Text:', currentText);
      console.log('Final Markdown (after preservation):', finalMarkdown);
      console.log('Content changed:', initialContent !== finalMarkdown);
      console.log('========================');
      
      await onSave(messageId, finalMarkdown); // always save markdown to DB
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save content");
    } finally {
      setSaving(false);
    }
  }

  // Function to preserve original structure as much as possible
  function preserveOriginalStructure(original: string, newMarkdown: string, currentText: string, originalText: string): string {
    try {
      // If no text changes, keep original
      if (currentText.trim() === originalText.trim()) {
        return original;
      }
      
      // Special handling for code blocks - preserve them with their languages
      const originalCodeBlocks: any = original.match(/```(\w+)?\n[\s\S]*?```/g) || [];
      const newCodeBlocks: any = newMarkdown.match(/```(\w+)?\n[\s\S]*?```/g) || [];
      
      // If we have code blocks, try to preserve their structure
      if (originalCodeBlocks.length > 0 || newCodeBlocks.length > 0) {
        // For code blocks, prefer the new markdown but ensure languages are preserved
        let result = newMarkdown;
        
        // Restore languages from original if they're missing in new
        originalCodeBlocks.forEach((originalBlock, index) => {
          const languageMatch = originalBlock.match(/```(\w+)/);
          if (languageMatch && index < newCodeBlocks.length) {
            const newBlock = newCodeBlocks[index];
            if (!newBlock.match(/```\w+/)) {
              // New block doesn't have language, restore it
              const codeContent = newBlock.replace(/```/g, '').trim();
              result = result.replace(newBlock, `\`\`\`${languageMatch[1]}\n${codeContent}\n\`\`\``);
            }
          }
        });
        
        return result;
      }
      
      return newMarkdown;
    } catch (error) {
      console.error('Error preserving structure:', error);
      return newMarkdown; // Fallback to new markdown
    }
  }

  // Helper function to escape special regex characters
  function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const handleCancel = () => {
    onClose();
  };

  const copyHtmlContent = async () => {
    try {
      // Convert HTML to properly formatted plain text
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Preserve formatting by converting HTML elements to plain text equivalents
      const formattedText = formatHtmlToPlainText(tempDiv);
      
      await navigator.clipboard.writeText(formattedText);
      setCopied(true);
      console.log('Formatted plain text content copied to clipboard');
      
      // Reset to copy icon after 3 seconds
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  };

  const formatHtmlToPlainText = (element: HTMLElement): string => {
    let result = '';
    
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent || '';
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toLowerCase();
        
        switch (tagName) {
          case 'p':
            result += formatHtmlToPlainText(el) + '\n\n';
            break;
          case 'br':
            result += '\n';
            break;
          case 'div':
            result += formatHtmlToPlainText(el) + '\n';
            break;
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            result += formatHtmlToPlainText(el) + '\n\n';
            break;
          case 'ul':
          case 'ol':
            result += formatHtmlToPlainText(el) + '\n';
            break;
          case 'li':
            result += '• ' + formatHtmlToPlainText(el) + '\n';
            break;
          case 'blockquote':
            result += '    ' + formatHtmlToPlainText(el) + '\n\n';
            break;
          case 'pre':
          case 'code':
            result += formatHtmlToPlainText(el) + '\n';
            break;
          case 'strong':
          case 'b':
            result += formatHtmlToPlainText(el); // Just the text, no markdown
            break;
          case 'em':
          case 'i':
            result += formatHtmlToPlainText(el); // Just the text, no markdown
            break;
          case 'a':
            const href = el.getAttribute('href');
            const linkText = formatHtmlToPlainText(el);
            result += href ? `${linkText} (${href})` : linkText; // Plain text with URL
            break;
          default:
            result += formatHtmlToPlainText(el);
            break;
        }
      }
    }
    
    return result;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl w-full h-[95vh] p-0 flex flex-col bg-white/95 backdrop-blur-xl border-0 rounded-2xl shadow-2xl shadow-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]" 
        onOpenAutoFocus={(e: any) => e.preventDefault()} 
        {...({} as any)}
      >
        {/* Header Section */}
        <div className="flex-shrink-0 bg-gradient-to-r from-white/90 to-white/80 backdrop-blur-sm border-b border-white/20 px-8 py-6 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Edit Response</h2>
            <p className="text-sm text-gray-600 mt-2 font-medium">Edit content directly - use toolbar for quick formatting</p>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 bg-gradient-to-b from-white/95 to-white/90 overflow-y-auto px-6 border-b border-white/20">
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
              <div className="flex items-center space-x-2">
                <span className="text-red-500">⚠️</span>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-gray-500">Loading editor...</p>
              </div>
            </div>
          ) : (
            <div className="min-h-full relative">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-white/30 shadow-inner">
                <ReactQuill
                  theme="snow"
                  value={html}
                  onChange={handleHtmlChange}
                  modules={quillModules}
                  formats={quillFormats}
                  style={{ 
                    height: 'auto',
                    minHeight: '600px',
                    border: 'none',
                    borderRadius: '12px'
                  }}
                  placeholder="Start editing your response here..."
                />
              </div>
              
              {/* Copy Icon positioned over the content area */}
              <div className="absolute top-2 right-2 z-10">
                <div
                  onClick={copyHtmlContent}
                  className={`cursor-pointer transition-all duration-300 ${
                    copied 
                      ? 'text-green-600' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  title={copied ? "Copied!" : "Copy as plain text"}
                >
                  {copied ? (
                    <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
              </div>
              <style jsx global>{`
                .ql-container {
                  border: none !important;
                  border-radius: 12px !important;
                }
                .ql-toolbar {
                  position: sticky !important;
                  top: 0 !important;
                  z-index: 10 !important;
                  border: none !important;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
                  border-radius: 12px 12px 0 0 !important;
                  background: rgba(255, 255, 255, 0.95) !important;
                  backdrop-filter: blur(10px) !important;
                }
                .ql-editor {
                  line-height: 1.7 !important;
                  padding: 24px !important;
                  font-size: 16px !important;
                  color: #374151 !important;
                  background: transparent !important;
                  border-radius: 0 0 12px 12px !important;
                }
                .ql-editor p {
                  margin-bottom: 16px !important;
                  line-height: 1.7 !important;
                }
                .ql-editor ul, .ql-editor ol {
                  margin-bottom: 16px !important;
                  padding-left: 24px !important;
                }
                .ql-editor li {
                  margin-bottom: 8px !important;
                  line-height: 1.6 !important;
                }
                .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor h5, .ql-editor h6 {
                  margin-top: 24px !important;
                  margin-bottom: 16px !important;
                  font-weight: 600 !important;
                  color: #111827 !important;
                }
                .ql-editor h1 {
                  font-size: 2rem !important;
                }
                .ql-editor h2 {
                  font-size: 1.5rem !important;
                }
                .ql-editor h3 {
                  font-size: 1.25rem !important;
                }
                .ql-editor strong, .ql-editor b {
                  font-weight: 600 !important;
                  color: #111827 !important;
                }
                .ql-editor em, .ql-editor i {
                  font-style: italic !important;
                }
                .ql-editor blockquote {
                  margin: 20px 0 !important;
                  padding-left: 20px !important;
                  border-left: 4px solid #e5e7eb !important;
                  color: #6b7280 !important;
                }
                .ql-editor code {
                  background-color: #f3f4f6 !important;
                  padding: 2px 6px !important;
                  border-radius: 4px !important;
                  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
                  font-size: 0.875em !important;
                  color: #dc2626 !important;
                  border: 1px solid #e5e7eb !important;
                }
                .ql-editor pre {
                  background-color: #1f2937 !important;
                  padding: 16px !important;
                  border-radius: 8px !important;
                  margin: 16px 0 !important;
                  border: 1px solid #374151 !important;
                  overflow-x: auto !important;
                }
                .ql-editor pre code {
                  background: none !important;
                  padding: 0 !important;
                  color: #f9fafb !important;
                  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace !important;
                }
                .ql-editor a {
                  color: #2563eb !important;
                  text-decoration: underline !important;
                }
                .ql-editor a:hover {
                  color: #1d4ed8 !important;
                }
              `}</style>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex-shrink-0 bg-gradient-to-r from-white/80 to-white/70 backdrop-blur-sm px-8 py-5 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>ⓘ</span>
              <span>Press Esc to cancel</span>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-6 py-3 text-sm font-semibold text-gray-600 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl hover:bg-white/90 hover:shadow-lg hover:border-gray-300/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all duration-300 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-6 py-3 text-sm font-semibold rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 disabled:opacity-50 transition-all duration-300 flex items-center space-x-2 shadow-lg ${
                  hasChanges 
                    ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 hover:shadow-xl transform hover:-translate-y-0.5' 
                    : 'bg-gray-300/80 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : hasChanges ? (
                  <>
                    <span className="text-green-400">✓</span>
                    <span>Save Changes</span>
                  </>
                ) : (
                  <span>No Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}