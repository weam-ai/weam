'use client';
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RightArrow from '@/icons/RightArrow';
import AddUser from '@/icons/AddUser';
import useModal from '@/hooks/common/useModal';
import RequestDetailsModal from '@/components/Settings/RequestDetailsModal';
import InviteMemberModal from '@/components/Shared/InviteMemberModal';
import { useSelector,useDispatch } from 'react-redux';
import {
	setInviteMemberModalAction,
	setRequestDetailsModalAction,
} from '@/lib/slices/modalSlice';
import useUsers from '@/hooks/users/useUsers';
import { PAGINATION, ROLE_TYPE, USER_STATUS } from '@/utils/constant';
import { bytesToMegabytes, dateDisplay, getEmailFirstLetter, removeObjectFromArray } from '@/utils/common';
import RemoveIcon from '@/icons/RemoveIcon';
import AlertDialogConfirmation from '@/components/AlertDialogConfirmation';
import ProfileImage from '@/components/Profile/ProfileImage';
import TeamTab from '@/components/Settings/Member/TeamTab';
import RoleChangeDropdown from '@/components/Settings/Member/RoleChangeDropdown';
import { useTeams } from '@/hooks/team/useTeams';
import ToggleOn from '@/icons/ToggleOn';
import ToggleOff from '@/icons/ToggleOff';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCurrentUser } from '@/utils/handleAuth';
import DownArrowIcon from '@/icons/DownArrow';
import Datatable from '@/components/DataTable/DataTable';
import DataTablePagination from '@/components/DataTable/DataTablePagination';
import DataTablePageSizeSelector from '@/components/DataTable/DataTablePageSizeSelector';
import DataTableSearch from '@/components/DataTable/DataTableSearch';
import {
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
} from '@tanstack/react-table';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';
import useSignup from '@/hooks/auth/useSignup';
import { UserMemberList } from '@/types/user';
import { PaginationType } from '@/types/common';
import useServerAction from '@/hooks/common/useServerActions';
import { toggleBrainAction } from '@/actions/user';
import Toast from '@/utils/toast';
import { removeUserAction, changeMemberRoleAction } from '@/actions/member';
import ResendIcon from '@/icons/ResendIcon';

const MemberTabsList = ({ totalMembers, totalTeam }) => {
	return (
		<TabsList className="px-0 space-x-6">
			<TabsTrigger className="px-0" value="Members">
				Members 
				<span className="mx-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white bg-red text-font-12 font-normal leading-4 text-center">
					{totalMembers}
				</span>
			</TabsTrigger>
			<TabsTrigger className="px-0" value="Team">
				Team 
				<span className="mx-1 inline-flex items-center justify-center w-5 h-5 rounded-full text-white bg-red text-font-12 font-normal leading-4 text-center">
					{totalTeam}
				</span>
			</TabsTrigger>
		</TabsList>
	);
};

