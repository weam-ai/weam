import commonApi from '@/api';
import {
    addToPrivateList,
    addToShareList,
    cachePrivateList,
    cacheShareList,
    archiveBrainList,
} from '@/lib/slices/brain/brainlist';
import {
    addMemberBrainKeys,
    addPersonalBrainKeys,
    addSharedBrainKeys,
    addTeamBrainKeys,
} from '@/schema/brain';
import { workspaceTeamSchema } from '@/schema/team';
import {
    updateObjectInExistingArray,
    removeObjectFromArray,
    getDefaultSlug,
} from '@/utils/common';
import {
    DEFAULT_SORT,
    GENERAL_BRAIN_TITLE,
    MODULES,
    MODULE_ACTIONS,
    ROLE_TYPE,
} from '@/utils/constant';
import { getCurrentUser } from '@/utils/handleAuth';
import { decryptedPersist, persistBrainData, retrieveBrainData } from '@/utils/helper';
import { WORKSPACE } from '@/utils/localstorage';
import Toast from '@/utils/toast';
import { yupResolver } from '@hookform/resolvers/yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

const sharedDefaultValue = {
    title: '',
    members: [],
    teamsInput: [],
    customInstruction: '',
};
const addMemberDefaultValue:any = {
    members: [],
};
const personalDefaultValue:any = {
    title: '',
    customInstruction: '',
};

