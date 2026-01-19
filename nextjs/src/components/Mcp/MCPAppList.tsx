import AirTableIcon from '@/icons/AirTableIcon';
import AsanaIcon from '@/icons/AsanaIcon';
import CalendlyIcon from '@/icons/CalendlyIcon';
import CanvaIcon from '@/icons/CanvaIcon';
import FigmaIcon from '@/icons/FigmaIcon';
import GitHubIcon from '@/icons/GitHubIcon';
import GmailIcon from '@/icons/GmailIcon';
import GoogleCalendarIcon from '@/icons/GoogleCalendarIcon';
import GoogleDriveIcon from '@/icons/GoogleDriveIcon';
import MongoDBIcon from '@/icons/MongoDBIcon';
import NeightNIcon from '@/icons/nEightnIcon';
import NotionIcon from '@/icons/NotionIcon';
import SlackIcon from '@/icons/SlackIcon';
import StripeIcon from '@/icons/StripeIcon';
import ZapierIcon from '@/icons/ZapierIcon';
import ZoomIcon from '@/icons/ZoomIcon';

export const MCP_CODES = {
    "GITHUB": "GITHUB",
    "SLACK": "SLACK",
    "GMAIL": "GMAIL",
    "NOTION": "NOTION",
    "STRIPE": "STRIPE",
    "GOOGLE_DRIVE": "GOOGLE_DRIVE",
    "GOOGLE_CALENDAR": "GOOGLE_CALENDAR",
    "ZAPIER": "ZAPIER",
    "AIRTABLE": "AIRTABLE",
    "ASANA": "ASANA",
    "MONGODB": "MONGODB",
    "CANVA": "CANVA",
    "N8N": "N8N",
    "FIGMA": "FIGMA",
    "CALENDLY": "CALENDLY",
    "ZOOM": "ZOOM",
}

export const MCP_TOOLS = {
    [MCP_CODES.SLACK]: [
        'slack_list_channels',
        'slack_send_message',
        'slack_get_messages',
        'slack_list_users',
        'slack_get_user_info',
        'slack_get_user_profile',
        'slack_get_channel_members',
        'slack_open_dm',
        'slack_send_dm',
        'slack_send_ephemeral_message',
        'slack_create_channel',
        'slack_set_channel_topic',
        'slack_set_channel_purpose',
        'slack_archive_channel',
        'slack_invite_users_to_channel',
        'slack_kick_user_from_channel',
        'slack_reply_to_thread',
        'slack_get_thread_replies',
        'slack_start_thread',
        'slack_reply_to_thread_with_broadcast',
        'slack_get_thread_info',
        'slack_find_threads_in_channel',
        'get_channel_id'
    ],
    [MCP_CODES.GOOGLE_CALENDAR]: [
        "list_calendars",
        "get_events",
        "create_event",
        "modify_event",
        "delete_event",
        "get_event"
    ],
    [MCP_CODES.GOOGLE_DRIVE]: [
        "search_drive_files",
        "get_drive_file_content",
        "list_drive_items",
        "create_drive_file"
    ],
    [MCP_CODES.GMAIL]:[
        "search_gmail_messages",
        "get_gmail_message_content",
        "get_gmail_messages_content_batch",
        "send_gmail_message",
        "draft_gmail_message",
        "get_gmail_thread_content",
        "get_gmail_threads_content_batch",
        "list_gmail_labels",
        "manage_gmail_label",
        "modify_gmail_message_labels",
        "batch_modify_gmail_message_labels"
    ],
    [MCP_CODES.GITHUB]: [
        "github_get_commits",
        "github_get_user_info",
        "github_get_repositories",
        "github_get_repository_info",
        "github_create_branch",
        "github_get_repository_branches",
        "github_get_repository_issues",
        "github_create_pull_request",
        "github_get_pull_request_details",
        "github_get_pull_requests",
        "github_get_tags_or_branches",
        "github_global_search"
    ],
    [MCP_CODES.ZOOM]: [
        "getZoomUserInfo",
        "listZoomMeetings",
        "createZoomMeeting",
        "updateZoomMeeting",
        "deleteZoomMeeting",
        "listMeetingParticipants",
        "getMeetingPolls"
    ],
    [MCP_CODES.N8N]: [
        "list_n8n_workflows",
        "get_n8n_workflow",
        "create_n8n_workflow",
        "update_n8n_workflow",
        "execute_n8n_workflow"
    ]
};

export const MCP_BUTTON_CLASSNAME = 'text-b4 bg-white border border-b10 hover:bg-b2 hover:text-white transition-all duration-200';
export const MCP_COMING_SOON_BUTTON_CLASSNAME = 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed transition-all duration-200';
export const MCP_CONFIGURE_BUTTON_NAME = 'Configure';
export const MCP_COMING_SOON_BUTTON_NAME = 'Coming Soon';

