'use client';
import { cacheShareList } from '@/lib/slices/brain/brainlist';
import { setSelectedWorkSpaceAction } from '@/lib/slices/workspace/workspacelist';
import { RootState } from '@/lib/store';
import { getCurrentUser } from '@/utils/handleAuth';
import { decryptedPersist } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import { useDispatch, useSelector } from 'react-redux';
import { CommonList } from './BrainList';
import { useMemo, useState, useEffect } from 'react';
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
    
    const [leftBrains, setLeftBrains] = useState<string[]>([]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('leftBrains');
            if (stored) {
                setLeftBrains(JSON.parse(stored));
            }
        }
    }, []);

    if (!selectedWorkSpace || !selectedWorkSpace._id) {
        const persistWorkspace = decryptedPersist(WORKSPACE);
        const setData = persistWorkspace ? persistWorkspace : workspaceFirst;
        if (setData) {
            dispatch(setSelectedWorkSpaceAction(setData));
        }
        return null;
    }

    const selectedWorkSpaceBrainList = brainList.find(
        (brain) => brain._id.toString() === selectedWorkSpace?._id?.toString()
    );

    if (!selectedWorkSpaceBrainList) {
        return null;
    }

    const shareBrainList = selectedWorkSpaceBrainList.brains.filter(
        (brain) => {
            const isBrainOwner = brain.user.id === currentUser._id;
            const userLeftThisBrain = leftBrains.includes(brain._id);
            
            return brain.isShare && (isBrainOwner || !userLeftThisBrain);
        }
    );

    const dispatchPayload = shareBrainList;
    dispatch(cacheShareList(dispatchPayload));

    const handleBrainLeave = (brainId: string) => {
        const brainToLeave = selectedWorkSpaceBrainList.brains.find(b => b._id === brainId);
        
        if (brainToLeave && brainToLeave.user.id !== currentUser._id) {
            const updatedLeftBrains = [...leftBrains, brainId];
            setLeftBrains(updatedLeftBrains);
            
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('leftBrains', JSON.stringify(updatedLeftBrains));
            }
        }
    };

    return (
        <>
            {shareBrainList?.length > 0 && (
                <div className="w-full flex flex-col" >
                    {shareBrainList.map((b) => (
                        <CommonList
                            b={b}
                            key={b._id}
                            currentUser={currentUser}
                            closeSidebar={closeSidebar}
                            onBrainLeave={handleBrainLeave}
                        />
                    ))}
                </div>
            )}
        </>
    );
};

export default ShareBrainList;