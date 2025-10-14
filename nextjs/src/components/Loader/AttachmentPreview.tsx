import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import SnipperLoader from '@/icons/SnipperLoader';


export type LoaderProps = HTMLAttributes<HTMLDivElement> & {
    size?: number;
};

export const Loader = ({ className, size = 16, ...props }: LoaderProps) => (
    <div
        className={cn(
            'inline-flex animate-spin items-center justify-center',
            className
        )}
        {...props}
    >
        <SnipperLoader size={size} />
    </div>
);

export const AttachmentPreview = ({ attachment }) => {
    const { name } = attachment;

    return (

        <div
            className="group relative size-16 overflow-hidden rounded-lg border bg-muted mx-5 mt-3"
            data-testid="input-attachment-preview"
        >
            <div className="absolute inset-0 flex items-center justify-center border z-10 bg-black/10">
                <Loader size={16} />
            </div>
            <div className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-1 py-0.5 text-[10px] text-center z-20 text-b6">
                {name}
            </div>
        </div>
    );
};