export default function MembersSettings() {
	const membersOptions = [
		{ value: ROLE_TYPE.COMPANY_MANAGER, label: 'Manager' },
		{ value: ROLE_TYPE.USER, label: 'User' },
		{ value: ROLE_TYPE.ADMIN, label: 'Admin' },
	];

	const [selectedTab, setSelectedTab] = useState('Members');
	const [totalMembers, setTotalMembers] = useState(0);
	const [totalTeam, setTotalTeam] = useState(0);

	const isOpen = useSelector((store:any) => store.modalSlice.inviteMemberModal);
	const dispatch = useDispatch();
	const handleOpen = () => {
		dispatch(setInviteMemberModalAction(true));
		dispatch(setRequestDetailsModalAction(true));
	};
	const { getUsersList,totalInvitation, totalRecords } = useUsers();
	const {totalRecords:totalTeams,getTeams}=useTeams()

	useEffect(() => {
		// Fetch active members count for tab
		getUsersList([USER_STATUS.ACCEPT], false, '', PAGINATION.PER_PAGE_RECORD, (1 - 1) * PAGINATION.PER_PAGE_RECORD, PAGINATION.SORTING, 'id',true,true); 
		// Fetch invitation count (kept for any other internal use)
		getUsersList([USER_STATUS.PENDING,USER_STATUS.EXPIRED], false, '', PAGINATION.PER_PAGE_RECORD, (1 - 1) * PAGINATION.PER_PAGE_RECORD, PAGINATION.SORTING, 'id',true,false);
		getTeams({
			search: '',
			pagination: false,
			limit: PAGINATION.PER_PAGE_RECORD,
			offset: (1 - 1) * PAGINATION.PER_PAGE_RECORD,
			sort: PAGINATION.SORTING,
			sortby: 'id',
		});		

		
	}, []);

	useEffect(()=>{
		setTotalTeam(totalTeams)
	},[totalTeams])

	// Keep Members tab count reflecting only active users
	useEffect(()=>{
		setTotalMembers(totalRecords)
	},[totalRecords])
	
	return (
		<>
			<div className="max-lg:h-[50px] max-lg:sticky max-lg:top-0 bg-white z-10"></div>
			<div className="flex flex-col flex-1 relative h-full overflow-y-auto lg:pt-20 pb-[60px] px-2">
				<div className="w-full relative">
					<div className="mx-auto max-w-[950px]">
						<h5 className="text-font-18 font-bold text-b2 mb-1">
							Members
						</h5>
						<p className="text-font-15 font-normal text-b5 mb-2">
							View and manage members.
						</p>
						<Tabs defaultValue="Members" className="w-full" onValueChange={(newValue) => { setSelectedTab(newValue) }}>
							<MemberTabsList totalMembers={totalMembers} totalTeam={totalTeam} />
							<TabsContent value="Members" className="p-0 max-w-[calc(100vw-25px)] overflow-x-auto">
							<Member
							selectedTab={selectedTab}
							membersOptions={membersOptions}
							setTotalMembers={setTotalMembers}
							totalMembers={totalMembers}
							isOpen={isOpen}
							handleOpen={handleOpen}
							/>
							</TabsContent>
							<TabsContent value="Team" className="p-0 max-w-[calc(100vw-25px)] overflow-x-auto">
							  <TeamTab selectedTab={selectedTab} setTotalTeam={setTotalTeam} totalTeam={totalTeam}/>
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</div>
		</>
	);
}

