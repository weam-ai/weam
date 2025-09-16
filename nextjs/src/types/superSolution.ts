export interface AppSolution {
    _id: string;
    id: string;
    name: string;
    slug: string;
    description: string;
    icon: string;
    isActive: boolean;
    category: 'chat' | 'custom-gpt' | 'custom-templates' | 'prompts' | 'docs' | 'pro-agent' | 'mcp';
    route: string;
    appId?: {
      _id: string;
      name: string;
      icon: string;
    };
    isFavorite?: boolean;
  }
  
  export interface UserAppAccess {
    userId: string;
    userEmail: string;
    userName: string;
    roleCode: string;
    assignedApps: string[]; // Array of app IDs
    isActive: boolean;
  }
  
  export interface TeamAppAccess {
    teamId: string;
    teamName: string;
    assignedApps: string[]; // Array of app IDs
    isActive: boolean;
  }
  
  export interface AppAssignmentRequest {
    userId?: string;
    teamId?: string;
    appIds: string[];
    action: 'assign' | 'remove';
  }
  
  export interface SuperSolutionSettings {
    companyId: string;
    availableApps: AppSolution[];
    userAccess: UserAppAccess[];
    teamAccess: TeamAppAccess[];
    isEnabled: boolean;
  } 