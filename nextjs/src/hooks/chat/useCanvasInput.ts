import { setCanvasOptionAction } from '@/lib/slices/chat/chatSlice';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

function getCharacterOffsetWithin(rootNode, targetNode, targetOffset) {
    let totalOffset = 0;
    let found = false;

    function traverse(node) {
        if (found) return;

        if (node === targetNode) {
            if (node.nodeType === Node.TEXT_NODE) {
                totalOffset += targetOffset;
            }
            found = true;
            return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
            totalOffset += node.textContent.length;
        } else {
            for (let i = 0; i < node.childNodes.length; i++) {
                traverse(node.childNodes[i]);
                if (found) return;
            }
        }
    }

    traverse(rootNode);
    return totalOffset;
}

function createMarkdownMap(markdown) {
    const map = [];
    let renderedIndex = 0; // The index in the rendered text

    // Normalize all newline characters to '\n'
    const normalizedMarkdown = markdown.replace(/\r\n/g, '\n');

    let i = 0;
    const length = normalizedMarkdown.length;

    while (i < length) {
        const char = normalizedMarkdown[i];

        // Handle horizontal rules (e.g., '---', '***', '___')
        if (
            (char === '-' || char === '*' || char === '_') &&
            (i === 0 || normalizedMarkdown[i - 1] === '\n')
        ) {
            let hrChar = char;
            let hrLength = 0;

            // Count consecutive hrChar
            while (i < length && normalizedMarkdown[i] === hrChar) {
                hrLength++;
                i++;
            }

            // A valid horizontal rule has at least 3 of the same characters
            if (hrLength >= 3) {
                // Skip any trailing spaces
                while (i < length && normalizedMarkdown[i] === ' ') {
                    i++;
                }
                // Skip the newline after the horizontal rule
                if (normalizedMarkdown[i] === '\n') {
                    i++;
                }
                continue; // Skip rendering horizontal rule
            } else {
                // Not a horizontal rule, map the characters
                for (let j = 0; j < hrLength; j++) {
                    map[renderedIndex] = i - hrLength + j;
                    renderedIndex++;
                }
            }
        }
        // Handle header syntax (like ##)
        else if (char === '#' && (i === 0 || normalizedMarkdown[i - 1] === '\n')) {
            // Skip all consecutive '#' characters at the beginning of the line
            while (i < length && normalizedMarkdown[i] === '#') {
                i++;
            }
            // Skip the following space after '#'s
            if (normalizedMarkdown[i] === ' ') {
                i++;
            }
            continue; // Continue to the next character after headers
        }
        // Handle other Markdown formatting symbols (like bold, italics, code, blockquotes)
        else if (char === '*' || char === '_' || char === '`' || char === '>') {
            // Skip the formatting character
            i++;
            continue;
        }
        // Handle newline characters
        else if (char === '\n') {
            // Map newline characters to rendered text
            map[renderedIndex] = i;
            renderedIndex++;
            i++;
            continue;
        }
        // Handle list numbering (e.g., '1. ', '2. ', etc.)
        else if (/\d/.test(char)) {
            let start = i;
            // Capture the entire numbering (e.g., '10. ')
            while (i < length && /\d/.test(normalizedMarkdown[i])) {
                i++;
            }
            if (normalizedMarkdown[i] === '.') {
                i++;
                // Skip the space after the period
                if (normalizedMarkdown[i] === ' ') {
                    i++;
                }
            }
            // Map the numbering characters to the rendered text
            for (let j = start; j < i; j++) {
                map[renderedIndex] = j;
                renderedIndex++;
            }
            continue;
        }
        else {
            // Normal text characters map directly to the rendered text
            map[renderedIndex] = i;
            renderedIndex++;
            i++;
        }
    }

    return map;
}

function adjustOffsets(start, end, map) {
    const adjustedStart = map[start] !== undefined ? map[start] : 0;
    const adjustedEnd = map[end] !== undefined ? map[end] : map[map.length - 1];
    return { adjustedStart, adjustedEnd };
}

function createHighlightedSpan(text) {
    const span = document.createElement('span');
    span.className = 'bg-highlighter text-black highlighted-text';
    span.textContent = text;
    return span;
}

