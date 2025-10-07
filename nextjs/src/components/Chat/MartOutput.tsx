import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus as dark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CopyToClipboard from 'react-copy-to-clipboard';
import CopyIcon from '@/icons/CopyIcon';
import CheckIcon from '@/icons/CheckIcon';
import { useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TickIcon from '@/icons/TickIcon';

const CodeBlock = (props) => {
    const { children, className, node, ...rest } = props;
    const isInline = !className;
    const match = /language-(\w+)/.exec(className || '');
    const language = match?.input?.replace('language-', '');

    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    if (isInline) {
        const text = Array.isArray(children) ? children.join('') : children;
        return (
            <code
                className="px-1 py-0.5 rounded bg-[#ECECEC] text-[#2D2D2D] text-sm font-mono"
                {...props}
            >
                {text}
            </code>
        );
    }

    return (
        <>
            {match ? (
                <>
                    <div className="flex justify-between px-3 align-middle pt-1">
                        <p className="language-text">{language}</p>
                        <CopyToClipboard text={children} onCopy={handleCopy}>
                            <div className="flex">
                                {copied ? (
                                    <span className="language-text">
                                        <CheckIcon
                                            width={12}
                                            height={12}
                                            className="mr-2 inline-block [&>path]:fill-gray-200"
                                        />
                                        Copied!
                                    </span>
                                ) : (
                                    <span className="cursor-pointer language-text">
                                        <CopyIcon
                                            width={15}
                                            height={15}
                                            className="mr-2 inline-block [&>path]:fill-gray-200"
                                        />
                                        copy
                                    </span>
                                )}
                            </div>
                        </CopyToClipboard>
                    </div>
                    <SyntaxHighlighter
                        PreTag="div"
                        language={match[1]}
                        style={dark}
                        wrapLines={true}
                        wrapLongLines={true}
                    >
                        {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                </>
            ) : (
                <code {...rest} className={className}>
                    {children}
                </code>
            )}
        </>
    );
};

export const MarkOutPut = (assisnantResponse: string) => {
    return (
        <div className="markdown w-full mx-auto flex-1 prose max-w-full overflow-hidden">
            <Markdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Override how links <a> are rendered
                    code: CodeBlock,
                    table: ({ children }) => {
                        const [copied, setCopied] = useState(false);
                        const [colSize, setColSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('sm');
                        const tableRef = (el: HTMLTableElement | null) => {
                            if (!el) return;
                            const computeAndSetSize = () => {
                                const firstRow = el.querySelector('tr');
                                const colCount = firstRow ? firstRow.children.length : 0;
                                let size: 'sm' | 'md' | 'lg' | 'xl' = 'sm';
                                if (colCount > 12) size = 'xl';
                                else if (colCount > 6) size = 'lg';
                                else if (colCount > 4) size = 'md';
                                setColSize(size);
                                el.setAttribute('data-col-size', size);
                                el.setAttribute('data-col-count', String(colCount));
                            };
                            computeAndSetSize();
                            try {
                                const ro = new ResizeObserver(() => computeAndSetSize());
                                ro.observe(el);
                                (el as any).__ro = ro;
                            } catch (_) {}
                        };
                        const handleCopyTable = (tableElement: HTMLTableElement | null) => {
                            if (!tableElement) return;
                            const rows = Array.from(tableElement.querySelectorAll('tr'));
                            const tsv = rows
                                .map((row) =>
                                    Array.from(row.querySelectorAll('th,td'))
                                        .map((cell) => {
                                            const text = (cell.textContent || '').replace(/\t/g, ' ').replace(/\r?\n|\r/g, ' ');
                                            // Quote if contains tabs or quotes
                                            const needsQuotes = /["\t]/.test(text);
                                            const escaped = text.replace(/"/g, '""');
                                            return needsQuotes ? `"${escaped}"` : escaped;
                                        })
                                        .join('\t')
                                )
                                .join('\n');
                            const html = tableElement.outerHTML;
                            const writeRichClipboard = async () => {
                                try {
                                    const ClipboardItemCtor: any = (window as any).ClipboardItem;
                                    if (ClipboardItemCtor) {
                                        const item = new ClipboardItemCtor({
                                            'text/html': new Blob([html], { type: 'text/html' }),
                                            'text/plain': new Blob([tsv], { type: 'text/plain' })
                                        });
                                        await navigator.clipboard.write([item]);
                                    } else {
                                        await navigator.clipboard.writeText(tsv);
                                    }
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                } catch (e) {
                                    navigator.clipboard.writeText(tsv).then(() => {
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 1500);
                                    });
                                }
                            };
                            writeRichClipboard();
                        };
                        return (
                            <div className="relative group markdown-table-wrap w-full">
                                <div className="md:absolute right-0 top-[-2px] flex items-center gap-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10">
                                    <TooltipProvider delayDuration={0}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="rounded p-1.5 bg-b4 hover:bg-b2"
                                                    onClick={(e) => {
                                                        const wrapper = (e.currentTarget.parentElement?.parentElement?.parentElement as HTMLElement) || null;
                                                        const table = wrapper ? (wrapper.querySelector('table') as HTMLTableElement) : null;
                                                        handleCopyTable(table);
                                                    }}
                                                    aria-label="Copy table"
                                                >
                                                    {copied ? (
                                                        <TickIcon width={14} height={14} className="[&>path]:fill-green w-4 h-auto" />
                                                    ) : (
                                                        <CopyIcon width={14} height={14} className="[&>path]:fill-white w-4 h-auto" />
                                                    )}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="border-none text-white">
                                                <span className='text-font-14'>Copy Table</span>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                                <div className="overflow-x-auto w-full">
                                    <table ref={tableRef} className="min-w-full">{children}</table>
                                </div>
                            </div>
                        );
                    },
                    a: ({ children, href, ...props }) => {
                        // children is normally an array of strings/elements
                        // e.g. if the markdown is [1](https://google.com)
                        // the displayed text is '1'
                        const linkText = children[0];

                        // Check if linkText is purely numeric (like "1", "2", "3"...)
                        const isNumericRef = /^\d+$/.test(linkText);

                        // If numeric, style as a circle
                        if (isNumericRef) {
                            return (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center 
                               size-[18px] text-font-12 bg-b12 mr-1 mb-1 text-sm font-medium 
                               rounded-full 
                               text-b2"
                                    {...props}
                                >
                                    {linkText}
                                </a>
                            );
                        }

                        // Otherwise, render normal link
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-b5 underline"
                                {...props}
                            >
                                {children}
                            </a>
                        );
                    },
                }}
            >
                {assisnantResponse}
            </Markdown>
        </div>
    );
};