const addTeamDefaultValue:any = {
    teamsInput:[]
}
const useBrains = ({ isShare, addMember, addTeam = false }:any) => {
   
    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        setValue: setFormValue,
        reset,
    } = useForm({
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: addMember
            ? addMemberDefaultValue
            : isShare
            ? sharedDefaultValue
            : addTeam
            ? addTeamDefaultValue
            : personalDefaultValue,
        resolver: addMember
            ? yupResolver(addMemberBrainKeys)
            : isShare
            ? yupResolver(addSharedBrainKeys)
            : addTeam
            ? yupResolver(addTeamBrainKeys)
            : yupResolver(addPersonalBrainKeys),
    });

    const user = getCurrentUser();

    const dispatch = useDispatch();
    const cacheShare = useSelector((store:any) => store.brain.shareList);
    const cachePrivate = useSelector((store:any) => store.brain.privateList);
    const archiveBrains = useSelector((store:any) => store.brain.archiveBrains);
    const selectedWorkSpace = decryptedPersist(WORKSPACE);

    const [shareLoading, setShareLoading] = useState(false);
    const [privateLoading, setPrivateLoading] = useState(false);
    const companyId =
        user.roleCode === ROLE_TYPE.COMPANY ? user.company.id : user.invitedBy;

    const getBrainList = async () => {
        try {
                setShareLoading(true);
                const response = await commonApi({
                    action: MODULE_ACTIONS.LIST,
                    prefix: MODULE_ACTIONS.WEB_PREFIX,
                    module: MODULES.BRAINSUSER,
                    common: true,
                    data: {
                        options: {
                            sort: { createdAt: DEFAULT_SORT },
                            pagination: false,
                        },
                        query: {
                            // isShare: true,
                            workspaceId: selectedWorkSpace?._id,
                            deletedAt: {
                                $exists: false,
                            },
                        },
                    },
                });

                const shareList=response?.data?.filter((currBrain)=>currBrain.isShare)
                const privateList = response?.data?.filter((currBrain)=>!currBrain.isShare)
                dispatch(cacheShareList(shareList));
                dispatch(cachePrivateList(privateList))

                const persistBrain = retrieveBrainData()

                if(!persistBrain && response.data.length > 0){
                    const setData = response.data?.filter((currBrain)=>currBrain.slug==getDefaultSlug(user) && currBrain)[0];
                    persistBrainData(setData)
                }
        } catch (error) {
            console.log('error: ', error);
        } finally {
            setShareLoading(false);
        }
    };

    const getArchiveBrainList = async () => {
        try {
            setPrivateLoading(true);
            const response = await commonApi({
                action: MODULE_ACTIONS.LIST,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                common: true,
                data: {
                    options: {
                        sort: { createdAt: DEFAULT_SORT },
                        pagination: false,
                        populate: [
                            {
                                path: 'workspaceId',
                                select: 'title',
                            },
                        ],
                    },
                    query: {
                        // workspaceId: selectedWorkSpace._id,
                        companyId: companyId,
                        'user.id':
                            user?.roleCode == ROLE_TYPE.USER
                                ? user?._id
                                : undefined,
                        deletedAt: {
                            $exists: true,
                        },
                    },
                },
            });
            dispatch(archiveBrainList(response.data));
        } catch (error) {
            console.log('error: ', error);
        } finally {
            setPrivateLoading(false);
        }
    };

    const updateBrain = async (data, id) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.UPDATE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                data,
                common: true,
                parameters: [id],
            });
            Toast(response.message);

            if (data?.isShare) {
                const updatedObj = updateObjectInExistingArray(
                    cacheShare,
                    response?.data
                );
                dispatch(
                    addToShareList({ type: 'update', payload: updatedObj })
                );
                dispatch(cacheShareList(updatedObj));
            } else {
                const updatedObj = updateObjectInExistingArray(
                    cachePrivate,
                    response?.data
                );
                dispatch(
                    addToPrivateList({ type: 'update', payload: updatedObj })
                );
                dispatch(cachePrivateList(updatedObj));
            }

            return response
        } catch (error) {
            console.log('error: ', error);
        } finally {
            close();
        }
    };

    const restoreBrain = async (payload) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.RESTORE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                common: true,
                parameters: [payload?._id],
            });
            Toast(response.message);
            const updatedObj = removeObjectFromArray(
                archiveBrains,
                payload?._id
            );
            dispatch(archiveBrainList(updatedObj));

            const brainWorkspace = cacheShare.find(
                (brain) => brain?.workspaceId == selectedWorkSpace?._id
            );
            if (payload?.isShare) {
                brainWorkspace
                    ? dispatch(cacheShareList([...cacheShare, payload]))
                    : '';
            } else {
                brainWorkspace
                    ? dispatch(cachePrivateList([...cachePrivate, payload]))
                    : '';
            }
        } catch (error) {
            console.log('error: ', error);
        } finally {
            close();
        }
    };

    const deleteBrain = async (data, slug, id, closeModal) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.DELETE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                data,
                common: true,
                parameters: [id],
            });
            Toast(response.message);

            if (data?.isShare) {
                const updatedObj = removeObjectFromArray(cacheShare, id);
                dispatch(
                    addToShareList({ type: 'delete', payload: updatedObj })
                );
            } else {
                const updatedObj = removeObjectFromArray(cachePrivate, id);
                dispatch(
                    addToPrivateList({ type: 'delete', payload: updatedObj })
                );
            }
            closeModal();
        } catch (error) {
            console.log('error: ', error);
        } finally {
            close();
        }
    };

    const hardDeleteBrain = async (data, slug, id, closeModal) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.DELETE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                data:{...data,isHardDelete:true},
                common: true,
                parameters: [id]
                
            });
            Toast(response.message);

            const updatedObj = removeObjectFromArray(archiveBrains, id);
            dispatch(archiveBrainList(updatedObj));
            closeModal();
        } catch (error) {
            console.log('error: ', error);
        } finally {
            close();
        }
    };

    const hardDeleteAllBrain = async (closeModal) => {
        try {
            const response = await commonApi({
                action: MODULE_ACTIONS.DELETEALL,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                common: true,
            });
            Toast(response.message);
            dispatch(archiveBrainList([]));
            closeModal();
        } catch (error) {
            console.log('error: ', error);
        } finally {
            close();
        }
    };

    const createBrain = async (obj, close) => {
        
        try {
            const data:any = {
                title: obj.title,
                isShare: obj.isShare,
                workspaceId: obj?.workspaceId || selectedWorkSpace._id,
            };
            if (obj.isShare) {
                data.shareWith = obj.members.map((user) => {
                    return {
                        email: user.email,
                        id: user.id,
                        fname: user?.fname,
                        lname: user?.lname,
                    };
                });
                data.teams = obj.teamsInput.map((currTeam) => ({
                    id: currTeam.id,
                    teamName: currTeam.teamName,
                    teamUsers: currTeam.teamUsers,
                }));
            }
            const response = await commonApi({
                action: MODULE_ACTIONS.CREATE,
                prefix: MODULE_ACTIONS.WEB_PREFIX,
                module: MODULES.BRAINS,
                data,
                common: true,
            });

            if(obj.title !== GENERAL_BRAIN_TITLE){
                Toast(response.message);
                if (obj.isShare) {
                    dispatch(
                        addToShareList({ type: 'add', payload: response.data })
                    );
                    dispatch(cacheShareList([response.data, ...cacheShare]));
                } else {
                    dispatch(
                        addToPrivateList({ type: 'add', payload: response.data })
                    );
                    dispatch(cachePrivateList([response.data, ...cachePrivate]));
                }
            }
            return true;
        } catch (error) {
            console.log('error: ', error);
        } finally {
            close();
        }
    };

    return {
        register,
        handleSubmit,
        reset,
        cacheShare,
        errors,
        createBrain,
        shareLoading,
        privateLoading,
        control,
        setFormValue,
        updateBrain,
        deleteBrain,
        getArchiveBrainList,
        hardDeleteBrain,
        hardDeleteAllBrain,
        restoreBrain,
        getBrainList
    };
};

export default useBrains;
