import React, { ForwardedRef, TextareaHTMLAttributes } from 'react';

type TextAreaBoxProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    message: string;
    handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    isDisable: boolean;
}

const TextAreaBox = React.forwardRef(({
    message,
    handleChange,
    handleKeyDown,
    isDisable,
    ...rest
}: TextAreaBoxProps, ref: ForwardedRef<HTMLTextAreaElement>) => {
    return (
        <textarea
            id="textarea"
            placeholder="Chat with Weam... type '/' for prompts and '@' to mention an agent"
            className="bg-transparent w-full resize-none focus:outline-none focus:ring-0 focus-visible:ring-0 py-3 text-font-14 px-5 placeholder-b6 min-h-14 md:min-h-[unset]"
            value={message}
            rows={Math.max(message?.split('\n').length, 1)}
            onChange={handleChange}
            ref={ref}
            style={{
                resize: 'none',
                height: 'auto',
                maxHeight: '200px',
            }}
            onKeyDown={handleKeyDown}
            disabled={isDisable}
            autoFocus
            {...rest}
        ></textarea>
    );
});

export default TextAreaBox;