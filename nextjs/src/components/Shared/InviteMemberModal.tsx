import { useEffect, useState } from 'react';
import messageSent from '../../../public/message-sent.svg';
import Image from 'next/image';
import useInvite from '@/hooks/auth/useInvite';
import useRole from '@/hooks/common/useRole';
import Select from 'react-select';
import Label from '@/widgets/Label';
import { REGEX } from '@/utils/helper';
import { ROLE_TYPE, USER_STATUS } from '@/utils/constant';
import ValidationError from '@/widgets/ValidationError';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose} from "@/components/ui/dialog"
import { customSelectStyles } from '@/widgets/CustomSelectStyles';
import { useDispatch } from 'react-redux';
import { setInviteMemberModalAction } from '@/lib/slices/modalSlice';

import ChipInput from 'material-ui-chip-input';
import { makeStyles } from '@material-ui/core';

export const useStyles = makeStyles((theme) => ({
    inputRoot: {
        // Custom styles for the input container
        borderRadius: '5px',
        border: '1px solid #ddd',
        backgroundColor: '#fff',
        '&:hover': {
            borderColor: '#aaa',
        },
    },
    input: {
        // Custom styles for the input field
        color: '#333',
        fontSize: '14px',
        padding: '15px 15px',
        '&::placeholder': {
            color: '#111',
        },
    },
    chip: {
        // Custom styles for the chip
        backgroundColor: '#6637EC',
        color: '#fff',
        margin: '7px 6px',
        '&:hover': {
            backgroundColor: '#ddd',
            color: '#000',
        },
    },
    chipDeleteIcon: {
        // Custom styles for the delete icon
        color: '#ff1744',
    },
}));

const InviteMemberModal = ({getUsersList}) => {
    const classes = useStyles();
    const [users, setUsers] = useState([]);
    const [selectRole, setSelectRole] = useState();
    const [_error, setError] = useState('');
    
    const validateChip = (chipvalue) => {
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

    const handleChange = (newUsers) => {
        const uniqueUsers = Array.from(new Set(newUsers));
        const validUsers = uniqueUsers.filter((user:any) => REGEX.EMAIL_FORMAT_REGEX.test(user));
        setUsers(validUsers);
    };
    const handleAddChip = (chip) => {
        if (chip && !users.includes(chip) && REGEX.EMAIL_FORMAT_REGEX.test(chip)) {  // Check if chip is not empty and doesn't already exist
            setUsers([...users, chip]);
        }
    };

    const handleDeleteChip = (chip, index) => {
        setUsers(users.filter(email => email !== chip));
    };

    const dispatch = useDispatch();
    const handleCancel = () => {
       dispatch(setInviteMemberModalAction(false));
    };
    const handleOpen = () => {
       dispatch(setInviteMemberModalAction(true));
    };
    const {
        register,
        handleSubmit,
        errors,
        setValue,
        isSend,
        sendInvitation,
        userLimitExceed,
        loading
    } = useInvite();

    const { roles, getRoles } = useRole();
    useEffect(() => {
        getRoles({ code: { $in: [ROLE_TYPE.COMPANY_MANAGER, ROLE_TYPE.USER] } })
    }, []);

    useEffect(() => {
        getUsersList([USER_STATUS.PENDING,USER_STATUS.EXPIRED], false, '')
    }, [isSend]);

    return (
        <>
            <Dialog open={handleOpen} onOpenChange={handleCancel}>
                <DialogContent className="md:max-w-[730px] max-w-[calc(100%-30px)] py-7">
                    <DialogHeader className="rounded-t-10 px-[30px] pb-5 border-b">
                        <DialogTitle className="font-semibold flex items-center">
                        {userLimitExceed?"User Limit Reached" :"New Members"}
                        </DialogTitle>
                    </DialogHeader>
                <div className="dialog-body h-full p-[30px] max-h-[70vh]">
                    {!isSend && (
                        <>        
                            <div className="relative mb-4">
                            <Label title={'Email Addresses'}/>
                            <span className="block text-font-14 text-b5 mb-2">
                            Enter or paste one or more email addresses, separated by spaces 
                            </span>
                            {/* <MuiChipsInput
                                value={users}
                                onChange={handleChange}
                                className="w-full default-form-input !p-0"
                                validate={validateChip}
                            /> */}
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
                                    input: `${classes.input} lowercase`,
                                    chip: classes.chip,
                                }}
                            />
                            </div>
                            <div className="relative overflow-visible">
                            <Label title={'Role'} htmlFor={"Role"}/>
                            <Select styles={customSelectStyles} menuPlacement="auto"
                                options={roles?.map(
                                    (role) => {
                                        return {
                                            value: role.name,
                                            label: role.name,
                                            code: role.code,
                                            _id: role._id,
                                        };
                                    }
                                )}
                                {...register('role')}
                                onChange={(e) => {
                                    setValue(
                                        'role',
                                        e,
                                        {
                                            shouldValidate: true,
                                        }
                                    );
                                    setSelectRole(e);
                                }}
                                className="react-select-container react-select-border-light lg:w-[200px]" classNamePrefix="react-select"
                            />
                            <ValidationError errors={errors} field={'role'}/>
                            </div>
                        </>
                    )}
                    {/* successfully Block Start */}
                    {isSend && (
                        <div className="text-center">
                            <Image
                                src={messageSent}
                                alt="message sent"
                                width={85}
                                height={50}
                                className="w-[85px] h-[50px] object-contain mx-auto mb-6"
                            />
                            <p className="text-font-16 text-b5">
                               {userLimitExceed? <p>You’ve reached the limit of adding users for your company. If you’d like to add more users or need assistance, please contact us at <a href='mailto:hello@weam.ai' className='text-b2'> hello@weam.ai</a></p> :"Invitations successfully sent."}
                            </p>
                            <button
                                className="btn btn-black mt-6"
                                onClick={handleCancel}
                            >
                                Finish
                            </button>
                        </div>
                    )}
                    {/* successfully Block End */}
                </div>
                {!isSend &&
                    <DialogFooter className="flex items-center justify-end gap-2.5 pb-[30px] px-[30px]">
                    <DialogClose asChild>
                    <button className='btn btn-outline-gray'>Cancel</button>
                    </DialogClose>
                    <button
                        className="btn btn-black"
                        onClick={handleSubmit(() => sendInvitation(users, selectRole))}
                        disabled={!users.length || loading}
                    >
                        Send Invitations
                    </button>
                    </DialogFooter>
                }
                </DialogContent>
            </Dialog>
        </>
    );
};

export default InviteMemberModal;
