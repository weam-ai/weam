'use client';
import { cacheShareList } from '@/lib/slices/brain/brainlist';
import { setSelectedWorkSpaceAction } from '@/lib/slices/workspace/workspacelist';
import { RootState } from '@/lib/store';
import { getCurrentUser } from '@/utils/handleAuth';
import { decryptedPersist } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import { useDispatch, useSelector } from 'react-redux';
import { CommonList } from './BrainList';
import { useMemo, useRef, useState, useEffect } from 'react';
import { AllBrainListType } from '@/types/brain';
import { WorkspaceListType } from '@/types/workspace';
import { useSidebar } from '@/context/SidebarContext';


type ShareBrainListProps = {
    brainList: AllBrainListType[];
    workspaceFirst?: WorkspaceListType;
}

const ShareBrainList = ({ brainList, workspaceFirst }: ShareBrainListProps) => {
    const dispatch = useDispatch();
    const { closeSidebar } = useSidebar();
    const selectedWorkSpace = useSelector(
        (store: RootState) => store.workspacelist.selected
    );
    const currentUser = useMemo(() => getCurrentUser(), []);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(false);

    if (!selectedWorkSpace || !selectedWorkSpace._id) {
        const persistWorkspace = decryptedPersist(WORKSPACE);
        const setData = persistWorkspace ? persistWorkspace : workspaceFirst;
        dispatch(setSelectedWorkSpaceAction(setData));
    }

    const selectedWorkSpaceBrainList = brainList.find(
        (brain) => brain._id.toString() === selectedWorkSpace?._id?.toString()
    );

    const shareBrainList = selectedWorkSpaceBrainList?.brains.filter(
        (brain) => brain.isShare
    );

    const dispatchPayload = shareBrainList ? shareBrainList : [];
    const hasMoreBrains = shareBrainList && shareBrainList.length > 6;

    useEffect(() => {
        const handleScroll = () => {
            if (scrollRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                const atBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px threshold
                setIsAtBottom(atBottom);
            }
        };

        const scrollElement = scrollRef.current;
        if (scrollElement) {
            scrollElement.addEventListener('scroll', handleScroll);
            // Check initial state
            handleScroll();
        }

        return () => {
            if (scrollElement) {
                scrollElement.removeEventListener('scroll', handleScroll);
            }
        };
    }, [shareBrainList]);

    dispatch(cacheShareList(dispatchPayload));
    return (
        <>
            {shareBrainList?.length > 0 && (
                <div className={`brain-list-wrapper w-full flex flex-col relative ${hasMoreBrains && !isAtBottom ? 'has-more-brains' : ''}`}>
                    <div ref={scrollRef} className="brain-list-scroll w-full flex flex-col">
                        {shareBrainList.map((b) => (
                            <CommonList
                                b={b}
                                key={b._id}
                                currentUser={currentUser}
                                closeSidebar={closeSidebar}
                            />
                        ))}
                    </div>
                    {hasMoreBrains && !isAtBottom && <div className="brain-list-blur"></div>}
                </div>
            )}
        </>
    );
};

export default ShareBrainList;