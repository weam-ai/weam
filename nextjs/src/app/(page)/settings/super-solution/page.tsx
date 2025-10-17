'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Shield, UserCheck, Users as TeamIcon, X, DownloadIcon, RefreshCw } from 'lucide-react';
import { getIconComponent } from '@/utils/iconMapping';
import { AppSolution } from '@/types/superSolution';
import { hasPermission, PERMISSIONS } from '@/utils/permission';
import { getCurrentUser } from '@/utils/handleAuth';
import useSuperSolution from '@/hooks/superSolution/useSuperSolution';
import { getAccessToken } from '@/actions/serverApi';
import { LINK, NODE_API_PREFIX } from '@/config/config';
import useMembers from '@/hooks/members/useMembers';
import { useTeams } from '@/hooks/team/useTeams';
import AutoSelectChip from '@/components/ui/AutoSelectChip';
import ProfileImage from '@/components/Profile/ProfileImage';
import { displayName, showNameOrEmail } from '@/utils/common';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from '@/utils/toast';
// Removed commonApi and MODULE_ACTIONS imports - using direct SSE connection instead

// Validation schemas
const addMemberSchema = yup.object({
    members: yup
        .array()
        .min(1, 'Please select at least one member')
        .required('Members are required'),
});

const addTeamSchema = yup.object({
    teams: yup
        .array()
        .min(1, 'Please select at least one team')
        .required('Teams are required'),
});

// Member Item Component
const MemberItem = ({key, member, onRemove, isOwner }) => {
    return (
        <div className="group/item user-item flex justify-between py-1.5 px-0 border-b border-b11">
            <div className="user-img-name flex items-center">
                <ProfileImage
                    user={member?.user}
                    w={35}
                    h={35}
                    classname="user-img size-[35px] rounded-full mr-3 object-cover"
                    spanclass="user-char flex items-center justify-center size-[35px] rounded-full bg-[#B3261E] text-b15 text-font-16 font-normal mr-2.5"
                />
                <p className="flex flex-col m-0 text-font-14 leading-[22px] font-normal text-b2">
                    {displayName(member?.user)}
                    <span className="text-font-12 leading-[18px] font-normal text-b5">
                        {member?.user?.email}
                    </span>
                </p>
            </div>

            <div className="flex items-center space-x-2.5">
                {!isOwner && (
                    <button
                        className="cursor-pointer p-1 hover:bg-red-50 rounded"
                        onClick={() => onRemove(member.user.id)}
                    >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
                    </button>
                )}
            </div>
        </div>
    );
};

// Team Item Component
const TeamItem = ({key, team, onRemove }) => {  
    return (
    <div className="group/item user-item flex justify-between py-1.5 px-0 border-b border-b11">
        <div className="user-img-name flex items-center">
            <span className="w-[35px] h-[35px] rounded-full bg-b11 p-1.5 mr-2.5">
                <TeamIcon className="fill-b5 w-full h-auto" />
            </span>
            <div>
                <p className="m-0 text-font-14 leading-[22px] font-normal text-b2">
                    {team.teamName}
                </p>
                <p className="m-0 text-font-12 leading-[18px] font-normal text-b5">
                    ({team?.memberCount || 0} Members)
                </p>
            </div>
        </div>
        <div className="flex items-center space-x-2.5 text-font-14">
            <button
                className="cursor-pointer p-1 hover:bg-red-50 rounded"
                onClick={() => onRemove(team.id)}
            >
                <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
            </button>
        </div>
    </div>
    )
};

