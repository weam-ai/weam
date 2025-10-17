import { TabsContent } from '@/components/ui/tabs';
import APIModelChoose, { ModelDeleteButton } from './APIModelChoose';
import { fetchAiModal } from '@/actions/modals';
import { getModelImageByName, MODAL_NAME_CONVERSION } from '@/utils/constant';
import { DynamicImage } from '@/widgets/DynamicImage';
import { LINK } from '@/config/config';

type APIKeyConfigProps = {
    tab: string;
}

const RenderModelList = async () => {
    const result = await fetchAiModal();
    const modelList = result.data.reduce((acc, model) => {
        if (acc.find((item) => item.bot.code === model.bot.code)) {
            return acc;
        }
        acc.push(model);
        return acc;
    }, []);

    if (!modelList.length) return <div className="text-font-14 mt-5">No model added yet</div>
    return (
        <div className="flex flex-col text-font-14 mt-5">
            {
                modelList.map((model) => {
                    return (
                        <div className="border-b px-2 py-3 last:border-none flex items-center gap-2" key={model._id}>
                            <DynamicImage
                                src={model.bot.code === 'OLLAMA' ? LINK.OLLAMA_IMAGE_PATH : getModelImageByName(model.name)}
                                alt={'API Key Placeholder'}
                                width={40}
                                height={40}
                                className="w-6 h-6 rounded-full object-cover "
                            />
                            {model.bot.title}
                            {model?.provider && (
                                <span className="text-font-12 text-font-gray-500">
                                    ({model.provider})
                                </span>
                            )}
                            <ModelDeleteButton modelCode={model.bot.code} />
                        </div>
                    )
                })
            }
        </div>
    )
}

const APIKeyConfig = ({ tab }: APIKeyConfigProps) => {
    return (
        <TabsContent value={tab}>
            <APIModelChoose />
            <div className="p-5 border rounded-md">
                <h3 className="font-bold text-font-14">Model List</h3>
                <p className="text-font-14">
                    The models below are already added to this platform. You can
                    remove models from the list below. To add a model, select
                    one above and enter the API key.
                </p>
                <RenderModelList />
            </div>
        </TabsContent>
    );
};

export default APIKeyConfig;
