'use client';

import React, { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RESPONSE_STATUS, ROLE_TYPE, USER_STATUS } from '@/utils/constant';
import DownArrowIcon from '@/icons/DownArrow';
import useServerAction from '@/hooks/common/useServerActions';
import { changeMemberRoleAction } from '@/actions/member';
import Toast from '@/utils/toast';
import AlertDialogConfirmation from '@/components/AlertDialogConfirmation';
import useModal from '@/hooks/common/useModal';

interface RoleChangeDropdownProps {
    currentRole: string;
    userId: string;
    userEmail: string;
    isAdmin: boolean;
    userStatus?: string; // Add userStatus prop
}

const RoleChangeDropdown: React.FC<RoleChangeDropdownProps> = ({
    currentRole,
    userId,
    userEmail,
    isAdmin,
    userStatus
}) => {
    const [changeRole, isChangeRolePending] = useServerAction(changeMemberRoleAction);
    const { openModal, closeModal, isOpen: isConfirmOpen } = useModal();
    const [pendingRoleChange, setPendingRoleChange] = useState<string>('');
    const [currentUserRole, setCurrentUserRole] = useState<string>(currentRole);

    const getRoleLabel = (role: string) => {
        switch (role) {
            case ROLE_TYPE.COMPANY_MANAGER:
                return 'Manager';
            case ROLE_TYPE.USER:
                return 'User';
            case ROLE_TYPE.COMPANY:
                return 'Admin';
            default:
                return role;
        }
    };

    // Show static role text if:
    // 1. Current user is not an admin, OR
    // 2. The role being displayed is ADMIN (COMPANY), OR
    // 3. The user status is PENDING
    if (!isAdmin || currentUserRole === ROLE_TYPE.COMPANY || userStatus === USER_STATUS.PENDING) {
        return (
            <span className="text-font-14 font-normal text-b2">
                {getRoleLabel(currentUserRole)}
            </span>
        );
    }

    const handleRoleChange = async (newRole: string) => {
        setPendingRoleChange(newRole);
        openModal();
    };

    const confirmRoleChange = async () => {
        try {
            const response = await changeRole(userId, pendingRoleChange);
            if(response.status === RESPONSE_STATUS.SUCCESS){
                Toast(response.message || 'Role updated successfully!', 'success');
                // Update local state to show new role immediately
                setCurrentUserRole(pendingRoleChange);
                closeModal();
                setPendingRoleChange('');
            } else {
                Toast(response?.message || 'Failed to change role', 'error');
            }
        } catch (error) {
            Toast('An error occurred while changing the role', 'error');
        }
    };

    const getRoleOptions = () => {
        const options = [];
        
        // Only allow changing between USER and MANAGER roles
        // Never show ADMIN as an option to change to
        if (currentUserRole !== ROLE_TYPE.COMPANY_MANAGER) {
            options.push({
                value: ROLE_TYPE.COMPANY_MANAGER,
                label: 'Manager'
            });
        }
        
        if (currentUserRole !== ROLE_TYPE.USER) {
            options.push({
                value: ROLE_TYPE.USER,
                label: 'User'
            });
        }
        
        return options;
    };

    const roleOptions = getRoleOptions();

    // If no role change options available, show static text
    if (roleOptions.length === 0) {
        return (
            <span className="text-font-14 font-normal text-b2">
                {getRoleLabel(currentUserRole)}
            </span>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center space-x-2 text-font-14 font-normal text-b2 hover:text-b1 transition-colors cursor-pointer">
                    <span>{getRoleLabel(currentUserRole)}</span>
                    <DownArrowIcon
                        width={'12'}
                        height={'8'}
                        className="w-3 h-2 object-contain fill-b6 transition duration-150 ease-in-out"
                    />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[120px]">
                    {roleOptions.map((option) => (
                        <DropdownMenuItem
                            key={option.value}
                            onClick={() => handleRoleChange(option.value)}
                            className="cursor-pointer"
                        >
                            {option.label}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Confirmation Dialog */}
            {isConfirmOpen && (
                <AlertDialogConfirmation
                    description={`Are you sure you want to change ${userEmail}'s role from ${getRoleLabel(currentUserRole)} to ${getRoleLabel(pendingRoleChange)}?`}
                    btntext="Change Role"
                    btnclassName="btn-black"
                    open={isConfirmOpen}
                    closeModal={closeModal}
                    handleDelete={confirmRoleChange}
                    id={userId}
                    loading={isChangeRolePending}
                />
            )}
        </>
    );
};

export default RoleChangeDropdown; 