function splitAndHighlightTextNode(textNode, range) {
    const parent = textNode.parentNode;

    // Check if inside code block
    const isInsideCodeBlock = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            node = node.parentElement;
        }
        return node.closest('pre, code') !== null;
    };

    if (parent.classList && parent.classList.contains('highlighted-text')) {
        return;
    }

    const startOffset = textNode === range.startContainer ? range.startOffset : 0;
    const endOffset = textNode === range.endContainer ? range.endOffset : textNode.textContent.length;

    const selectedText = textNode.textContent.slice(startOffset, endOffset);

    if (selectedText.length === 0) {
        return;
    }

    if (isInsideCodeBlock(textNode)) {
        // Changed to white text color
        textNode.parentElement.classList.add("bg-black", "text-white", "highlighted-text");
        return;
    }

    // Rest of the original highlighting logic for non-code text
    const beforeText = textNode.textContent.slice(0, startOffset);
    const afterText = textNode.textContent.slice(endOffset);

    const leadingSpaceMatch = selectedText.match(/^(\s+)/);
    const trailingSpaceMatch = selectedText.match(/(\s+)$/);

    let leadingSpaces = '';
    let trailingSpaces = '';
    let mainText = selectedText;

    if (leadingSpaceMatch) {
        leadingSpaces = leadingSpaceMatch[1];
        mainText = mainText.slice(leadingSpaces.length);
    }

    if (trailingSpaceMatch) {
        trailingSpaces = trailingSpaceMatch[1];
        mainText = mainText.slice(0, -trailingSpaces.length);
    }

    if (beforeText) {
        parent.insertBefore(document.createTextNode(beforeText), textNode);
    }

    if (leadingSpaces) {
        parent.insertBefore(document.createTextNode(leadingSpaces), textNode);
    }

    if (mainText.length > 0) {
        parent.insertBefore(createHighlightedSpan(mainText), textNode);
    }

    if (trailingSpaces) {
        parent.insertBefore(document.createTextNode(trailingSpaces), textNode);
    }

    if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), textNode);
    }

    parent.removeChild(textNode);
}

function getSelectedTextNodes(range) {
    const commonAncestor = range.commonAncestorContainer;

    const walker = document.createTreeWalker(
        commonAncestor,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                return range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        },
        // false
    );

    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
    }

    return textNodes;
}

function separateSpanCreation(range) {
    if (range.collapsed) {
        return;
    }

    if (range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE) {
        splitAndHighlightTextNode(range.startContainer, range);
    } else {
        const textNodes = getSelectedTextNodes(range);
        textNodes.forEach(textNode => splitAndHighlightTextNode(textNode, range));
    }
}

const imageModals = [
    'sdxl-flash-lgh',
    'llama-3.1-sonar-large-128k-online',
    'sonar',
    'sonar-pro',
    'deepseek/deepseek-r1',
    'deepseek/deepseek-r1-distill-llama-70b',
];