const SuperSolutionPage = () => {
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
    const [searchMemberValue, setSearchMemberValue] = useState('');
    const [searchTeamValue, setSearchTeamValue] = useState('');
    const [memberOptions, setMemberOptions] = useState([]);
    const [teamOptions, setTeamOptions] = useState([]);
    const [selectedApp, setSelectedApp] = useState<AppSolution | null>(null);
    const [showAppDetails, setShowAppDetails] = useState(false);
    const [currentAppMembers, setCurrentAppMembers] = useState([]);
    const [currentAppTeams, setCurrentAppTeams] = useState([]);

    const currentUser = getCurrentUser();
    const isAdminOrManager = hasPermission(
        currentUser?.roleCode,
        PERMISSIONS.SUPER_SOLUTION_ACCESS
    );

    // Hooks
    const { members, getMembersList } = useMembers();
    const { teams, getTeams } = useTeams();
    const {
        availableApps,
        userAccess,
        loading,
        error,
        // getAllSolutionMembers,
        addMembersToSolutionApp,
        removeMembersFromSolutionApp,
        addTeamsToSolutionApp,
        removeTeamsFromSolutionApp,
        fetchAvailableApps,
        getSolutionAppMember,
        getSolutionAppTeams,
    } = useSuperSolution();

    // Forms
    const addMemberForm = useForm({
        resolver: yupResolver(addMemberSchema),
        defaultValues: { members: [] },
    });

    const addTeamForm = useForm({
        resolver: yupResolver(addTeamSchema),
        defaultValues: { teams: [] },
    });

    // Handler to reset state when dialog closes
    const handleDialogClose = (open: boolean) => {
        if (!open) {
            // Reset all state to default values
            setSelectedApp(null);
            setCurrentAppMembers([]);
            setCurrentAppTeams([]);
            setIsUserDialogOpen(false);
            setIsTeamDialogOpen(false);
            setSearchMemberValue('');
            setSearchTeamValue('');
            
            // Reset forms
            addMemberForm.reset();
            addTeamForm.reset();
        }
        setShowAppDetails(open);
    };

    const handleAddMembers = async (data) => {
        try {
            if (!selectedApp?._id) {
                console.error('No app selected');
                return;
            }

            await addMembersToSolutionApp(selectedApp._id, data.members);

            setIsUserDialogOpen(false);
            getAppMembers();
            // addMemberForm.reset();
        } catch (error) {
            console.error('Error adding members:', error);
        }
    };

    const handleAddTeams = async (data) => {
        try {
            if (!selectedApp?._id) {
                console.error('No app selected');
                return;
            }

            await addTeamsToSolutionApp(selectedApp._id, data.teams);

            setIsTeamDialogOpen(false);
            getAppTeams();
            // addTeamForm.reset();
        } catch (error) {
            console.error('Error adding teams:', error);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            if (!selectedApp?._id) {
                console.error('No app selected');
                return;
            }

            // Remove member from the selected super solution app
            await removeMembersFromSolutionApp(selectedApp._id, [memberId]);
            // Refresh the app access data
            getAppMembers();
        } catch (error) {
            console.error('Error removing member:', error);
        }
    };

    const handleRemoveTeam = async (teamId: string) => {
       
        try {
            if (!selectedApp?._id) {
                console.error('No app selected');
                return;
            }

            await removeTeamsFromSolutionApp(selectedApp._id, teamId);
            getAppTeams();
        } catch (error) {
            console.error('Error removing team:', error);
        }
    };

    const handleAppClick = (app: AppSolution) => {
        setSelectedApp(app);
        setShowAppDetails(true);
    };

    const getAppMembers = async () => {
        //db call to get app members
        const userList = await getSolutionAppMember(selectedApp?._id);
        setCurrentAppMembers(
            userList.map((currentUser) => ({
                id: currentUser.user.id,
                email: currentUser.user.email,
                fname: currentUser.user.fname,
                lname: currentUser.user.lname,
            }))
        );
    };

    const getAppTeams = async () => {
        if (!selectedApp?._id) return;

        try {
            const teamList = await getSolutionAppTeams(selectedApp._id);
            setCurrentAppTeams(
                teamList.map((team) => ({
                    id: team.team.id,
                    teamName: team.team.teamName,
                    memberCount: team.memberCount,
                }))
            );
        } catch (error) {
            console.error('Error fetching app teams:', error);
            setCurrentAppTeams([]);
        }
    };

    const [loadingSolutions, setLoadingSolutions] = useState<{ [key: string]: boolean }>({});
    const [installingSolutions, setInstallingSolutions] = useState<{ [key: string]: boolean }>({});
    const [uninstallingSolutions, setUninstallingSolutions] = useState<{ [key: string]: boolean }>({});
    const [syncingSolutions, setSyncingSolutions] = useState<{ [key: string]: boolean }>({});
    const [installedSolutions, setInstalledSolutions] = useState<{ [key: string]: boolean }>({});

    // Mapping from app names to solution types
    const getSolutionTypeFromAppName = (appName: string): string => {
        const mapping: { [key: string]: string } = {
            'AI Docs': 'ai-docs',
            'AI Recruiter': 'ai-recruiter',
            'AI Landing Page Generator': 'ai-landing-page-generator',
            'Blog Engine': 'blog-engine',
            'Call Analyzer': 'call-analyzer'
        };
        return mapping[appName] || '';
    };

    const getInstallButtonText = (appName: string): string => {
        return 'Install';
    };

    const getUninstallButtonText = (appName: string): string => {
        return 'Uninstall';
    };

    const getSyncButtonText = (appName: string): string => {
        return 'Sync';
    };

    const handleInstall = async (solutionType?: string) => {
        // If no solutionType provided, get it from selectedApp
        const finalSolutionType = solutionType || (selectedApp ? getSolutionTypeFromAppName(selectedApp.name) : 'ai-docs');
        console.log('SuperSolution handleInstall - solutionType:', solutionType, 'selectedApp:', selectedApp?.name, 'finalSolutionType:', finalSolutionType);
        
        // Disable buttons immediately for this specific solution
        setInstallingSolutions(prev => ({ ...prev, [finalSolutionType]: true }));
        // Note: We don't set syncingSolutions to true here because we want sync button to be disabled but not show "Syncing..."
        
        try {
            const baseUrl = `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`;
            const url = `${baseUrl}/web/solution-install-progress/progress?solutionType=${encodeURIComponent(finalSolutionType)}`;
            
            // Trigger the installation
            fetch(url, { method: 'GET' }).catch(error => {
                console.log('Installation triggered:', error);
            });
            
            // Start polling to check if process is complete
            const pollInterval = setInterval(async () => {
                try {
                    // Check if containers are running (simple health check)
                    const healthUrl = `${baseUrl}/web/solution-install-progress/health?solutionType=${encodeURIComponent(finalSolutionType)}`;
                    const response = await fetch(healthUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Health check status:', data.status);
                        
                        if (data.status === 'running') {
                            setInstallingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                            setInstalledSolutions(prev => ({ ...prev, [finalSolutionType]: true }));
                            clearInterval(pollInterval);
                            console.log('Installation completed - buttons enabled');
                            Toast('Solution installed successfully!', 'success');
                        } else if (data.status === 'installing') {
                            console.log('Installation still in progress...');
                        }
                    }
                } catch (error) {
                    // Ignore health check errors, continue polling
                    console.log('Health check error:', error);
                }
            }, 10000); // Check every 10 seconds (increased interval)
            
            // Fallback timeout after 10 minutes
            setTimeout(() => {
                setInstallingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                clearInterval(pollInterval);
                console.log('Installation timeout - buttons re-enabled');
            }, 10 * 60 * 1000); // 10 minutes
            
        } catch (error) {
            console.error('solution-install error:', error);
            setInstallingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
        }
    };

    const handleUninstall = async (solutionType?: string) => {
        // If no solutionType provided, get it from selectedApp
        const finalSolutionType = solutionType || (selectedApp ? getSolutionTypeFromAppName(selectedApp.name) : 'ai-docs');
        console.log('SuperSolution handleUninstall - solutionType:', solutionType, 'selectedApp:', selectedApp?.name, 'finalSolutionType:', finalSolutionType);
        
        // Disable buttons immediately for this specific solution
        setUninstallingSolutions(prev => ({ ...prev, [finalSolutionType]: true }));
        // Note: We don't set syncingSolutions to true here because we want sync button to be disabled but not show "Syncing..."
        
        try {
            const baseUrl = `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`;
            const url = `${baseUrl}/web/solution-install-progress/uninstall?solutionType=${encodeURIComponent(finalSolutionType)}`;
            
            // Trigger the uninstallation
            fetch(url, { method: 'GET' }).catch(error => {
                console.log('Uninstallation triggered:', error);
            });
            
            // Start polling to check if process is complete
            const pollInterval = setInterval(async () => {
                try {
                    // Check if containers are running (simple health check)
                    const healthUrl = `${baseUrl}/web/solution-install-progress/health?solutionType=${encodeURIComponent(finalSolutionType)}`;
                    const response = await fetch(healthUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Health check status:', data.status);
                        
                        if (data.status === 'not_running') {
                            setUninstallingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                            setInstalledSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                            clearInterval(pollInterval);
                            console.log('Uninstallation completed - buttons enabled');
                            Toast('Solution uninstalled successfully!', 'success');
                        } else if (data.status === 'running') {
                            console.log('Uninstallation still in progress...');
                        }
                    }
                } catch (error) {
                    // Ignore health check errors, continue polling
                    console.log('Health check error:', error);
                }
            }, 10000); // Check every 10 seconds
            
            // Fallback timeout after 10 minutes
            setTimeout(() => {
                setUninstallingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                clearInterval(pollInterval);
                console.log('Uninstallation timeout - buttons re-enabled');
            }, 10 * 60 * 1000); // 10 minutes
            
        } catch (error) {
            console.error('solution-uninstall error:', error);
            setUninstallingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
        }
    };

    const handleSync = async (solutionType?: string) => {
        // If no solutionType provided, get it from selectedApp
        const finalSolutionType = solutionType || (selectedApp ? getSolutionTypeFromAppName(selectedApp.name) : 'ai-docs');
        console.log('SuperSolution handleSync - solutionType:', solutionType, 'selectedApp:', selectedApp?.name, 'finalSolutionType:', finalSolutionType);
        
        // Disable buttons immediately for this specific solution
        setSyncingSolutions(prev => ({ ...prev, [finalSolutionType]: true }));
        // Note: We don't set other states to true here because we want other buttons to be disabled but not show their loading text
        
        try {
            const baseUrl = `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`;
            const url = `${baseUrl}/web/solution-install-progress/sync?solutionType=${encodeURIComponent(finalSolutionType)}`;
            
            // Trigger the sync (which will stop existing containers and reinstall)
            fetch(url, { method: 'GET' }).catch(error => {
                console.log('Sync triggered:', error);
            });
            
            // Start polling to check if process is complete
            const pollInterval = setInterval(async () => {
                try {
                    // Check if containers are running (simple health check)
                    const healthUrl = `${baseUrl}/web/solution-install-progress/health?solutionType=${encodeURIComponent(finalSolutionType)}`;
                    const response = await fetch(healthUrl);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('Health check status:', data.status);
                        
                        if (data.status === 'running') {
                            setSyncingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                            setInstalledSolutions(prev => ({ ...prev, [finalSolutionType]: true }));
                            clearInterval(pollInterval);
                            console.log('Sync completed - buttons enabled');
                            Toast('Solution synced successfully!', 'success');
                        } else if (data.status === 'installing') {
                            console.log('Sync still in progress...');
                        }
                    }
                } catch (error) {
                    // Ignore health check errors, continue polling
                    console.log('Health check error:', error);
                }
            }, 10000); // Check every 10 seconds
            
            // Fallback timeout after 10 minutes
            setTimeout(() => {
                setSyncingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
                clearInterval(pollInterval);
                console.log('Sync timeout - buttons re-enabled');
            }, 10 * 60 * 1000); // 10 minutes
            
        } catch (error) {
            console.error('solution-sync error:', error);
            setSyncingSolutions(prev => ({ ...prev, [finalSolutionType]: false }));
        }
    };

    // Check installation status for all solutions
    const checkInstallationStatus = async () => {
        // Get solution types dynamically from available apps
        const solutionTypes = availableApps.map(app => getSolutionTypeFromAppName(app.name)).filter(Boolean);
        
        for (const solutionType of solutionTypes) {
            try {
                const baseUrl = `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`;
                const healthUrl = `${baseUrl}/web/solution-install-progress/health?solutionType=${encodeURIComponent(solutionType)}`;
                const response = await fetch(healthUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'running') {
                        setInstalledSolutions(prev => ({ ...prev, [solutionType]: true }));
                    } else {
                        setInstalledSolutions(prev => ({ ...prev, [solutionType]: false }));
                    }
                } else {
                    setInstalledSolutions(prev => ({ ...prev, [solutionType]: false }));
                }
            } catch (error) {
                console.log(`Health check error for ${solutionType}:`, error);
                setInstalledSolutions(prev => ({ ...prev, [solutionType]: false }));
            }
        }
    };

    // Effects
    useEffect(() => {
        if (isAdminOrManager) {
            fetchAvailableApps();
            getMembersList({});
            getTeams({ search: '', pagination: false });
        }
    }, [isAdminOrManager]);

    // Check installation status after available apps are loaded
    useEffect(() => {
        if (availableApps.length > 0) {
            checkInstallationStatus();
        }
    }, [availableApps]);

    useEffect(() => {
        if (members?.length) {
            const memberlist = members.reduce((acc, user) => {
                if (!currentAppMembers.some((appMember) => appMember.id === user.id)) {
                    acc.push({
                        email: user.email,
                        id: user.id,
                        fullname: showNameOrEmail(user),
                        fname: user?.fname,
                        lname: user?.lname,
                    });
                }
                return acc;
            }, []);
            setMemberOptions(memberlist);
        }
    }, [members]);

    useEffect(() => {
        if (teams?.length) {
            const teamlist = teams.reduce((acc, team) => {
                if (!currentAppTeams.some((appTeam) => appTeam.id === team._id)) {
                    acc.push({
                        teamName: team.teamName,
                        id: team._id,
                        teamUsers: team.teamUsers || [],
                    });
                }
                return acc;
            }, []);
            setTeamOptions(teamlist);
        }
    }, [teams]);

    useEffect(() => {
        if (selectedApp?._id) {
            getAppMembers();
            getAppTeams();
        }
    }, [selectedApp]);

    if (!isAdminOrManager) {
        return (
            <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
                <div className="h-full overflow-y-auto w-full relative">
                    <div className="mx-auto max-w-[600px] text-center py-20">
                        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Access Restricted
                        </h2>
                        <p className="text-gray-600">
                            Only Administrators and Managers can access Super
                            Solution settings.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-md:h-[50px] max-md:sticky max-md:top-0 bg-white z-10"></div>
            <div className="flex flex-col flex-1 relative h-full overflow-hidden lg:pt-20 pb-10 px-2">
                <div className="h-full overflow-y-auto w-full relative">
                    <div className="mx-auto max-w-[1200px]">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                App Access Control
                            </h1>
                            <p className="text-gray-600">
                                Manage which apps your team members can access.
                            </p>
                        </div>
                            {loading ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                                    <p className="mt-2 text-gray-600">
                                        Loading applications...
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {availableApps.map((app) => (
                                        <div
                                            key={app.id}
                                            className="border p-4 rounded-lg cursor-pointer hover:shadow-lg transition-shadow duration-200 group hover:bg-b12"
                                            onClick={() =>
                                                handleAppClick(app)
                                            }
                                        >   
                                            <div className="flex gap-3 mb-3">
                                                <span>
                                                    {(() => {
                                                        const IconComponent = getIconComponent(app.icon);
                                                        return (
                                                            <IconComponent className="w-6 h-6 text-gray-600" />
                                                        );
                                                    })()}
                                                </span>
                                                <div>
                                                    <h3 className="font-semibold">
                                                        {app.name}
                                                    </h3>
                                                    <p className="text-font-14 text-gray-600">
                                                        {
                                                            app.description
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-font-14">
                                                <Badge className='px-4 py-1.5 group-hover:bg-b11'>
                                                    {app.category}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                    {app.route}
                                                </span>
                                            </div>
                                            <p className="text-font-14 text-gray-500 mt-3 pt-3 border-t">
                                                Click to manage access
                                            </p>                                            
                                        </div>
                                    ))}
                                </div>
                            )}
                    </div>
                </div>
            </div>

            {/* App Details Dialog */}
            {showAppDetails && selectedApp && (
                <Dialog open={showAppDetails} onOpenChange={handleDialogClose}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-5">
                        <DialogHeader className="border-b pb-3 mb-4">
                            <DialogTitle className="flex items-center gap-3 font-bold">
                                <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                                    {(() => {
                                        const IconComponent = getIconComponent(
                                            selectedApp.icon
                                        );
                                        return (
                                            <IconComponent className="w-5 h-5 text-gray-600" />
                                        );
                                    })()}
                                </div>
                                <div>
                                    {selectedApp.name} - Access Management
                                </div>
                                <div className="flex gap-2 ml-auto">
                                    {(() => {
                                        const solutionType = getSolutionTypeFromAppName(selectedApp?.name || '');
                                        const isInstalling = installingSolutions[solutionType] || false;
                                        const isUninstalling = uninstallingSolutions[solutionType] || false;
                                        const isSyncing = syncingSolutions[solutionType] || false;
                                        const isInstalled = installedSolutions[solutionType] || false;
                                        
                                        
                                        return (
                                            <>
                                                <Button 
                                                    className="inline-flex items-center font-normal text-xs underline ml-auto mr-3 cursor-pointer hover:text-black text-gray-600" 
                                                    onClick={() => isInstalled ? handleUninstall() : handleInstall()} 
                                                    disabled={isInstalling || isSyncing || isUninstalling}
                                                >
                                                    {isInstalled ? (
                                                        <>
                                                            <X className="w-4 h-4 mr-2" />
                                                            Uninstall
                                                        </>
                                                    ) : (
                                                        <>
                                                            <DownloadIcon className="w-4 h-4 mr-2" />
                                                            {isInstalling ? 'Installing...' : getInstallButtonText(selectedApp?.name || '')}
                                                        </>
                                                    )}
                                                </Button>
                                                {isInstalled && (
                                                    <>
                                                        <Button 
                                                            className="inline-flex items-center font-normal text-xs underline ml-auto mr-3 cursor-pointer hover:text-black text-gray-600" 
                                                            onClick={() => handleSync()} 
                                                            disabled={isSyncing || isInstalling || isUninstalling}
                                                        >
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            {isSyncing ? 'Syncing...' : getSyncButtonText(selectedApp?.name || '')}
                                                        </Button>
                                                    </>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </DialogTitle>
                            <DialogDescription>
                                Manage user and team access to this application.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 mt-5">
                            {/* Member and Team Management */}
                            <div className="flex gap-4 justify-center">
                                <Dialog
                                    open={isUserDialogOpen}
                                    onOpenChange={setIsUserDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button 
                                            className="inline-flex items-center cursor-pointer px-3 py-2 rounded-md bg-white border border-b8 hover:bg-b11 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed" 
                                            disabled={!installedSolutions[getSolutionTypeFromAppName(selectedApp?.name || '')]}
                                        >
                                            <UserCheck className="w-4 h-4 mr-2" />
                                            Add Member
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-5">
                                        <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                                            <DialogTitle className="font-semibold flex items-center">
                                                <UserCheck className="w-5 h-5 mr-3" />
                                                Add Members to{' '}
                                                {selectedApp?.name}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                                            <form
                                                onSubmit={addMemberForm.handleSubmit(
                                                    handleAddMembers
                                                )}
                                            >
                                                <div className="h-full w-full max-h-[60dvh]">
                                                    <div className="h-full pr-2.5 pt-5">
                                                        <div className="workspace-group h-full flex flex-col">
                                                            <div className="px-2.5 gap-2.5 flex">
                                                                <div className="flex-1 relative">
                                                                    <label className="text-font-16 font-semibold inline-block text-b2">
                                                                        Members
                                                                        <span className="text-red">
                                                                            *
                                                                        </span>
                                                                    </label>
                                                                    <p className="mb-2.5 text-font-14 text-b5">
                                                                        Add
                                                                        members
                                                                        to{' '}
                                                                        {
                                                                            selectedApp?.name
                                                                        }
                                                                    </p>
                                                                    <Controller
                                                                        name="members"
                                                                        control={
                                                                            addMemberForm.control
                                                                        }
                                                                        render={({
                                                                            field,
                                                                        }) => (
                                                                            <AutoSelectChip
                                                                                showLabel={
                                                                                    false
                                                                                }
                                                                                name="members"
                                                                                placeholder="Find Members"
                                                                                options={
                                                                                    memberOptions
                                                                                }
                                                                                optionBindObj={{
                                                                                    label: 'fullname',
                                                                                    value: 'id',
                                                                                }}
                                                                                inputValue={
                                                                                    searchMemberValue
                                                                                }
                                                                                errors={
                                                                                    addMemberForm
                                                                                        .formState
                                                                                        .errors
                                                                                }
                                                                                handleSearch={
                                                                                    setSearchMemberValue
                                                                                }
                                                                                setFormValue={
                                                                                    addMemberForm.setValue
                                                                                }
                                                                                {...field}
                                                                            />
                                                                        )}
                                                                    />
                                                                    <div className="flex justify-center mt-5 mb-5">
                                                                        <button
                                                                            type="submit"
                                                                            className="btn btn-black"
                                                                            disabled={
                                                                                addMemberForm
                                                                                    .formState
                                                                                    .isSubmitting
                                                                            }
                                                                        >
                                                                            Add
                                                                            Members
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

                                <Dialog
                                    open={isTeamDialogOpen}
                                    onOpenChange={setIsTeamDialogOpen}
                                >
                                    <DialogTrigger asChild>
                                        <Button 
                                            className="inline-flex items-center cursor-pointer px-3 py-2 rounded-md bg-white border border-b8 hover:bg-b11 transition ease-in-out duration-150 disabled:opacity-50 disabled:cursor-not-allowed" 
                                            disabled={!installedSolutions[getSolutionTypeFromAppName(selectedApp?.name || '')]}
                                        >
                                            <TeamIcon className="w-4 h-4 mr-2" />
                                            Add Team
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="md:max-w-[550px] max-w-[calc(100%-30px)] py-5">
                                        <DialogHeader className="rounded-t-10 px-[30px] pb-3 border-b">
                                            <DialogTitle className="font-semibold flex items-center">
                                                <TeamIcon className="w-5 h-5 mr-3" />
                                                Add Teams to {selectedApp?.name}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="dialog-body flex flex-col flex-1 relative h-full pl-5 pr-2.5">
                                            <form
                                                onSubmit={addTeamForm.handleSubmit(
                                                    handleAddTeams
                                                )}
                                            >
                                                <div className="h-full w-full max-h-[60dvh]">
                                                    <div className="h-full pr-2.5 pt-5">
                                                        <div className="workspace-group h-full flex flex-col">
                                                            <div className="px-2.5 gap-2.5 flex">
                                                                <div className="flex-1 relative">
                                                                    <label className="text-font-16 font-semibold inline-block text-b2">
                                                                        Teams
                                                                        <span className="text-red">
                                                                            *
                                                                        </span>
                                                                    </label>
                                                                    <p className="mb-2.5 text-font-14 text-b5">
                                                                        Add
                                                                        teams to{' '}
                                                                        {
                                                                            selectedApp?.name
                                                                        }
                                                                    </p>
                                                                    <Controller
                                                                        name="teams"
                                                                        control={
                                                                            addTeamForm.control
                                                                        }
                                                                        render={({
                                                                            field,
                                                                        }) => (
                                                                            <AutoSelectChip
                                                                                showLabel={
                                                                                    false
                                                                                }
                                                                                name="teams"
                                                                                placeholder="Find Teams"
                                                                                options={
                                                                                    teamOptions
                                                                                }
                                                                                optionBindObj={{
                                                                                    label: 'teamName',
                                                                                    value: 'id',
                                                                                }}
                                                                                inputValue={
                                                                                    searchTeamValue
                                                                                }
                                                                                errors={
                                                                                    addTeamForm
                                                                                        .formState
                                                                                        .errors
                                                                                }
                                                                                handleSearch={
                                                                                    setSearchTeamValue
                                                                                }
                                                                                setFormValue={
                                                                                    addTeamForm.setValue
                                                                                }
                                                                                {...field}
                                                                            />
                                                                        )}
                                                                    />
                                                                    <div className="flex justify-center mt-5 mb-5">
                                                                        <button
                                                                            type="submit"
                                                                            className="btn btn-black"
                                                                            disabled={
                                                                                addTeamForm
                                                                                    .formState
                                                                                    .isSubmitting
                                                                            }
                                                                        >
                                                                            Add
                                                                            Teams
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
                            </div>

                            {/* Members Section */}
                            <div className="font-normal mb-4">
                                Members{' '}
                                <span className="ms-1.5 text-font-14 font-bold">
                                    {currentAppMembers.length}
                                </span>
                            </div>
                            <div className="overflow-y-auto w-full max-h-[200px] border border-gray-200 rounded-lg p-4 mb-6">
                                <div className="user-lists h-full w-full">
                                    {currentAppMembers.map((user:any) => (
                                        <MemberItem
                                            key={user.id}
                                            member={{
                                                user: {
                                                    id: user.id,
                                                    email: user.email,
                                                    fname: user.fname,
                                                    lname: user.lname,
                                                },
                                                role: user.roleCode,
                                            }}
                                            onRemove={handleRemoveMember}
                                            isOwner={false}
                                        />
                                    ))}
                                    {currentAppMembers.length === 0 && (
                                        <div className="text-center py-4 text-gray-500">
                                            No members assigned to this app
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Teams Section */}
                            <div className="font-normal mb-4">
                                Teams{' '}
                                <span className="ms-1.5 text-font-14 font-bold">
                                    {currentAppTeams.length}
                                </span>
                            </div>
                            <div className="overflow-y-auto w-full max-h-[200px] border border-gray-200 rounded-lg p-4">
                                <div className="user-lists h-full w-full">
                                    {currentAppTeams.map((team) => (
                                        <TeamItem
                                            key={team.id}
                                            team={{
                                                id: team.id,
                                                teamName: team.teamName,
                                                memberCount: team.memberCount,
                                            }}
                                            onRemove={handleRemoveTeam}
                                        />
                                    ))}
                                    {currentAppTeams.length === 0 && (
                                        <div className="text-center py-4 text-gray-500">
                                            No teams assigned to this app
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
};

export default SuperSolutionPage;