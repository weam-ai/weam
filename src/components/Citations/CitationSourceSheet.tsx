'use client';
import { Sheet, SheetClose, SheetContent } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import Close from '@/icons/Close';
import { CitationResponseType } from '@/types/chat';

type CitationSourceSheetProps = {
    citations: CitationResponseType[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
};

type CitationItemProps = {
    citations: CitationResponseType[];
};

export function CitationItem({ citations }: CitationItemProps) {
    return (
        <ScrollArea className="h-[calc(100vh-100px)] px-4">
            <div className="space-y-4">
                {citations.map((citation, index) => {
                    const domain = new URL(citation.url).hostname;
                    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
                    return (
                        <div key={index} className="group">
                            <div
                                className="flex gap-3 p-3 rounded-lg hover:bg-12 transition-colors cursor-pointer"
                                onClick={() =>
                                    window.open(citation.url, '_blank')
                                }
                            >
                                <div className="flex-shrink-0 mt-1">
                                    <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                                        <img
                                            src={favicon}
                                            alt="favicon"
                                            className="w-5 h-5 rounded-full"
                                        />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="text-b5 text-sm font-medium">
                                        {domain}
                                    </div>
                                    <h3 className="text-blue text-sm font-medium leading-tight line-clamp-2 group-hover:text-blue-300 transition-colors">
                                        {citation.title}
                                    </h3>
                                    <p className="text-black text-sm leading-relaxed line-clamp-3">
                                        {citation.snippet}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}

function CitationSourceSheet({
    isOpen,
    onOpenChange,
    citations,
}: CitationSourceSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent
                className="sm:max-w-md"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="flex flex-col h-svh">
                    <div className="flex items-center justify-between p-4">
                        <h5
                            className="mb-0 text-font-16 font-bold text-b2"
                            id="threadChatOffcanvasLabel"
                        >
                            Sources
                        </h5>
                        <div className="offcanvas-header-right ml-auto flex items-center gap-2.5">
                            <SheetClose asChild>
                                <button
                                    type="button"
                                    aria-labelledby="close"
                                    className="md:w-10 md:h-10 md:min-w-10 w-8 h-8 rounded-full p-1 flex items-center justify-center border border-b11 hover:bg-b11"
                                >
                                    <Close
                                        width={'16'}
                                        height={'16'}
                                        className="fill-b2 md:h-4 md:w-4 w-3 h-3 object-contain"
                                    />
                                </button>
                            </SheetClose>
                        </div>
                    </div>
                    <div className="overflow-y-auto h-full flex flex-col">
                        <CitationItem citations={citations} />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

export default CitationSourceSheet;
