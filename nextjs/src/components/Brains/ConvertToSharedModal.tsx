import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import BrainIcon from '@/icons/BrainIcon';
import AutoSelectChip from '../ui/AutoSelectChip';
import { Controller } from 'react-hook-form';
import useMembers from '@/hooks/members/useMembers';
import { showNameOrEmail } from '@/utils/common';
import { useTeams } from '@/hooks/team/useTeams';
import Label from '@/widgets/Label';
import { convertToSharedAction } from '@/actions/brains';
import useServerAction from '@/hooks/common/useServerActions';
import Toast from '@/utils/toast';
import { convertBrainToShared } from '@/lib/slices/brain/brainlist';
import { useForm } from 'react-hook-form';
import ValidationError from '@/widgets/ValidationError';

interface ConvertToSharedModalProps {
    open: boolean;
    close: () => void;
    brain: any;
}

const ConvertToSharedModal = ({ open, close, brain }: ConvertToSharedModalProps) => {
    const dispatch = useDispatch();
    const [searchMemberValue, setSearchMemberValue] = useState('');
    const [memberOptions, setMemberOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [searchTeamValue, setSearchTeamValue] = useState('');

    const { members, getMembersList } = useMembers();
    const selectedWorkSpace = useSelector((store: any) => store.workspacelist.selected);

    const {
        register,
        handleSubmit,
        formState: { errors },
        control,
        setValue: setFormValue,
        reset,
    } = useForm();

    const {
        getTeams,
        teams,
        control: teamControl,
        clearErrors: clearTeamErrors,
        errors: teamErrors,
    } = useTeams();

    const [runAction, isPending] = useServerAction(convertToSharedAction);

    useEffect(() => {
        const fetchUsers = () => {
            setMemberOptions([]);
            getMembersList({
                search: searchMemberValue,
                include: true,
                workspaceId: selectedWorkSpace._id,
            });
        };

        if (searchMemberValue == '') {
            setMemberOptions([]);
        }

        if (searchMemberValue) {
            const timer = setTimeout(fetchUsers, 1000);
            return () => clearTimeout(timer);
        }
    }, [searchMemberValue]);

    useEffect(() => {
        getTeams({ search: '', pagination: false });
    }, [open]);

    useEffect(() => {
        setMemberOptions(
            members.map((user) => ({
                email: user.email,
                id: user.id,
                fullname: showNameOrEmail(user),
                fname: user?.fname,
                lname: user?.lname,
            }))
        );

        setTeamOptions(
            teams.map((team) => ({
                teamName: team.teamName,
                id: team._id,
                teamUsers: team.teamUsers,
            }))
        );
    }, [members, teams]);

    useEffect(() => {
        getMembersList({});
    }, []);

    const onSubmit = async ({ members, teamsInput, customInstruction }) => {
        try {
            const payload = {
                members,
                teams: teamsInput,
                customInstruction,
            };
            
            const response = await runAction(brain._id, payload);
            
            if (response?.code === 'SUCCESS') {
                // Update Redux state
                dispatch(convertBrainToShared({
                    brainId: brain._id,
                    convertedBrain: response.data
                }));
                
                Toast('Converted to Shared! Members and teams now have access.');
                close();
            } else {
                Toast(response?.message || 'We couldn’t convert this brain. Please try again.');
            }
        } catch (error) {
            Toast('We couldn’t convert this brain. Please try again.');
        }
    };

    return (
        <>
            <Dialog open={open} onOpenChange={close}>
                <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-7 md:max-h-[calc(100vh-60px)] max-h-[calc(100vh-100px)] overflow-y-auto">
                    <DialogHeader className="rounded-t-10 px-[30px] py-6 border-b">
                        <DialogTitle className="font-semibold flex items-center">
                            <BrainIcon
                                width={24}
                                height={24}
                                className="w-6 h-auto object-contain fill-b2 me-3 inline-block align-text-top"
                            />
                            Convert to Shared Brain
                        </DialogTitle>
                        <DialogDescription className="small-description text-font-14 leading-[24px] text-b5 font-normal ml-9">
                            Convert "{brain?.title}" to a shared brain and invite team members to collaborate. 
                            This will make the brain accessible to selected users and teams.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="dialog-body flex flex-col flex-1 relative px-8 h-full">
                            <div>
                                <div className="h-full pr-2.5 pt-5">
                                    <div className="workspace-group h-full flex flex-col">
                                        <div className="relative md:mb-5 mb-3 md:px-2.5 px-0">
                                            <Label
                                                htmlFor="custom-instruction"
                                                title="Custom Instruction (Optional)"
                                                required={false}
                                            />
                                            <textarea
                                                className="default-form-input min-h-[100px] resize-vertical"
                                                id="custom-instruction"
                                                placeholder="Enter custom instructions for this brain..."
                                                {...register('customInstruction')}
                                                rows={4}
                                            />
                                            <ValidationError
                                                errors={errors}
                                                field={'customInstruction'}
                                            />
                                        </div>

                                        <div className="relative md:mb-5 mb-3 md:px-2.5 px-0">
                                            <Controller
                                                name="members"
                                                control={control}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        label="Add Members to Collaborate"
                                                        name="members"
                                                        options={memberOptions}
                                                        placeholder="Find Members"
                                                        optionBindObj={{
                                                            label: 'fullname',
                                                            value: 'id',
                                                        }}
                                                        inputValue={searchMemberValue}
                                                        errors={errors}
                                                        handleSearch={setSearchMemberValue}
                                                        setFormValue={setFormValue}
                                                        {...field}
                                                    />
                                                )}
                                            />
                                        </div>

                                        <div className="relative md:mb-5 mb-3 md:px-2.5 px-0">
                                            <Controller
                                                name="teamsInput"
                                                control={teamControl}
                                                render={({ field }) => (
                                                    <AutoSelectChip
                                                        label="Add Teams to Collaborate"
                                                        name="teamsInput"
                                                        options={teamOptions}
                                                        placeholder="Find Teams"
                                                        optionBindObj={{
                                                            label: 'teamName',
                                                            value: 'id',
                                                        }}
                                                        inputValue={searchTeamValue}
                                                        errors={teamErrors}
                                                        handleSearch={setSearchTeamValue}
                                                        setFormValue={setFormValue}
                                                        clearErrors={clearTeamErrors}
                                                        required={false}
                                                        {...field}
                                                    />
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-center my-[30px]">
                                <button 
                                    className="btn btn-black" 
                                    type="submit" 
                                    disabled={isPending}
                                >
                                    {isPending ? 'Converting...' : 'Convert to Shared'}
                                </button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ConvertToSharedModal;