const Member = ({ selectedTab, membersOptions, setTotalMembers, totalMembers, isOpen, handleOpen }) => {
	const { getUsersList, users, totalRecords, tableLoader,setUsers } = useUsers();
	const [toggleBrain,isPending]=useServerAction(toggleBrainAction)
	const { openModal, closeModal, isOpen: isConfirmOpen } = useModal();
	const currLoggedInUser=getCurrentUser()
	const { isOpen: isDeleteOpen, openModal: openToggleModal, closeModal: closeDeleteModal } = useModal();
	const [removeUser, isRemoveUserPending] = useServerAction(removeUserAction);
	const [columnFilters, setColumnFilters] = useState([]);
	const [sorting, setSorting] = useState([]);
	const [filterInput, setFilterInput] = useState('');
	const [statusFilter, setStatusFilter] = useState('All');
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10,
	});
	const [deluser, setDeluser] = useState('');
	const [toggleUserIds,setToggleUserIds]=useState({})
	const requestSize = false;
	const { reSendVerificationEmail } = useSignup();
	
	const handleUserDelete = async (id) => {
		const response = await removeUser(id);
		closeModal();
		setDeluser('');
		setTotalMembers(totalMembers - 1);
		const updatedObj = removeObjectFromArray(users, id);
		setUsers(updatedObj);
		Toast(response.message);
	}

	const handleFilterChange = (e) => {
		const value = e.target.value || '';
		setColumnFilters((old) => [
			{
				id: 'user',
				value: value?.toLowerCase(),
			},
		]);
		setFilterInput(value);
	};

	const handlePageSizeChange = (pageSize) => {
		setPagination((old) => ({ ...old, pageSize }));
	};
	
	const getStatusesByFilter = () => {
		switch (statusFilter) {
			case 'Active':
				return [USER_STATUS.ACCEPT];
			case 'Pending':
				return [USER_STATUS.PENDING];
			case 'Expired':
				return [USER_STATUS.EXPIRED];
			default:
				return [USER_STATUS.ACCEPT, USER_STATUS.PENDING, USER_STATUS.EXPIRED];
		}
	};

	const handleToggleUser = async ({userIds=[],enableAll=false,disableAll=false}) => {

		if (enableAll || disableAll) {
			const targetRoles =
				currLoggedInUser.roleCode === ROLE_TYPE.COMPANY
					? [ROLE_TYPE.COMPANY_MANAGER, ROLE_TYPE.USER, ROLE_TYPE.COMPANY]
					: currLoggedInUser.roleCode === ROLE_TYPE.COMPANY_MANAGER
					? [ROLE_TYPE.USER]
					: [];

			// Only act on active members
			userIds = users.reduce((acc, currUser) => {
				if (targetRoles.includes(currUser.roleCode) && currUser?.inviteSts === USER_STATUS.ACCEPT) {
					acc.push(currUser._id);
				}
				return acc;
			}, []);
		} else {
			userIds = [userIds];
		}

		const toggleValue = enableAll
			? true
			: disableAll
			? false
			: !toggleUserIds[userIds[0]];
		const toggleUsers = userIds.reduce((acc, currUserId) => {
			acc[currUserId] = toggleValue;
			return acc;
		}, {});

		setToggleUserIds((prev) => ({ ...prev, ...toggleUsers }));
	
		const response = await toggleBrain(userIds, toggleValue,enableAll || disableAll);
		Toast(response.message)
	};

	useEffect(() => {

		const timer=setTimeout(()=>{
			getUsersList(getStatusesByFilter(), requestSize, filterInput, pagination.pageSize, (pagination.pageIndex) * pagination.pageSize);

		},500)

		return () => clearTimeout(timer)

	}, [pagination, filterInput, sorting, columnFilters, statusFilter]);

	useEffect(() => {

	}, [selectedTab]);

	useEffect(()=>{
		let defaultToggleBrain = {};

		users.forEach((currUser) => {
			defaultToggleBrain[currUser._id] = currUser?.isPrivateBrainVisible;
		});

		setToggleUserIds(defaultToggleBrain);
	},[users])

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [selectedTab,filterInput]);
	
	// Do not update tab count from here; top-level keeps active-only count
	// useEffect(() => {
	// 	setTotalMembers(totalRecords);
	// }, [totalRecords]);

	const renderStatus = (status) => {
		switch ((status || '').toLowerCase()) {
			case 'accept':
				return <span className="text-font-14 text-green">Active</span>;
			case 'pending':
				return <span className="text-font-14 text-orange">Pending</span>;
			case 'expired':
				return <span className="text-font-14 text-reddark">Expired</span>;
			default:
				return <span className="text-font-14 text-gray"></span>;
		}
	};

	let columns = [
		{
			header: 'User',
			accessorKey:'email',
			cell: ({row}) => ( <span className="inline-flex space-x-2.5">
				<ProfileImage user={row.original} w={40} h={40} 
					classname={'user-img size-10 rounded-full mr-2.5 object-cover'}
					spanclass={'user-char flex items-center justify-center size-[35px] rounded-full bg-[#B3261E] text-b15 text-font-16 font-normal mr-2.5'}  />
				<span className="flex flex-col">
					<span className="text-font-14 font-semibold text-b2">
						{row.getValue("email")}
					</span>
					<span className="text-font-12 font-b5 font-normal">
						{row?.original?.fname && row?.original?.lname && row?.original?.fname + " " +row?.original?.lname}
					</span>
				</span>
			</span>),
		},
		{
			header: 'Joined',
			accessorKey: 'joined',
			cell: ({row}) => dateDisplay(row?.original?.createdAt),
		},
		{
			header: 'Role',
			accessorKey: 'role',
			cell: ({row}) => (
                <RoleChangeDropdown
                    currentRole={row?.original?.roleCode}
                    userId={row?.original?._id}
                    userEmail={row?.original?.email}
                    isAdmin={currLoggedInUser.roleCode === ROLE_TYPE.COMPANY}
					userStatus={row?.original?.inviteSts}
                />
            )
		},
		{
			header: 'Status',
			accessorKey: 'status',
			cell: ({row}) => renderStatus(row?.original?.inviteSts)
		},
		{
			header: () => (
				<div className="flex justify-center">
				<span className="">Private Brain</span>
				<DropdownMenu>
					<DropdownMenuTrigger
						className={`md:text-font-18 text-font-16 leading-[1.3] font-bold text-b2 flex items-center transition duration-150 ease-in-out focus:outline-none focus:ring-0 motion-reduce:transition-none [&[data-state=open]>span>.drop-arrow]:rotate-180`}
					>
						
						<span className="ml-1 flex items-center"> 
							<DownArrowIcon
								width={'14'}
								height={'8'}
								className="drop-arrow w-3.5 h-2 object-contain fill-b6 transition duration-150 ease-in-out"
							/>
						</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-[90px]">
						<DropdownMenuItem
							onClick={() => {
								openToggleModal();
								handleToggleUser({ enableAll: true });
							}}
						>
							Enable All
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								openToggleModal();
								handleToggleUser({ disableAll: true });
							}}
						>
							Disable All
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			
			),
			accessorKey: 'toggle-action',
			cell: ({row}) => {
				const isActiveRow = row?.original?.inviteSts === USER_STATUS.ACCEPT;
				const isInactiveUser = row?.original?.inviteSts === USER_STATUS.PENDING || row?.original?.inviteSts === USER_STATUS.EXPIRED;
				const visibilityAction =
					(currLoggedInUser.roleCode === ROLE_TYPE.COMPANY_MANAGER &&
						row?.original?.roleCode === ROLE_TYPE.COMPANY_MANAGER) ||
					(currLoggedInUser.roleCode === ROLE_TYPE.COMPANY_MANAGER &&
						row?.original?.roleCode === ROLE_TYPE.COMPANY);
				const isDisabled = visibilityAction || isPending || !isActiveRow;

				return (
					<button
						className="mx-auto w-full"
						style={{
							visibility: `${visibilityAction ? 'hidden' : 'visible'}`,
						}}
						disabled={isDisabled}
						onClick={() => {
							if (isDisabled) return;
							handleToggleUser({ userIds: row?.original?._id });
						  }}
					>
						{!isInactiveUser ? (
        toggleUserIds[row?.original?._id] ? (
							<TooltipProvider
								delayDuration={0}
								skipDelayDuration={0}
							>
								<Tooltip>
									<TooltipTrigger >
										<ToggleOn
											className={
												'w-6 h-6 fill-b4 object-contain'
											}
											width={16}
											height={16}
										/>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>Private Brain Enable</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						) : (
							<TooltipProvider
								delayDuration={0}
								skipDelayDuration={0}
							>
								<Tooltip>
									<TooltipTrigger>
										<ToggleOff
											className={
												'w-6 h-6 fill-b4 object-contain'
											}
											width={16}
											height={16}
										/>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>Private Brain Disabled</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						)
					) : null}
					</button>
				);
			},
		},
		{
			header: 'Delete',
			accessorKey: 'delete',
			cell: ({row}) => {
				const visibilityAction =
					(currLoggedInUser.roleCode === ROLE_TYPE.COMPANY_MANAGER &&
						row?.original?.roleCode === ROLE_TYPE.COMPANY_MANAGER) ||
					(currLoggedInUser.roleCode === ROLE_TYPE.COMPANY_MANAGER &&
						row?.original?.roleCode === ROLE_TYPE.COMPANY) ||
					row?.original?.roleCode === ROLE_TYPE.COMPANY;

				return (
					<div className="flex items-center gap-2 justify-center">
						<button
							className='mx-auto'
							key={row?.original?._id}
							style={{
								visibility: `${
									visibilityAction ? 'hidden' : 'visible'
								}`,
							}}
							disabled={visibilityAction}
							onClick={() => {
								openModal();
								setDeluser(row?.original?.id);
							}}
						>
							<TooltipProvider
								delayDuration={0}
								skipDelayDuration={0}
							>
								<Tooltip>
									<TooltipTrigger>
										<RemoveIcon
											className={
												'w-4 h-4 fill-b4 hover:fill-red object-contain'
											}
											width={16}
											height={16}
										/>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>Remove member</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</button>
					</div>
				);
			}
		},
		{
			header: 'Resend',
			accessorKey: 'resend',
			cell: ({row}) => {
				const status = (row?.original?.inviteSts || '').toUpperCase();
				const expiredDate = row?.original?.inviteExpireOn ? new Date(row.original.inviteExpireOn).getTime() : null;
				const isExpiredByDate = expiredDate ? expiredDate < Date.now() : false;
				const canResend = status === 'EXPIRED' || isExpiredByDate;

				if (!canResend) {
					return null;
				}

				return (
					<div className="flex items-center gap-2 justify-center">	
						<button
							className='mx-auto text-center p-2 rounded-md hover:bg-gray-100 transition-colors duration-200'
							onClick={() => {
								reSendVerificationEmail(row.original.email);
							}}
						>
							<TooltipProvider
								delayDuration={0}
								skipDelayDuration={0}
							>
								<Tooltip>
									<TooltipTrigger>
										<ResendIcon
											width={16}
											height={16}
											className="w-4 h-4 fill-b4 hover:fill-red object-contain transition-colors duration-200"
										/>
									</TooltipTrigger>
									<TooltipContent side="top">
										<p>Resend Invite</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</button>
					</div>
				);
			}
		}
	];

	const table = useReactTable({
		data: users,
		columns,
		state: {
			sorting,
			columnFilters,
			pagination,
		},
		pageCount: Math.ceil(totalRecords / pagination.pageSize),
		manualPagination: true,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableSorting: false
	});

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [selectedTab, filterInput]);

	return (
		<>
			<div className="flex flex-col w-full">
				<div className="flex items-center justify-between mb-5 max-md:flex-col max-md:items-start">
					<DataTableSearch
						placeholder={'Search a Member'}
						handleFilterChange={handleFilterChange}
						value={filterInput ?? ''}
					/>
					
					<div className="flex md:space-x-2 max-md:flex-wrap">
						<div className="w-[180px] max-md:mr-2">
							<Select
								options={[
									{ value: 'All', label: 'All' },
									{ value: 'Active', label: 'Active' },
									{ value: 'Pending', label: 'Pending' },
									{ value: 'Expired', label: 'Expired' },
								]}
								menuPosition="fixed"
								defaultValue={{ value: 'All', label: 'All' }}
								menuPlacement="auto"
								id="statusFilter"
								className="react-select-container react-select-border-light bg-white react-select-sm"
								classNamePrefix="react-select"
								onChange={(opt:any) => {
									setStatusFilter(opt?.value || 'All');
									setPagination((old) => ({ ...old, pageIndex: 0 }));
								}}
							/>
						</div>
						<DataTablePageSizeSelector
							pagination={pagination}
							handlePageSizeChange={handlePageSizeChange}
						/>
						<div className='max-md:w-full max-md:mt-2'>
							<button
							type="button"
							onClick={handleOpen}
							className="btn btn-black cursor-pointer"
							>
							<AddUser className="w-4 h-4 object-contain fill-b15 me-2.5 inline-block" />
							Invite
							</button>
							{isOpen && <InviteMemberModal getUsersList={getUsersList} />}
						</div>
						{/* <button className="ml-auto btn btn-outline-gray">
							Export Data
						</button> */}
					</div>
				</div>
				<Datatable table={table} loading={tableLoader} />
				<DataTablePagination
					table={table}
					pagination={pagination}
					handlePageSizeChange={handlePageSizeChange}
				/>
			</div>

			{isConfirmOpen && (
				<AlertDialogConfirmation
					description={'Are you sure you want to delete?'}
					btntext={'Delete'}
					btnclassName={'btn-red'}
					open={openModal}
					closeModal={closeModal}
					handleDelete={handleUserDelete}
					id={deluser}
					loading={isRemoveUserPending}
				/>
			)}
		</>
	);
}

