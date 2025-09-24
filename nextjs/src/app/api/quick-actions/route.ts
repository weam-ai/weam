import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/config/withSession';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        
        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { action, chatId, conversations, message } = await request.json();

        if (!action) {
            return NextResponse.json(
                { error: 'Action is required' },
                { status: 400 }
            );
        }

        let result: string;

        switch (action) {
            case 'summarize':
                result = await handleSummarize(conversations);
                break;
            
            case 'extract_action_items':
                result = await handleExtractActionItems(conversations);
                break;
            
            case 'generate_follow_up':
                result = await handleGenerateFollowUp(conversations);
                break;
            
            case 'format_email':
                result = await handleFormatEmail(message || '');
                break;
            
            case 'export_notes':
                result = await handleExportNotes(conversations);
                break;
            
            default:
                return NextResponse.json(
                    { error: `Unknown action: ${action}` },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            result,
            action
        });

    } catch (error) {
        console.error('Quick action API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Helper functions for each action type
async function handleSummarize(conversations: any[]): Promise<string> {
    if (!conversations || conversations.length === 0) {
        throw new Error('No conversations to summarize');
    }

    const conversationText = conversations
        .map(conv => `${conv.user?.fname || 'User'}: ${conv.message || ''}`)
        .join('\n\n');

    // In a full implementation, this would call an AI service
    // For now, we'll create a basic summary
    const summary = `## Conversation Summary\n\nThis conversation contains ${conversations.length} messages covering various topics. Key points include:\n\n- Discussion started with: "${conversations[0]?.message?.substring(0, 100)}..."\n- Total messages: ${conversations.length}\n- Participants: ${new Set(conversations.map(c => c.user?.fname)).size} unique users\n\n*This is a basic summary. In a full implementation, this would use AI to generate a more detailed summary.*`;

    return summary;
}

async function handleExtractActionItems(conversations: any[]): Promise<string> {
    if (!conversations || conversations.length === 0) {
        throw new Error('No conversations to analyze');
    }

    // Simple action item extraction
    const actionItems = `## Action Items\n\nBased on the conversation, here are potential action items:\n\n- [ ] Review the main discussion points\n- [ ] Follow up on any pending questions\n- [ ] Document key decisions made\n- [ ] Schedule any necessary follow-up meetings\n\n*This is a template. In a full implementation, AI would analyze the conversation to extract specific action items.*`;

    return actionItems;
}

async function handleGenerateFollowUp(conversations: any[]): Promise<string> {
    if (!conversations || conversations.length === 0) {
        throw new Error('No conversations to analyze');
    }

    const lastMessage = conversations[conversations.length - 1]?.message || '';
    
    const followUpQuestions = `## Follow-up Questions\n\nBased on the conversation, here are some relevant follow-up questions:\n\n1. Can you provide more details about the main topic discussed?\n2. What are the next steps we should consider?\n3. Are there any additional resources or information needed?\n4. How can we ensure proper follow-through on the discussed items?\n\n*These are template questions. In a full implementation, AI would generate context-specific follow-up questions.*`;

    return followUpQuestions;
}

async function handleFormatEmail(message: string): Promise<string> {
    if (!message) {
        throw new Error('No message to format');
    }

    const emailFormat = `Subject: Follow-up on Our Discussion\n\nDear [Recipient Name],\n\nI hope this email finds you well. Following up on our recent discussion:\n\n${message}\n\nI would appreciate your thoughts on the above points and look forward to hearing from you soon.\n\nBest regards,\n[Your Name]`;

    return emailFormat;
}

async function handleExportNotes(conversations: any[]): Promise<string> {
    if (!conversations || conversations.length === 0) {
        throw new Error('No conversations to export');
    }

    const markdownContent = `# Conversation Export\n\n**Date:** ${new Date().toLocaleDateString()}\n**Participants:** ${new Set(conversations.map(c => c.user?.fname)).join(', ')}\n\n---\n\n${conversations.map((conv, index) => 
        `## Message ${index + 1}\n\n**From:** ${conv.user?.fname || 'User'}\n**Time:** ${new Date(conv.createdAt).toLocaleString()}\n\n${conv.message || ''}\n\n---\n`
    ).join('\n')}`;

    return markdownContent;
}
