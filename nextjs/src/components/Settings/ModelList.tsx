import { fetchAiModal } from "@/actions/modals";
import { RESPONSE_STATUS } from "@/utils/constant";
import { TabsContent } from "../ui/tabs";
import { getModelImageByCode, modelNameConvert } from "@/utils/common";
import { sortArrayByBotCodeWithDisabledLast } from "@/utils/helper";
import { DynamicImage } from "@/widgets/DynamicImage";

const ModalNotFound = () => {
    return (
        <p className="flex justify-center mb-10 mt-10">
            No Model Found
        </p>
    )
}

export const ModalItem = ({ model }) => {
    return (
        <div
            className="group/item relative flex items-center py-4 px-5 border gap-2 m-1 rounded-md"
        >
            <DynamicImage
                src={getModelImageByCode(model?.bot?.code)}
                alt={model?.bot?.code}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover "
            />
            <div className="flex-1 ms-1">
                <h5 className="text-font-14 font-semibold text-b2">
                    {modelNameConvert(model?.bot?.code, model?.name)}
                </h5>
                <p className="text-font-12 font-normal text-b5">
                    {model?.bot?.title}
                </p>
            </div>
        </div>
    );
}

const ModelList = async () => {
    const { data, status } = await fetchAiModal();
    const modelSequence = status === RESPONSE_STATUS.SUCCESS && data.length > 0 ? sortArrayByBotCodeWithDisabledLast(data) : [];
    return (
        <TabsContent value="model-settings">
            {/* <div className="relative mb-5 mt-5 w-auto">
                <input
                    type="text"
                    className="default-form-input !pl-10 !border-b10"
                    id="addMember"
                    placeholder="Search Models"
                />
                <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                    <SearchIcon />
                </span>
                <button
                    className="absolute cursor-pointer right-3 top-1/2 -translate-y-1/2"
                >
                    <Close className={'fill-gray-600 size-2'} />
                </button>
            </div> */}
            <div className="mt-4 overflow-y-auto md:max-h-full max-h-full md:grid-cols-3 md:grid">
                {status == RESPONSE_STATUS.SUCCESS && modelSequence.length > 0 ? modelSequence.map((model) => <ModalItem model={model} key={model._id} />) : <ModalNotFound />}
            </div>
        </TabsContent>
    );
};

export default ModelList
