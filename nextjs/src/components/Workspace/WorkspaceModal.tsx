import React, { useEffect, useState } from 'react';
import useWorkspace from '@/hooks/workspace/useWorkspace';
import ValidationError from '@/widgets/ValidationError';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import WorkSpaceIcon from '@/icons/WorkSpaceIcon';
import Label from '@/widgets/Label';
import AutoSelectChip from '../ui/AutoSelectChip';
import { Controller } from 'react-hook-form';
import { showNameOrEmail } from '@/utils/common';
import { useTeams } from '@/hooks/team/useTeams';
import useServerAction from '@/hooks/common/useServerActions';
import { createWorkspaceAction } from '@/actions/workspace';
import Toast from '@/utils/toast';

const AddWorkspaceModal = ({ open, close }) => {
    const {
        users,
        getWorkSpaceUsers,
        register,
        handleSubmit,
        errors,
        control,
        setFormValue,
    } = useWorkspace({ addMember: false });
    const [runAction, isPending] = useServerAction(createWorkspaceAction)

    const {
        getTeams,
        teams,
        control: teamControl,
        errors: teamErrors,
    } = useTeams();

    const [memberOptions, setMemberOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [searchTeamValue, setSearchTeamValue] = useState('');
    const [searchMemberValue, setSearchMemberValue] = useState('');
    
    useEffect(() => {
        getTeams({ search: '', pagination: false });
    }, [open]);
    
    
    useEffect(() => {
        setMemberOptions(
            users.map((user) => ({
                email: user.email,
                id: user.id,
                fullname: showNameOrEmail(user),
                fname: user?.fname,
                lname: user?.lname,
                roleCode: user?.roleCode
            }))
        );

        setTeamOptions(
            teams.map((team) => ({
                teamName: team.teamName,
                id: team._id,
                teamUsers: team.teamUsers,
            }))
        );
    }, [users, teams]);

    const onSubmit = async ({ role, members, teamsInput, title }) => {
        const response = await runAction({ members, title, teamsInput, role });
        Toast(response.message);
        close();
    };

    useEffect(() => {
        getWorkSpaceUsers('');
    }, []);

    return (
        <Dialog open={open} onOpenChange={close}>
            <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7 max-h-[calc(100vh-60px)] overflow-y-auto">
                <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                    <DialogTitle className="font-semibold flex items-center">
                        <WorkSpaceIcon
                            width={24}
                            height={(24 * 22) / 25}
                            className="w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top"
                        />
                        Add a Workspace
                    </DialogTitle>
                    <DialogDescription>
                        <span className="mt-3 text-font-14 max-md:text-font-12 text-b6 block">
                        {`Create your workspace to enhance productivity across your organization. Each workspace allows for dedicated areas where teams can focus on their projects, organize tasks, and share resources effectively. This setup promotes effective collaboration based on your team's needs.`}
                        </span>
                    </DialogDescription>
                </DialogHeader>
                <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="h-full w-full max-h-[60dvh]">
                            <div className="h-full pr-2.5 pt-5">
                                <div className="workspace-group h-full flex flex-col">
                                    <div className="relative mb-5 px-2.5">
                                        <Label
                                            htmlFor="workspace-name"
                                            title="Workspace Name"
                                        />
                                        <input
                                            type="text"
                                            className="default-form-input"
                                            id="workspace-name"
                                            placeholder="Enter Workspace Name"
                                            {...register('title')}
                                            maxLength={50}
                                        />
                                        <ValidationError
                                            errors={errors}
                                            field="title"
                                        />
                                    </div>
                                    <div className="px-2.5 gap-2.5 flex">
                                        <div className="flex-1 relative">
                                            <Controller
                                                name="members"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        label={'Add a Member'}
                                                        name={'members'}
                                                        required={false}
                                                        options={memberOptions}
                                                        placeholder="Find Members"
                                                        optionBindObj={{
                                                            label: 'fullname',
                                                            value: 'id',
                                                        }}
                                                        inputValue={
                                                            searchMemberValue
                                                        }
                                                        errors={errors}
                                                        handleSearch={
                                                            setSearchMemberValue
                                                        }
                                                        setFormValue={
                                                            setFormValue
                                                        }
                                                        {...field}
                                                    />
                                                )}
                                            />

                                            <div className="mt-5">
                                                <Controller
                                                    name="teamsInput"
                                                    control={teamControl}
                                                    render={({ field }) => (
                                                        <AutoSelectChip
                                                            label={'Add a Team'}
                                                            name={'teamsInput'}
                                                            required={false}
                                                            options={
                                                                teamOptions
                                                            }
                                                            placeholder="Find Teams"
                                                            optionBindObj={{
                                                                label: 'teamName',
                                                                value: 'id',
                                                            }}
                                                            inputValue={
                                                                searchTeamValue
                                                            }
                                                            errors={teamErrors}
                                                            handleSearch={
                                                                setSearchTeamValue
                                                            }
                                                            setFormValue={
                                                                setFormValue
                                                            }
                                                            {...field}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            <div className="flex justify-center mt-5 mb-5">
                                                <button
                                                    type="submit"
                                                    className="btn btn-black"
                                                    disabled={isPending}
                                                >
                                                    {isPending ? 'Adding...' : 'Add a Workspace'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>                
            </DialogContent>
        </Dialog>
    );
};

export default AddWorkspaceModal;