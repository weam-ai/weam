import { 
  MessageSquare, 
  Users, 
  Image as ImageIcon, 
  FileText, 
  Code, 
  BarChart3, 
  MessageCircle,
  Calendar,
  Globe,
  Palette,
  Database,
  Bot,
  Zap,
  Shield,
  Settings,
  HelpCircle
} from 'lucide-react';
import AIDocsIcon from '@/icons/AIDocsIcon';

// Map backend icon names to actual icon components
export const iconMapping: Record<string, React.ComponentType<any>> = {
  'chat-icon': MessageCircle,
  'meeting-icon': Calendar,
  'translate-icon': Globe,
  'image-icon': ImageIcon,
  'writing-icon': AIDocsIcon,
  'document-icon': FileText,
  'ai-docs-icon': AIDocsIcon,
  'docs-icon': FileText,
  'code-icon': Code,
  'chart-icon': BarChart3,
  'bot-icon': Bot,
  'ai-icon': Zap,
  'security-icon': Shield,
  'settings-icon': Settings,
  'help-icon': HelpCircle,
  'user-icon': Users,
  'team-icon': Users,
  'data-icon': Database,
  'media-icon': ImageIcon,
  'content-icon': FileText,
  'productivity-icon': Zap,
  'development-icon': Code,
  'analytics-icon': BarChart3,
  'communication-icon': MessageSquare,
  'language-icon': Globe,
  'default-icon': HelpCircle
};

// Function to get icon component by name
export const getIconComponent = (iconName: string) => {
  return iconMapping[iconName] || iconMapping['default-icon'];
};

// Function to get icon component with fallback
export const getIconWithFallback = (iconName: string, fallbackIcon = HelpCircle) => {
  return iconMapping[iconName] || fallbackIcon;
};