import { memo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Globe } from "lucide-react"

const MessageSources = ({ sources, query, isSearchOpen, setIsSearchOpen }) => {
    return (
        <div className="">
            <Collapsible open={isSearchOpen} onOpenChange={setIsSearchOpen} >
                <CollapsibleTrigger asChild >
                    <button
                        className="w-full justify-between p-0 h-auto bg-transparent hover:bg-transparent"
                    >
                        <div className="flex items-center gap-2 text-gray-300" >
                            <span className="text-sm" >
                                {sources.length > 0 ? "Sources" : "Sources"}
                            </span>
                            {isSearchOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                    </button>
                </CollapsibleTrigger>
                < CollapsibleContent className="mt-3" >
                    <div className="bg-gray-900 rounded-lg p-4 space-y-4 border border-gray-700" >
                        {/* Search Summary Badge */}
                        < div className="inline-flex items-center gap-2 bg-black rounded-full px-3 py-1 text-sm text-white" >
                            <span>{sources.length || 3} sources </span>
                            <span>•</span>
                            <span>
                                {query}
                            </span>
                        </div>
                        <div className="space-y-2" >
                            <div className="flex items-center gap-2 text-gray-300" >
                                <Globe className="w-4 h-4" />
                                <span className="text-font-12 font-medium" > Searched the web </span>
                            </div>

                            < div className="space-y-2" >
                                <div className="flex items-center gap-2 text-gray-400" >
                                    <span className="text-font-12" > {query} </span>
                                </div>

                                < div className="flex flex-wrap gap-2 text-font-12" >
                                    {
                                        sources.map((source, index) => {
                                            const urlObj = new URL(source.url);
                                            const domain = urlObj.hostname;
                                            const faviconUrl = `https://www.google.com/s2/favicons?sz=32&domain=${domain}`;

                                            return (
                                                <div
                                                    key={index}
                                                    className="inline-flex items-center gap-2 bg-gray-800 rounded-full px-3 py-1 text-xs text-gray-300 border border-gray-600"
                                                >
                                                    <img src={faviconUrl} alt="favicon" className="w-4 h-4" />
                                                    <span className="font-medium">{domain}</span>
                                                    <span className="text-gray-400">|</span>
                                                    <span className="truncate max-w-[120px]">{source.title}</span>
                                                </div>
                                            );
                                        })
                                    }
                                    {
                                        sources.length > 2 && (
                                            <div className="inline-flex items-center gap-1 bg-gray-800 rounded-full px-2 py-1 text-xs text-gray-400 border border-gray-600" >
                                                <span>🔗</span>
                                                < span > {sources.length - 2} more </span>
                                            </div>
                                        )
                                    }
                                </div>
                            </div>
                        </div>


                        {/* Loading State */}
                        {/* {
                            message.isSearching && (
                                <div className="flex items-center gap-3 text-gray-400" >
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" > </div>
                                    < span className="text-sm" > Searching for the latest information...</span>
                                </div>
                            )
                        } */}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
};

export default memo(MessageSources);