import LockIcon from '@/icons/Lock';
import { ShareBrainIcon } from '@/icons/Share';
import { useCallback, useState, useEffect } from 'react';
import useBrains from '@/hooks/brains/useBrains';
import ValidationError from '@/widgets/ValidationError';
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
import { useSelector } from 'react-redux';
import { showNameOrEmail } from '@/utils/common';
import { useTeams } from '@/hooks/team/useTeams';
import Label from '@/widgets/Label';
import { createBrainAction } from '@/actions/brains';
import useServerAction from '@/hooks/common/useServerActions';
import Toast from '@/utils/toast';
const BrainButtons = ({ text, share, click, selectedOption, onChange }:any) => {
    const buttonClick = (e) => {
        e.stopPropagation();
        click();
    };
    const handleRadioChange = () => {
        onChange(text);
    };

    return (
        <div className="relative">
            <label
                className="group cursor-pointer btn btn-outline-gray max-md:text-font-14 hover:bg-green hover:border-green active:bg-green active:border-green checked:bg-green checked:border-green has-[:checked]:text-b15 has-[:checked]:bg-green has-[:checked]:border-green"
                htmlFor={text}
            >
                <input
                    className="group-button peer"
                    type="radio"
                    name="flexRadioDefault"
                    id={text}
                    value={text}
                    checked={selectedOption === text}
                    onChange={handleRadioChange}
                    onClick={buttonClick}
                />
                {share ? (
                    <ShareBrainIcon
                        className="fill-b5 peer-checked:fill-white group-hover:fill-white group-active:fill-white transition duration-150 ease-in-out inline-block md:mr-2.5 mr-1 w-auto h-[18px] object-contain"
                        width={'20'}
                        height={'18'}
                    />
                ) : (
                    <LockIcon
                        className="fill-b5 peer-checked:fill-white group-hover:fill-white group-active:fill-white transition duration-150 ease-in-out inline-block md:mr-2.5 mr-1 w-auto h-[18px] object-contain"
                        width={'14'}
                        height={'18'}
                    />
                )}
                {text}
            </label>
        </div>
    );
};

const BrainModal = ({ open, close, isPrivate }) => {
    const [searchMemberValue, setSearchMemberValue] = useState('');
    const [memberOptions, setMemberOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [searchTeamValue, setSearchTeamValue] = useState('');

    const { members, getMembersList, loading } = useMembers();
    const selectedWorkSpace = useSelector(
        (store:any) => store.workspacelist.selected
    );

    const [isShare, setIsShare] = useState(!isPrivate);

    const {
        register,
        handleSubmit,
        errors,
        createBrain,
        control,
        setFormValue,
    } = useBrains({ isShare});

    const {
        getTeams,
        teams,
        control: teamControl,
        clearErrors: clearTeamErrors,
        errors: teamErrors,
      
    } = useTeams();

    const [runAction, isPending] = useServerAction(createBrainAction);

    const handlePersonal = useCallback(() => {
        setIsShare(false);
    }, [isShare]);
    const handleShare = useCallback(() => {
        setIsShare(true);
    }, [isShare]);

    const [selectedOption, setSelectedOption] = useState(
        isPrivate ? 'Personal' : 'Shared'
    );

    const handleRadioChange = (value) => {
        setSelectedOption(value);
    };

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

 const onSubmit = async ({ members, title, teamsInput, customInstruction }) => {
        const payload = isShare ? { isShare, members, title, teamsInput, customInstruction } : { isShare, title, customInstruction };
        const response = await runAction({ ...payload, workspaceId: selectedWorkSpace._id });
        Toast(response.message);
        close();
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
                            {isShare ? (
                                <>
                                    Add a Shared Brain
                                </>
                            ): <>
                            Add a Private Brain
                            </>}
                        </DialogTitle>
                        <DialogDescription className="small-description text-font-14 leading-[24px] text-b5 font-normal ml-9">
                            {isShare ? (
                                "A Shared Brain is designed for team collaboration. It provides a space where members can work together on projects, share resources, and streamline communication, enhancing collective productivity."
                            ) : (
                                "A Private Brain is your personal workspace for organizing information and tasks. Use it to focus on individual projects or ideas without distraction, giving you the freedom to manage your work as you see fit."
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="dialog-body flex flex-col flex-1 relative px-8 h-full ">
                            {/*Modal Body start */}
                            <div >
                                <div className="h-full pr-2.5 pt-5">
                                    <div className="workspace-group h-full flex flex-col ">
                                        <div className="relative md:mb-5 mb-3 md:px-2.5 px-0">
                                            <Label
                                                htmlFor="brain-name"
                                                title="Brain Name"
                                            />
                                            <input
                                                type="text"
                                                className="default-form-input"
                                                id="brain-name"
                                                placeholder="Enter Brain Name"
                                                {...register('title')}
                                                maxLength={50}
                                            />
                                            <ValidationError
                                                errors={errors}
                                                field={'title'}
                                            />
                                        </div>
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
                                        <div>
                                            {isShare && (
                                                <div className="relative md:mb-5 mb-3 md:px-2.5 px-0">
                                                    <Controller
                                                        name="members"
                                                        control={control}
                                                        render={({
                                                            field,
                                                        }) => (
                                                            <AutoSelectChip
                                                                label={
                                                                    'Add Members to Collaborate'
                                                                }
                                                                name={
                                                                    'members'
                                                                }
                                                                options={
                                                                    memberOptions
                                                                }
                                                                placeholder="Find Members"
                                                                optionBindObj={{
                                                                    label: 'fullname',
                                                                    value: 'id',
                                                                }}
                                                                inputValue={
                                                                    searchMemberValue
                                                                }
                                                                errors={
                                                                    errors
                                                                }
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
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            {isShare && (
                                                <div className="relative md:mb-5 mb-3 md:px-2.5 px-0">
                                                    <Controller
                                                        name="teamsInput"
                                                        control={
                                                            teamControl
                                                        }
                                                        render={({
                                                            field,
                                                        }) => (
                                                            <AutoSelectChip
                                                                label={
                                                                    'Add Teams to Collaborate'
                                                                }
                                                                name={
                                                                    'teamsInput'
                                                                }
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
                                                                errors={
                                                                    teamErrors
                                                                }
                                                                handleSearch={
                                                                    setSearchTeamValue
                                                                }
                                                                setFormValue={
                                                                    setFormValue
                                                                }
                                                                clearErrors={
                                                                    clearTeamErrors
                                                                }
                                                                required={false}
                                                                {...field}
                                                            />
                                                        )}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/*Modal Body End */}
                            {/* Modal Chat Action Button Start */}
                            <div className="flex items-center justify-center md:gap-5 gap-3 mt-3">
                                <BrainButtons
                                    text={'Personal'}
                                    click={handlePersonal}
                                    selectedOption={selectedOption}
                                    onChange={handleRadioChange}
                                />
                                <BrainButtons
                                    text={'Shared'}
                                    share={true}
                                    click={handleShare}
                                    selectedOption={selectedOption}
                                    onChange={handleRadioChange}
                                />
                            </div>
                            {/* Modal Chat Action Button End */}
                            {/*Modal Footer Start */}
                            <div className="flex items-center justify-center my-[30px]">
                                <button className="btn btn-black" type="submit" disabled={isPending}>
                                    Add Brain
                                </button>
                            </div>
                            {/*Modal Footer End */}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default BrainModal;