const Invitation = ({ selectedTab, isOpen, handleOpen, setTotalInvitation, totalInvitation }) => {
	const { getUsersList, users, totalRecords, removeUser, tableLoader } = useUsers();
	const { openModal, closeModal, isOpen: isConfirmOpen } = useModal();
	const { reSendVerificationEmail } = useSignup();

	const [columnFilters, setColumnFilters] = useState([]);
	const [sorting, setSorting] = useState([]);
	const [filterInput, setFilterInput] = useState('');
	const [pagination, setPagination] = useState<PaginationType>({
		pageIndex: 0,
		pageSize: 10,
	});
	const [deluser, setDeluser] = useState('');
	const [manuallyReloadTable, setManuallyReloadTable] = useState<boolean>(false);
	const requestSize = false;


	const handleFilterChange = (e) => {
		const value = e.target.value || '';
		setColumnFilters(() => [
			{
				id: 'email',
				value: value?.toLowerCase(),
			},
		]);
		setFilterInput(value);
	};

	const handlePageSizeChange = (pageSize: number) => {
		setPagination((old) => ({ ...old, pageSize }));
	};

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [selectedTab,filterInput]);

	useEffect(() => {

		const timer=setTimeout(()=>{
			getUsersList([USER_STATUS.PENDING, USER_STATUS.EXPIRED], requestSize, filterInput, pagination.pageSize, (pagination.pageIndex) * pagination.pageSize);		
		},500)

		return ()=> clearTimeout(timer)
	}, [pagination, filterInput, sorting, columnFilters, manuallyReloadTable]);

	

	useEffect(() => {
		setTotalInvitation(totalRecords);
	}, [totalRecords]);

	const resendButtonExists =users.some((row:UserMemberList) => {
		const expiredDate = new Date(row?.inviteExpireOn).getTime();
		return expiredDate < new Date().getTime() || row.inviteSts === "EXPIRED";
	});

	let columns = [
		{
			header: 'User',
			accessorKey: 'email',
			cell: ({ row }) => (
				<span className="inline-flex space-x-2.5 items-center">
					<span className="bg-reddark text-b15 w-10 h-10 min-w-10 rounded-full flex items-center justify-center text-font-20 font-normal">
						{getEmailFirstLetter(row.getValue('email'))}
					</span>
					<span className="flex flex-col">
						<span className="text-font-14 font-semibold text-b2">
							{row?.original?.email}
						</span>
						<span className="text-font-12 font-b5 font-normal">
							{row?.original?.fname}
						</span>
					</span>
				</span>
			),
		},
		{
			header: 'Joined',
			accessorKey: 'joined',
			cell: ({ row }) => dateDisplay(row?.original?.createdAt),
		},
		{
			header: 'Role',
			accessorKey: 'role',
			cell: ({ row }) => row?.original?.roleCode,
		},
		{
			header: 'Status',
			accessorKey: 'status',
			cell: ({ row }) => {
				const expiredDate =new Date(row?.original?.inviteExpireOn).getTime() 
				
				return expiredDate < new Date().getTime()
					? renderStatus('EXPIRED')
					: renderStatus(row.original.inviteSts); 	
				
			}
		},
		...(resendButtonExists ? [{
			header: '',
			accessorKey: 'resend',
			cell: ({ row }) => {
				const expiredDate = new Date(row?.original?.inviteExpireOn).getTime();
				return expiredDate < new Date().getTime() || row.original.inviteSts === "EXPIRED" ? (
					<button
						className="btn btn-black max-w-[250px]"
						onClick={() => {
							reSendVerificationEmail(row.original.email);
							setManuallyReloadTable(true);
						}}
					>
						Resend
					</button>
				) : null;
			},
		}] : []),
		{
			header: 'Delete',
			accessorKey: 'action',
			cell: ({ row }) => (
				<button
					onClick={() => {
						openModal();
						setDeluser(row?.original?.id);
					}}
				>
					<TooltipProvider delayDuration={0} skipDelayDuration={0}>
						<Tooltip>
							<TooltipTrigger>
								<RemoveIcon
									className={'w-4 h-4 fill-b4 hover:fill-red object-contain'}
									width={16}
									height={16}
								/>
							</TooltipTrigger>
							<TooltipContent side="top">
								<p>Remove member</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</button>
			),
		},
	];

	const handleUserDelete = (id) => {
		removeUser(deluser);
		closeModal();
		setDeluser('');
		setTotalInvitation(totalInvitation - 1);
	}

	const renderStatus = (status) => {
		switch (status?.toLowerCase()) {
			case 'accept':
				return <span className="text-font-14 text-green">Accepted</span>;
			case 'pending':
				return <span className="text-font-14 text-orange">Pending</span>;
			case 'expired':
				return <span className="text-font-14 text-reddark">Expired</span>;
			default:
				return <span className="text-font-14 text-gray"></span>;
		}
	};

	const table = useReactTable({
		data: users || [],
		columns,
		state: {
			sorting,
			columnFilters,
			pagination,
		},
		pageCount: Math.ceil(totalRecords / pagination.pageSize),
		manualPagination: true,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		enableSorting: false
	});



	return <>
		<div className="flex justify-between mb-2 lg:flex-row flex-col">
			<div>
				<h5 className="text-font-14 font-semibold text-b2 mb-1">
					Individual Invitations
				</h5>
				<p className="text-font-14 font-normal text-b5 mb-1">
					Invite members and manage existing invitations.
				</p>
			</div>
			<div>
				<button
					type="button"
					onClick={handleOpen}
					className="btn btn-outline-gray cursor-pointer"
				>
					<AddUser className="w-4 h-4 object-contain fill-b15 me-2.5 inline-block" />
					Invite
				</button>
				{isOpen && <InviteMemberModal getUsersList={getUsersList} />}
			</div>
		</div>
		<div className="overflow-x-auto bg-white mt-4">
		<div className="flex flex-col w-full">
				<div className="flex items-center justify-between mb-5">
					<DataTableSearch
						placeholder={'Search a Member Name'}
						handleFilterChange={handleFilterChange}
						value={filterInput ?? ''}
					/>
					<div className="flex space-x-2">
						<DataTablePageSizeSelector
							pagination={pagination}
							handlePageSizeChange={handlePageSizeChange}
						/>
						{/* <button className="ml-auto btn btn-outline-gray">
							Export Data
						</button> */}
					</div>
				</div>
				<Datatable table={table} loading={tableLoader} />
				<DataTablePagination
					table={table}
					pagination={pagination}
					handlePageSizeChange={handlePageSizeChange}
				/>
			</div>
		</div>
		{isConfirmOpen && (
			<AlertDialogConfirmation
				description={
					'Are you sure you want to delete?'
				}
				btntext={'Delete'}
				btnclassName={'btn-red'}
				open={openModal}
				closeModal={closeModal}
				handleDelete={handleUserDelete}
				id={deluser}
			/>
		)}
	</>
}