const useCanvasInput = () => {
    const [showCanvasBox, setShowCanvasBox] = useState(false);
    const [showCanvasButton, setShowCanvasButton] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [buttonPosition, setButtonPosition] = useState({});
    const [inputPosition, setInputPosition] = useState({});
    const selectionRef = useRef(null);
    const containerRef = useRef(null);
    const canvasInputRef = useRef(null);
    const dispatch = useDispatch();
    const selectedAIModal = useSelector((store:any) => store.assignmodel.selectedModal);

    const isSelectionInsideContainer = useCallback((selection) => {
        if (selection.rangeCount === 0) return false;
        const range = selection.getRangeAt(0);
        return containerRef.current.contains(range.commonAncestorContainer);
    },[]);

    const handleSelectionChanges = useCallback((selectedMessageId, response) => {
        const isImageModal = imageModals.includes(selectedAIModal?.name);
        if (isImageModal) return;
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (selectionRef.current || selectedId !== selectedMessageId) {
            setShowCanvasBox(false);
            setShowCanvasButton(false);
            selectionRef.current = null;
        }

        if (selectedText && isSelectionInsideContainer(selection)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            selectionRef.current = range;

            const containerNode = containerRef.current;
            const map = createMarkdownMap(response);

            const containerRect = containerNode.getBoundingClientRect();

            const startOffset = getCharacterOffsetWithin(
                containerNode,
                range.startContainer,
                range.startOffset
            );
            const endOffset = getCharacterOffsetWithin(
                containerNode,
                range.endContainer,
                range.endOffset
            );

            const {adjustedStart, adjustedEnd} = adjustOffsets(startOffset, endOffset, map);

            const isNearRightEdge = rect.right > (containerRect.right - 100);
            const isNearBottomEdge = rect.bottom > (containerRect.bottom - 50);

            if (isNearRightEdge && isNearBottomEdge) {
                setButtonPosition({
                    position: 'absolute',
                    bottom: `${ window.scrollY + 50}px`,
                    right: '0',  
                    zIndex: 1000,
                    cursor: 'pointer',
                });
                setInputPosition({
                    position: 'absolute',
                    outline: 'none',
                    bottom: `${ window.scrollY + 50}px`,
                    right: '0',  
                    zIndex: 1000,
                    cursor: 'pointer',
                });
            } 
            else if (isNearRightEdge) {
                setButtonPosition({
                    position: 'absolute',
                    top: `${rect.bottom - containerRect.top + window.scrollY}px`,
                    right: '0', 
                    zIndex: 1000,
                    cursor: 'pointer',
                });
                setInputPosition({
                    position: 'absolute',
                    outline: 'none',
                    top: `${rect.bottom - containerRect.top + window.scrollY}px`,
                    right: '0', 
                    zIndex: 1000,
                    cursor: 'pointer',
                });
            } 
            else if (isNearBottomEdge) {
            setButtonPosition({
                position: 'absolute',
                bottom: `${ window.scrollY + 50}px`,
                left: `${rect.left - containerRect.left + window.scrollX}px`,
                zIndex: 1000,
                cursor: 'pointer',
            });
            setInputPosition({
                position: 'absolute',
                outline: 'none',
                bottom: `${ window.scrollY + 50}px`,
                left: `${rect.left - containerRect.left + window.scrollX}px`,
                zIndex: 1000,
                cursor: 'pointer',
            });
            } else {
                setButtonPosition({
                    position: 'absolute',
                    top: `${rect.bottom - containerRect.top + window.scrollY}px`,
                    left: `${rect.left - containerRect.left + window.scrollX}px`,
                    zIndex: 1000,
                    cursor: 'pointer',
                });
                setInputPosition({
                    position: 'absolute',
                    outline: 'none',
                    top: `${rect.bottom - containerRect.top + window.scrollY}px`,
                    left: `${rect.left - containerRect.left + window.scrollX}px`,
                    zIndex: 1000,
                    cursor: 'pointer',
                });
            }
            setShowCanvasButton(true);
            setSelectedId(selectedMessageId);
            dispatch(setCanvasOptionAction({
                selectedMessageId,
                startIndex: adjustedStart,
                endIndex: adjustedEnd,
            }));
        } else {
            setShowCanvasButton(false);
        }
    }, [selectedAIModal]);

    const removeHighlight = useCallback(() => {
        const highlightedTexts = document.querySelectorAll('.highlighted-text');
        highlightedTexts.forEach((highlightedText) => {
            if (highlightedText.closest('pre, code')) {
                // Remove white text class
                highlightedText.classList.remove("bg-black", "text-white", "highlighted-text");
            } else {
                // Original logic for non-code highlights
                const parent = highlightedText.parentNode;
                while (highlightedText.firstChild) {
                    parent.insertBefore(highlightedText.firstChild, highlightedText);
                }
                parent.removeChild(highlightedText);
            }
        });
    }, []);

    const handleDeSelectionChanges = useCallback(() => {
        setShowCanvasBox(false);
        setShowCanvasButton(false);
        setSelectedId(null);
        selectionRef.current = null;
        removeHighlight();
    }, []);

    const handleAskWeam = useCallback (() => {
        setShowCanvasBox(true);
        setShowCanvasButton(false);
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        const range = selection.getRangeAt(0);
        separateSpanCreation(range);
        // Clear the selection
        selection.removeAllRanges();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target) &&
                (!canvasInputRef.current || !canvasInputRef.current.contains(event.target))
            ) {
                handleDeSelectionChanges();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return {
        showCanvasBox,
        buttonPosition,
        inputPosition,
        handleSelectionChanges,
        handleDeSelectionChanges,
        selectedId,
        selectionRef,
        removeHighlight,
        showCanvasButton,
        handleAskWeam,
        containerRef,
        canvasInputRef
    };
};

export default useCanvasInput;