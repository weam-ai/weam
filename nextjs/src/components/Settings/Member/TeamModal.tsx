import React, { useEffect, useState, useMemo } from 'react';
import { Controller } from 'react-hook-form';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import Label from '@/widgets/Label';
import ValidationError from '@/widgets/ValidationError';
import AutoSelectChip from '../../ui/AutoSelectChip';
import useUsers from '@/hooks/users/useUsers';
import AddTeam from '@/icons/AddTeam';
import { displayName } from '@/utils/common';
import CommonInput from '@/widgets/CommonInput';
import { PAGINATION, USER_STATUS } from '@/utils/constant';
import { getCurrentUser } from '@/utils/handleAuth';
import { updateTeamAction } from '@/actions/team';
import useServerAction from '@/hooks/common/useServerActions';
import Toast from '@/utils/toast';
const TeamModal = ({
    register,
    clearErrors,
    errors,
    control,
    handleSubmit,
    setFormValue,
    createTeam,
    team = null,
    isEdit = false,
    closeEdit,
    openAdd,
    closeAdd,
    addModal,
    isDirty,
    teamLoading,
    reset,
    watch,
    setTeams
}:any) => {
    const { getUsersList, users } = useUsers();
    const getLoggedInUser = useMemo(() => getCurrentUser(), []);

    const defaultUser = useMemo(
        () => ({
            email: getLoggedInUser.email,
            id: getLoggedInUser._id,
            fullname: displayName(getLoggedInUser),
            fname: getLoggedInUser?.fname,
            lname: getLoggedInUser?.lname,
            profile: getLoggedInUser?.profile,
        }),
        [getLoggedInUser]
    );

    const [filterInput,setFilterInput]=useState('')
    const [membersOptions, setMemberOptions] = useState([]);
    const [updateTeam, isUpdateTeamPending] = useServerAction(updateTeamAction);
    const handleTeamSubmit = async (payload) => {
        try {
            if (isEdit) {
                const response = await updateTeam({ ...payload, teamId: team._id });
                setTeams((prevTeams) => {
                    return prevTeams.map((pteam) =>
                        pteam._id === team._id
                            ? {
                                ...team,
                                teamName: payload.teamName,
                                teamUsers: payload.members,
                            }
                            : pteam
                    );
                });
                Toast(response.message);
                closeEdit();
               
            } else {
                await createTeam({ ...payload, members: payload.members });
                closeAdd();
               
            }
            reset();
        } catch (error) {
            console.error(`Error in handleTeamSubmit ::: ${error}`);
        }
    };

    useEffect(() => {
        const selectedMembers = watch('members') || [];
    
        if (isEdit) {
            const newOptions = users.reduce((acc, user) => {
                const isUserSelected = selectedMembers?.some(member => member.id === user._id);
                
                if (!isUserSelected) {
                    acc.push({
                        email: user.email,
                        id: user.id,
                        fullname: displayName(user),
                        fname: user?.fname,
                        lname: user?.lname,
                        profile: user?.profile,
                    });
                }
    
                return acc;
            }, []);
    
            setMemberOptions(newOptions);
        }
    }, [users, watch('members'), isEdit]);
      
    useEffect(() => {

        if (isEdit && team) {
            setFormValue('teamName', team.teamName);
            const mappedMembers = team?.teamUsers?.map((currUser, index) => ({
                email: currUser.email,
                id: currUser.id,
                fullname: displayName(currUser),
                fname: currUser?.fname,
                lname: currUser?.lname,
                profile: currUser?.profile,
                label: displayName(currUser),
                value: currUser.id,
                userId:currUser.id,
                ...(index == 0 && { isFixed: true }),
            }));
            setFormValue('members', mappedMembers);
        }

    
        if (isEdit) {
            const editOptionFilter = users.reduce((acc, curr) => {
                const isUserInTeam = team?.teamUsers?.some(
                    (editedUser) => editedUser?.id === curr?.id 
                );
    
                if (!isUserInTeam && curr.id !== getLoggedInUser?._id) {
                    acc.push({ ...curr, fullname: displayName(curr) });
                }
    
                return acc;
            }, []);
    
            setMemberOptions(editOptionFilter);
        } else {

            const currentMembers = watch('members') || [];

            const removedLoggedUser = users.filter((currUser) => currUser._id !== getLoggedInUser?._id);
            setMemberOptions(() => [
                ...removedLoggedUser.map((user) => ({
                    email: user.email,
                    id: user.id,
                    fullname: displayName(user),
                    fname: user?.fname,
                    lname: user?.lname,
                    profile: user?.profile,
                })),
            ]);
    
           
            const defaultUserWithFixedFlag = {
                ...defaultUser,
                isFixed: true,
                value: defaultUser.id,
                label: defaultUser.fullname,
            };
    
            
            const updatedMembers = currentMembers.filter(member => member.id !== getLoggedInUser?._id);
            setFormValue(
                'members',
                [...updatedMembers, defaultUserWithFixedFlag]
            );
            
        }
    }, [users, team, isEdit, addModal]);

     // Fetch users list
     useEffect(() => {
        getUsersList(
            USER_STATUS.ACCEPT,
            0,
            filterInput,
            1000,
            0,
            PAGINATION.SORTING,
            'id'
        );
    }, []);


    return (
        <>
            {!isEdit && (
                <div className="text-right mb-3">
                    <span
                        className="inline-flex items-center cursor-pointer px-3 py-2 rounded-md btn btn-outline-gray"
                        onClick={() => {
                            openAdd();
                            setFormValue('teamName', '');
                            setFormValue('members', '');
                        }}
                    >
                        <AddTeam
                            width={18}
                            height={18}
                            className="w-[26px] h-[18px] object-contain fill-white mr-1"
                        />
                        <span className="text-font-14 font-semibold ">
                            Add a Team
                        </span>
                    </span>
                </div>
            )}

            <Dialog open={addModal || isEdit} onOpenChange={isEdit ? closeEdit : closeAdd}>
                <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7">
                    <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                        <DialogTitle className="font-semibold flex items-center">
                            <AddTeam
                                width={16}
                                height={16}
                                className="w-[28px] h-[20px] me-3.5 fill-b2 inline-block align-text-top object-contain"
                            />
                            {isEdit ? 'Edit Team' : 'Add New Team'}
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-font-15 text-b6 block">
                            {isEdit
                                ? 'Edit the team information below'
                                : 'Create a new team by selecting members below'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-body flex flex-col flex-1 relative h-full px-7">
                        <div className="h-full pr-2.5 py-5">
                            <div className="mb-3">
                                <Label htmlFor="teamName" title="Team Name" />
                                <CommonInput
                                    type="text"
                                    className="default-form-input"
                                    id="teamName"
                                    placeholder="Enter team name"
                                    {...register('teamName')}
                                    maxLength={50}
                                />
                                <ValidationError
                                    errors={errors}
                                    field="teamName"
                                />
                                <div className="gap-2.5 mt-5 flex">
                                    <div className="flex-1 relative">
                                        <Controller
                                            name="members"
                                            control={control}
                                            render={({ field }) => (
                                                <AutoSelectChip
                                                    label="Add a Member"
                                                    name="members"
                                                    required={true}
                                                    options={membersOptions}
                                                    placeholder="Find Members"
                                                    optionBindObj={{
                                                        label: 'fullname',
                                                        value: 'id',
                                                    }}
                                                    inputValue={filterInput}
                                                    errors={errors}
                                                    handleSearch={
                                                        setFilterInput
                                                    }
                                                    setFormValue={setFormValue}
                                                    value={field.value || []}
                                                    defaultValue={defaultUser}
                                                    clearErrors={clearErrors}
                                                    {...field}
                                                />
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-center mt-10">
                                <button
                                    type="submit"
                                    className="flex btn btn-black"
                                    onClick={handleSubmit(handleTeamSubmit)}
                                    disabled={ !isDirty || teamLoading || isUpdateTeamPending}
                                >
                                    {isEdit ? 'Update a Team' : 'Add a Team'}
                                </button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default TeamModal;
