import WorkspaceDropdown from '../Workspace/WorkspaceList';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import Link from 'next/link';
import Notification from './Notification';
import NotificationDot from './NotificationDot';
import UserProfile from './UserProfile';
import { getSession } from '@/config/withSession';
import { hasPermission, PERMISSIONS } from '@/utils/permission';
import { fetchWorkspaceList } from '@/actions/workspace';
import { fetchBrainList } from '@/actions/brains';
import { TemplateLibrary } from './SettingSelection';
import { PrivateVisibleProps } from '../Brains/PrivateVisible';
import { WorkspaceNewChatButton } from '../Workspace/DropDownOptions';
import dynamic from 'next/dynamic'; 
import AddBrainButton from '../Brains/AddBrainButton';
import SidebarFooter from './SidebarFooter';
import ConnectionsLink from './ConnectionsLink';
import SuperSolutionHover from './SuperSolutionHover';

const SettingsLink = dynamic(() => import('./SettingsLink'), { ssr: false });
const ShareBrainList = dynamic(() => import('../Brains/ShareBrainList'), { ssr: false });
const PrivateBrainList = dynamic(() => import('../Brains/PrivateBrainList'), { ssr: false });
const PrivateVisible = dynamic<PrivateVisibleProps>(() => import('../Brains/PrivateVisible').then(mod => mod.default), { ssr: false });

const MainPageSidebar = async () => {
    const [workspaceResponse, brainResponse, session] = await Promise.all([
        fetchWorkspaceList(),
        fetchBrainList(),
        getSession(),
    ]);
    // if (!brainList || !workspaceList) return null;
    const user = session?.user;
    const workspaceList = workspaceResponse?.data;
    const brainList = brainResponse?.data;

    return (
        <>
            {/* {(workspaceResponse?.status === RESPONSE_STATUS.FORBIDDEN ||
                brainResponse?.status === RESPONSE_STATUS.FORBIDDEN) &&
                (workspaceResponse?.code ===
                    RESPONSE_STATUS_CODE.REFRESH_TOKEN ||
                    brainResponse?.code ===
                        RESPONSE_STATUS_CODE.REFRESH_TOKEN) && (
                    <RefreshTokenClient />
                )} */}
            <WorkspaceDropdown
                workspaceList={workspaceList}
                session={session}
                brainList={brainList}
            />

            {workspaceList?.length > 0 && (
                <div className="sidebar-sub-menu-items flex flex-col h-full overflow-hidden">
                    <div className="h-full w-full flex flex-col px-3 overflow-y-auto pb-3 pt-2 collapsed-icon-only">
                        <WorkspaceNewChatButton />
                        <div className="collapsed-margin-left">
                            <ConnectionsLink />
                        </div>

                        <div className="collapsed-margin-left">
                            <SuperSolutionHover className="flex gap-x-2 text-font-14 items-center mb-5 cursor-pointer" />
                        </div>

                       {/* Divider - visible only when collapsed */}
                       <div className="w-full border-t border-b10 mb-3 collapsed-brain-divider collapsed-margin-left"></div>
                        <div className="w-full mt-2">
                            <div className="flex w-full justify-between pr-1 group mb-4 font-bold text-font-14 collapsed-center">
                                <div className="flex justify-between w-full items-center collapsed-text">
                                    <span className="text-font-12 font-medium collapsed-margin-left">
                                        SHARED BRAINS
                                    </span>
                                </div>
                                <AddBrainButton text="Add Shared Brain" isPrivate={false} />
                            </div>
                            <div className="w-full flex flex-col text-b5 items-center collapsed-margin-left">
                                <ShareBrainList
                                    brainList={brainList}
                                    workspaceFirst={workspaceList[0]}
                                />
                            </div>
                        </div>

                        <PrivateVisible>
                        {/* Divider - visible only when collapsed */}
                        <div className="w-full border-t border-b10 mb-2 mt-3 collapsed-brain-divider collapsed-margin-left"></div>
                            <div className="w-full border-t mt-5 pt-5 collapsed-pbrains">
                                <div className="flex w-full pr-1 mb-2 justify-between group font-bold text-font-14 collapsed-center">
                                    <div className="flex justify-between w-full items-center collapsed-text">
                                        <span className="text-font-12 font-medium collapsed-margin-left">
                                            PRIVATE BRAINS
                                        </span>
                                    </div>
                                    <AddBrainButton text="Add Private Brain" isPrivate={true} />
                                </div>
                                <div className="w-full flex flex-col text-b5 items-center collapsed-margin-left">
                                    <PrivateBrainList
                                        brainList={brainList}
                                        workspaceFirst={workspaceList[0]}
                                    />
                                </div>
                            </div>
                        </PrivateVisible>
                    </div>

                    <SidebarFooter />
                </div>
            )}

            <div className="hidden">
                <PrivateVisible />
            </div>
        </>
    );
};

export default MainPageSidebar;
