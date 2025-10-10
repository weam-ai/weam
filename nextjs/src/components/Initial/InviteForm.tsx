import React, { useState } from 'react';
import Label from '@/widgets/Label';
import CommonSelectInput from '@/widgets/CommonSelectInput';
import ChipInput from 'material-ui-chip-input';
import { REGEX } from '@/utils/helper';
import { useStyles } from '../Shared/InviteMemberModal';
import useInvite from '@/hooks/auth/useInvite';
import ValidationError from '@/widgets/ValidationError';
import { useRouter } from 'next/navigation';
import routes from '@/utils/routes';

const RoleUser = [
    { value: 'Manager', label: 'Manager', code: 'MANAGER' },
    { value: 'User', label: 'User', code: 'USER' },
]

const InviteForm = () => {
    const router = useRouter();
    const classes = useStyles();
    const [users, setUsers] = useState([]);
    const [_error, setError] = useState('');
    const {
        register,
        handleSubmit,
        errors,
        sendInvitation,
        setValue,
        loading
    } = useInvite();
    
    const validateChip = (chipvalue:any) => {
        if (!REGEX.EMAIL_FORMAT_REGEX.test(chipvalue)) {
            setError(`${chipvalue} is not a valid email`);
            return {
                isError: true,
                textError: `${chipvalue} is not a valid email`,
            };
        } else {
            setError('');
            return {
                isError: false,
            };
        }
    };

    const handleAddChip = (chip:any) => {
        if (chip && !users.includes(chip) && REGEX.EMAIL_FORMAT_REGEX.test(chip)) {  // Check if chip is not empty and doesn't already exist
            setUsers([...users, chip]);
        }
    };

    const handleDeleteChip = (chip:any, index:any) => {
        setUsers(users.filter(email => email !== chip));
    };

    const handleSkipClick = () => {
        router.push(routes.main);
    };

    return (
        <div className="max-w-[450px] mx-auto w-full h-full flex flex-col items-center justify-center mt-8">
            <h3 className="font-bold mb-8 text-font-28">Invite Members</h3>
            <div className="relative mb-4 w-full">
                <Label title={'Email Address'} htmlFor={'inviteEmail'} required={false}/>
                <span className="block text-font-16 text-b5 mb-2">
                    Enter or paste one or more email addresses, separated by
                    spaces or commas
                </span>
                <ChipInput
                    value={users}
                    onAdd={(chip) => handleAddChip(chip)}
                    disableUnderline
                    className="w-full default-form-input !p-0"
                    placeholder='Type and press enter, tab or comma to add tags' 
                    // validate={validateChip as any}
                    newChipKeys={['Enter', 'Tab', ',']}
                    onDelete={(chip, index) => handleDeleteChip(chip, index)}
                    classes={{
                        root: classes.inputRoot,
                        input: classes.input,
                        chip: classes.chip,
                    }}
                />
            </div>
            <div className="relative mb-4 w-full">
                <Label title={'Role'} htmlFor={'apiKey'} required={false}/>
                <CommonSelectInput
                    className="react-select-container"
                    classNamePrefix="react-select"
                    options={RoleUser}
                    {...register('role')}
                    onChange={(e) => setValue('role', e, { shouldValidate: true })}
                />
                <ValidationError errors={errors} field={'role'} />
            </div>
            <div className="flex gap-2">
                <button className="btn btn-black max-w-[200px] mt-5" onClick={handleSubmit((data) => sendInvitation(users, data.role, true))} disabled={!users.length || loading}>
                    Send Invitations
                </button>
                <button className="btn btn-outline-gray max-w-[150px] mt-5" onClick={handleSkipClick}>
                    Skip
                </button>
            </div>
        </div>
    );
};

export default InviteForm;