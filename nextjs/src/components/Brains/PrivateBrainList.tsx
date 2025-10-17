'use client';
import { cachePrivateList } from '@/lib/slices/brain/brainlist';
import { setSelectedWorkSpaceAction } from '@/lib/slices/workspace/workspacelist';
import { RootState } from '@/lib/store';
import { getCurrentUser } from '@/utils/handleAuth';
import { decryptedPersist } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import { useDispatch, useSelector } from 'react-redux';
import { Accordion } from '../ui/accordion';
import { CommonList } from './BrainList';
import { useMemo } from 'react';
import { AllBrainListType } from '@/types/brain';
import { WorkspaceListType } from '@/types/workspace';
import { useSidebar } from '@/context/SidebarContext';

type PrivateBrainListProps = {
    brainList: AllBrainListType[];
    workspaceFirst?: WorkspaceListType;
}

const PrivateBrainList = ({ brainList, workspaceFirst }: PrivateBrainListProps) => {
    const dispatch = useDispatch();
    const { closeSidebar } = useSidebar();
    const selectedWorkSpace = useSelector((store: RootState) => store.workspacelist.selected);


    if (!selectedWorkSpace || !selectedWorkSpace._id) {
        const persistWorkspace = decryptedPersist(WORKSPACE);
        const setData = persistWorkspace ? persistWorkspace : workspaceFirst;
        dispatch(setSelectedWorkSpaceAction(setData));
    }

    const currentUser = useMemo(() => getCurrentUser(), []);

    const selectedWorkSpaceBrainList = brainList.find(
        (brain) => brain._id.toString() === selectedWorkSpace?._id?.toString()
    );

    const privateBrains = selectedWorkSpaceBrainList?.brains.filter(brain => !brain.isShare && brain.user.email === currentUser.email);

    const dispatchPayload = privateBrains ? privateBrains : [];

    dispatch(cachePrivateList(dispatchPayload));
    return (
        <>
            {privateBrains?.length > 0 && (
                <div className="w-full flex flex-col">
                    {privateBrains.map((b) => (
                        <CommonList key={b._id} b={b} currentUser={currentUser} closeSidebar={closeSidebar} />
                    ))}
                </div>
            )}
        </>
    );
};

export default PrivateBrainList;