const MCP_OPTIONS = [
    {
        icon: <GitHubIcon className="size-6" />,
        title: 'GitHub',
        code: MCP_CODES.GITHUB,
        description:
            'Link GitHub to automate PRs, issues, and code updates in your workflows.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
        tools: ["github_get_issues","github_create_issue","github_get_pull_requests","github_create_pull_request"]
    },
    {
        icon: <SlackIcon className="size-6" />,
        title: 'Slack',
        code: MCP_CODES.SLACK,
        description:
            'Connect Slack to get real-time alerts and team collaboration directly in your channels.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,        
        tools: ["slack_get_messages","slack_send_message","slack_list_channels"]
    },
    {
        icon: <GmailIcon className="size-6" />,
        title: 'Gmail',
        code: MCP_CODES.GMAIL,
        description:
            'Integrate Gmail to send and receive emails within your workflows seamlessly.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
        tools: ["gmail_get_messages","gmail_send_message"]
    },
    {
        icon: <GoogleDriveIcon className="size-6" />,
        title: 'Google Drive',
        code: MCP_CODES.GOOGLE_DRIVE,
        description: 'Pull and store files by integrating your Google Drive.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
    },
    {
        icon: <GoogleCalendarIcon className="size-6" />,
        title: 'Google Calendar',
        code: MCP_CODES.GOOGLE_CALENDAR,
        description:
            'Connect Google Calendar to auto-create events or pull availability in real time.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
    },
    {
        icon: <ZoomIcon className="size-6" />,
        title: 'Zoom',
        code: MCP_CODES.ZOOM,
        description:
            'Connect Zoom to manage meetings, participants, and video conferencing workflows.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
        tools: ["createZoomMeeting", "listZoomMeetings", "getZoomUserInfo", "listMeetingParticipants"]
    },
    {
        icon: <MongoDBIcon className="size-6" />,
        title: 'MongoDB',
        code: MCP_CODES.MONGODB,
        description:
            'Connect MongoDB to query, write, and automate database actions.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
    },
    {
        icon: <NotionIcon className="size-6" />,
        title: 'Notion',
        code: MCP_CODES.NOTION,
        description:
            'Sync with Notion to manage docs, databases, and notes dynamically.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <StripeIcon className="size-6" />,
        title: 'Stripe',
        code: MCP_CODES.STRIPE,
        description:
            'Connect Stripe to track payments, manage invoices, and trigger events from transactions.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <ZapierIcon className="size-6" />,
        title: 'Zapier',
        code: MCP_CODES.ZAPIER,
        description:
            'Use Zapier to unlock thousands of app integrations in just a few clicks.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <AirTableIcon className="size-6" />,
        title: 'Airtable',
        code: MCP_CODES.AIRTABLE,
        description:
            'Connect Airtable for powerful spreadsheet-database functionality in workflows.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <AsanaIcon className="size-6" />,
        title: 'Asana',
        code: MCP_CODES.ASANA,
        description:
            'Link Asana to automate task creation and updates with your project workflows.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <CanvaIcon className="size-6" />,
        title: 'Canva',
        code: MCP_CODES.CANVA,
        description:
            'Bring in Canva to auto-generate or manage creative assets right inside workflows.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <NeightNIcon className="size-6" />,
        title: 'n8n',
        code: MCP_CODES.N8N,
        description:
            'Integrate n8n to build advanced workflows with your existing tools.',
        buttonText: MCP_CONFIGURE_BUTTON_NAME,
        buttonClassName: MCP_BUTTON_CLASSNAME,
        tools: [
            "list_n8n_workflows", 
            "get_n8n_workflow", 
            "create_n8n_workflow", 
            "execute_n8n_workflow", 
            "update_n8n_workflow"
        ]
    },
    {
        icon: <FigmaIcon className="size-6" />,
        title: 'Figma',
        code: MCP_CODES.FIGMA,
        description:
            'Connect Figma to sync design files or trigger actions from new updates.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
    {
        icon: <CalendlyIcon className="size-6" />,
        title: 'Calendly',
        code: MCP_CODES.CALENDLY,
        description:
            'Sync Calendly to automate scheduling and capture meeting data instantly.',
        buttonText: MCP_COMING_SOON_BUTTON_NAME,
        buttonClassName: MCP_COMING_SOON_BUTTON_CLASSNAME,
    },
] as const;

// Create a lookup map for better performance
export const MCP_OPTIONS_MAP = new Map(
    MCP_OPTIONS.map(option => [option.code, option])
);

export default MCP_OPTIONS;