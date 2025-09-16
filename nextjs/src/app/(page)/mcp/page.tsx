import MCP_OPTIONS from '@/components/Mcp/MCPAppList';
import { SearchIcon } from 'lucide-react';
import ConnectedAppSelection from '@/components/Mcp/ConnectedAppCard';
import SearchInput from '@/components/Mcp/SearchInput';
import { getSessionUser } from '@/utils/handleAuth';
import { getUserByIdAction } from '@/actions/user';

type McpAppsProps = {
    searchParams: {
        query?: string;
    };
};

const McpApps = async ({ searchParams }: McpAppsProps) => {
    const session = await getSessionUser();
    const profile = await getUserByIdAction(session._id);
    const mcpData = profile?.data?.mcpdata;
    
    const filteredApps = searchParams?.query
        ?
        MCP_OPTIONS.filter(
            (app) =>
                app.title
                    .toLowerCase()
                    .includes(searchParams.query.toLowerCase()) ||
                app.description
                    .toLowerCase()
                    .includes(searchParams.query.toLowerCase())
        )
        : MCP_OPTIONS;

    return (
        <div className="w-full h-full mt-8 max-lg:mt-12 md:px-10 px-4 overflow-hidden">
            <div className="flex items-center">
                <div>
                    <h2 className="text-font-22 font-bold">Connections</h2>
                    <p className="text-b5 text-font-14">
                        Unlock more with Weam when you connect these reviewed
                        and recommended tools.
                    </p>
                </div>
                <div className="w-80 ml-auto relative">
                    <SearchIcon
                        width={20}
                        height={20}
                        className="w-4 h-auto absolute left-3 top-1/2 translate-y-[-50%]"
                    />
                    <SearchInput />
                </div>
            </div>

            <ConnectedAppSelection filteredApps={filteredApps} mcpData={mcpData} />
        </div>
    );
};

export default McpApps;
