'use client';

import { useState, useEffect } from 'react';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '../ui/hover-card';
import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from '../ui/dialog';
import useSuperSolution from '@/hooks/superSolution/useSuperSolution';
import { getCurrentUser } from '@/utils/handleAuth';
import Link from 'next/link';
import { ROLE_TYPE } from '@/utils/constant';
import { LINK, NODE_API_PREFIX } from '@/config/config';
import { getIconComponent } from '@/utils/iconMapping';
import { useMediaQuery } from '@/hooks/use-media-query';
import DashboardIcon from '@/icons/DashboardIcon';

interface SuperSolutionHoverProps {
    className?: string;
}

type AppData = {
    id: string;
    _id: string;
    name: string;
    icon: string;
    pathToOpen: string;
};

type SolutionData = {
    _id: string;
    appId: AppData;
    pathToOpen: string;
    name: string;
};

const SuperSolutionHover = ({ className }: SuperSolutionHoverProps) => {
    const [solutions, setSolutions] = useState<SolutionData[]>([]);
    const [installedSolutions, setInstalledSolutions] = useState<{ [key: string]: boolean }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { getSolutionAppByUserId } = useSuperSolution();
    const user = getCurrentUser();
    const isMobile = useMediaQuery('(max-width: 1024px)');

    // Mapping from app names to solution types
    const getSolutionTypeFromAppName = (appName: string): string => {
        const mapping: { [key: string]: string } = {
            'AI Docs': 'ai-doc-editor',
            'AI Recruiter': 'ai-recruiter',
            'AI Landing Page Generator': 'ai-landing-page-generator',
            'SEO Content Gen': 'seo-content-gen'
        };
        return mapping[appName] || '';
    };

    // Check installation status for all solutions
    const checkInstallationStatus = async (solutions: SolutionData[]) => {
        const solutionTypes = solutions.map(solution => {
            const appName = ROLE_TYPE.USER === user?.roleCode ? solution?.appId?.name : solution?.name;
            return getSolutionTypeFromAppName(appName);
        }).filter(Boolean);
        
        const installedStatus: { [key: string]: boolean } = {};
        
        for (const solutionType of solutionTypes) {
            try {
                const baseUrl = `${LINK.COMMON_NODE_API_URL}${NODE_API_PREFIX}`;
                const healthUrl = `${baseUrl}/web/solution-install-progress/health?solutionType=${encodeURIComponent(solutionType)}`;
                const response = await fetch(healthUrl);
                
                if (response.ok) {
                    const data = await response.json();
                    installedStatus[solutionType] = data.status === 'running';
                } else {
                    installedStatus[solutionType] = false;
                }
            } catch (error) {
                console.log(`Health check error for ${solutionType}:`, error);
                installedStatus[solutionType] = false;
            }
        }
        
        setInstalledSolutions(installedStatus);
        return installedStatus;
    };

    const fetchUserSolutions = async () => {
        if (!user?._id || hasLoaded) return;

        try {
            setIsLoading(true);
            const data = await getSolutionAppByUserId(user._id);
            const solutionsData = data || [];
            
            // Check installation status for all solutions
            const installedStatus = await checkInstallationStatus(solutionsData);
            
            // Filter solutions to only show installed ones
            const installedSolutionsData = solutionsData.filter(solution => {
                const appName = ROLE_TYPE.USER === user?.roleCode ? solution?.appId?.name : solution?.name;
                const solutionType = getSolutionTypeFromAppName(appName);
                return installedStatus[solutionType] === true;
            });

            setSolutions(installedSolutionsData);
            setHasLoaded(true);
        } catch (error) {
            console.error('Error fetching user solutions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTriggerClick = () => {
        if (!hasLoaded) {
            fetchUserSolutions();
        }
        setIsDialogOpen(true);
    };

    const renderContent = () => (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-b12 rounded-lg flex items-center justify-center">
                    <DashboardIcon 
                    height={16} 
                    width={16} 
                    className={'w-[16px] h-auto object-contain fill-b5'} 
                    />
                </div>
                <h4 className="font-semibold text-gray-900">
                    Your Apps
                </h4>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-b7"></div>
                    <span className="ml-2 text-font-14 text-gray-500">
                        Loading Apps...
                    </span>
                </div>
            ) : solutions.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 max-h-[280px] overflow-y-auto">
                    {solutions.map((solution) => (
                        <Link
                            key={
                                ROLE_TYPE.USER === user?.roleCode
                                    ? solution?.appId?._id
                                    : solution?._id
                            }
                            href={
                                ROLE_TYPE.USER === user?.roleCode
                                    ? `${LINK.DOMAIN_URL}${solution?.appId?.pathToOpen}`
                                    : `${LINK.DOMAIN_URL}${solution?.pathToOpen}`
                            }
                            className="group flex flex-col items-center gap-2 p-3 hover:bg-gray-50 rounded-xl transition-all duration-200 hover:scale-105"
                        >
                            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-all duration-200">
                                {ROLE_TYPE.USER === user?.roleCode
                                    ? (() => {
                                          const IconComponent =
                                              getIconComponent(
                                                  solution?.appId
                                                      ?.icon
                                              );
                                          return (
                                              <IconComponent className="w-6 h-6 text-gray-600" />
                                          );
                                      })()
                                    : (() => {
                                          const IconComponent =
                                              getIconComponent(
                                                  solution?.icon
                                              );
                                          return (
                                              <IconComponent className="w-6 h-6 text-gray-600" />
                                          );
                                      })()
                                }
                            </div>
                            <span className="text-font-14 text-gray-700 text-center font-medium group-hover:text-b2 transition-colors">
                                {ROLE_TYPE.USER === user?.roleCode
                                    ? solution?.appId?.name
                                    : solution?.name}
                            </span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <DashboardIcon 
                        height={24} 
                        width={24} 
                        className={'w-6 h-auto object-contain fill-b5'} 
                        />
                    </div>
                    <p className="text-font-14 text-gray-500 mb-2">
                        No Apps available
                    </p>
                    <p className="text-xs text-gray-400">
                        Create your first app to get started
                    </p>
                </div>
            )}

            {/* <div className="pt-4 border-t border-gray-100">
                <Link
                    href="/settings/super-solution"
                    className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                >
                    <span>View all solutions</span>
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                </Link>
            </div> */}
        </div>
    );

    const triggerElement = (
        <div className={className}>
            <DashboardIcon 
            height={16} 
            width={16} 
            className={'w-[16px] h-auto object-contain fill-b5'} 
            />
            <span className='collapsed-text'>Apps</span>
        </div>
    );

    if (isMobile) {
        return (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <div onClick={handleTriggerClick}>
                        {triggerElement}
                    </div>
                </DialogTrigger>
                <DialogContent 
                    className="border-none bg-white shadow-xl rounded-xl p-6 min-w-[320px] max-w-[400px] z-50 max-h-[80vh] overflow-y-auto"
                    showCloseButton={true}
                >
                    {renderContent()}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <HoverCard openDelay={300}>
            <HoverCardTrigger asChild>
                <div 
                    onPointerEnter={() => {
                        if (!hasLoaded) {
                            fetchUserSolutions();
                        }
                    }}
                >
                    {triggerElement}
                </div>
            </HoverCardTrigger>
            <HoverCardContent
                side="right"
                className="border-none bg-white shadow-xl rounded-xl p-6 min-w-[320px] max-w-[400px] z-50 rounded"
                sideOffset={18}
            >
                {renderContent()}
            </HoverCardContent>
            </HoverCard>
    );
};

export default SuperSolutionHover;