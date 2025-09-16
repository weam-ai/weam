import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Mainlogo from '@/icons/Mainlogo';
import Link from 'next/link';
import { EditWorkspaceIcon, WorkspaceAddButton, WorkspaceSelection } from './DropDownOptions';
import { WorkspaceListType } from '@/types/workspace';
import dynamic from 'next/dynamic';
import { SelectedWorkspaceProps } from './SelectedWorkspace';
import { BrainListType } from '@/types/brain';
import DropDownIcon from '@/icons/DropDownIcon';
const SelectedWorkspace = dynamic<SelectedWorkspaceProps>(() => import('./SelectedWorkspace').then(mod => mod.default), { ssr: false });

type WorkspaceDropdownProps = {
    workspaceList: WorkspaceListType[];
    session: any;
    brainList: BrainListType[];
};

const WorkspaceDropdown = async ({ workspaceList, session, brainList }: WorkspaceDropdownProps) => {
    const user = session?.user;
    return (
        <div className='flex items-center justify-between mt-5 collapsed-logo'>
            <div className="logo w-8 h-8 ml-2 flex items-center justify-center rounded-md">
                <Link href={"#"}>
                    <Mainlogo width={'32'} height={'32'} className={"fill-white"} />
                </Link>
            </div>
            <div className="w-full px-3 mr-4 relative sidebar-dropdown">
                {workspaceList?.length > 0 && (
                    <DropdownMenu className="workspace-list-dropdown">
                        <DropdownMenuTrigger className="text-font-16 leading-[1.3] font-bold text-b2 flex w-full items-center transition duration-150 ease-in-out focus:outline-none focus:ring-0 motion-reduce:transition-none [&[data-state=open]>span>.drop-arrow]:rotate-180">
                            <SelectedWorkspace workspaceList={workspaceList} />
                            <span className="ml-auto">
                                <DropDownIcon
                                    width={'12'}
                                    height={'12'}
                                    className="drop-arrow w-3 h-auto object-contain fill-b6 transition duration-150 ease-in-out"
                                />
                            </span>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent
                            align="start"
                            className="md:min-w-[250px] !rounded-[15px]"
                        >
                            <div className="max-h-80 overflow-y-auto">
                            {workspaceList.map((w: WorkspaceListType) => (
                                <div key={w._id} className="group flex items-center cursor-pointer focus:outline-none hover:bg-b12">
                                    <WorkspaceSelection w={w} brainList={brainList} />
                                    <EditWorkspaceIcon w={w} user={user} />
                                </div>
                            ))}
                            </div>
                            <WorkspaceAddButton user={user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
};

export default WorkspaceDropdown;