const Request = ({ membersOptions, selectedTab, handleOpen, isOpen }) => {
	const { getUsersList, users, totalPages, totalRecords, tableLoader } = useUsers();

	const [searchFilter, setSearchFilter] = useState('');
	const [sortby, setSortBy] = useState('id');
	const [sort, setSort] = useState(PAGINATION.SORTING);
	const [perPageSize, setPerPageSize] = useState(PAGINATION.PER_PAGE_RECORD);
	
	const [page, setPage] = useState(1);
	const requestSize = true;

	useEffect(() => {
		getUsersList('', requestSize, searchFilter, perPageSize, (page - 1) * perPageSize, sort, sortby);		
	}, [sort, sortby, page, perPageSize, searchFilter]);

	useEffect(() => {
		setPage(1);
	}, [selectedTab]);

	const handleApprove = () => {
		// closeModal();
	}

	let columns = [
		{
			Header: 'User',
			id: 'id',
			accessor: (row) => <span className="inline-flex space-x-2.5">
				<span className="bg-reddark text-b15 w-10 h-10 min-w-10 rounded-full flex items-center justify-center text-font-20 font-normal">
					{getEmailFirstLetter(row?.email)}
				</span>
				<span className="flex flex-col">
					<span className="text-font-14 font-semibold text-b2">
						{row?.email}
					</span>
					<span className="text-font-12 font-b5 font-normal">
						{row?.fname}
					</span>
				</span>
			</span>,
		},
		{
			Header: 'Requested for',
			id: 'requested_for',
			accessor: (row) => <>Increase Storage to{' '}
				<span className="text-b2 font-semibold">
					{bytesToMegabytes(row?.requestSize)}{'mb'}
				</span></>,
		},
		{
			Header: 'Assigned Storage\t',
			id: 'role',
			accessor: (row) => <>{bytesToMegabytes(row?.fileSize)}{'mb'}</>,
		},
		{
			Header: '',
			id: 'action',
			accessor: (row) => <div className="flex items-center">
				<button
					type="button"
					className="btn btn-outline-gray"
				>
					Approve
				</button>
				<button
					type="button"
					onClick={handleOpen}
					className="ms-3 transparent-ghost-btn btn-round btn-round-icon [&>svg>path]:fill-b5"
				>
					<RightArrow />
				</button>
			</div>
		}
	];

	return <>
		<div className="flex w-full space-x-2.5">
			{/* <div className="search-wrap search-member relative flex-1">
				<input
					type="text"
					className="default-form-input default-form-input-border-light default-form-input-md !text-font-16"
					id="searchMember"
					placeholder="Search Member"
				/>
				<span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
					<SearchIcon />
				</span>
			</div> */}
			<Select
				options={membersOptions}
				menuPosition="fixed"
				defaultValue={membersOptions[0]}
				menuPlacement="auto"
				id="membersRes"
				className="react-select-container react-select-border-light react-select-sm w-[228px]"
				classNamePrefix="react-select"
			/>
		</div>
		{isOpen && (
			<RequestDetailsModal handleApprove={handleApprove} />
		)}
	</>
}