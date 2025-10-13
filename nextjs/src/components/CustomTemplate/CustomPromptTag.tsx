'use client'

const PromptTag = ({setSelectedTag, selectedTag}) => {
    
    return (
        <>
            <div className="w-full mx-auto mt-5 flex flex-wrap items-center gap-1 justify-center">
                <div onClick={()=>setSelectedTag('')} className={`bg-white text-font-14 border px-3 py-1 rounded-md hover:bg-b2 hover:text-white cursor-pointer mb-2 ${selectedTag === '' ? 'active [&.active]:bg-b2 [&.active]:text-white' : ''}`}>
                    All
                </div>
                <div onClick={()=>setSelectedTag('Marketing')} className={`bg-white text-font-14 border px-3 py-1 rounded-md hover:bg-b2 hover:text-white cursor-pointer mb-2 ${selectedTag === 'Marketing' ? 'active [&.active]:bg-b2 [&.active]:text-white' : ''}`}>
                    Marketing
                </div>
                <div onClick={()=>setSelectedTag('Sales')} className={`bg-white text-font-14 border px-3 py-1 rounded-md hover:bg-b2 hover:text-white cursor-pointer mb-2 ${selectedTag === 'Sales' ? 'active [&.active]:bg-b2 [&.active]:text-white' : ''}`}>
                    Sales
                </div>
                <div onClick={()=>setSelectedTag('Engineering')} className={`bg-white text-font-14 border px-3 py-1 rounded-md hover:bg-b2 hover:text-white cursor-pointer mb-2 ${selectedTag === 'Engineering' ? 'active [&.active]:bg-b2 [&.active]:text-white' : ''}`}>
                    Engineering
                </div>
                <div onClick={()=>setSelectedTag('Misc')} className={`bg-white text-font-14 border px-3 py-1 rounded-md hover:bg-b2 hover:text-white cursor-pointer mb-2 ${selectedTag === 'Misc' ? 'active [&.active]:bg-b2 [&.active]:text-white' : ''}`}>
                    Misc
                </div>
                <div onClick={()=>setSelectedTag('Accounting')} className={`bg-white text-font-14 border px-3 py-1 rounded-md hover:bg-b2 hover:text-white cursor-pointer mb-2 ${selectedTag === 'Accounting' ? 'active [&.active]:bg-b2 [&.active]:text-white' : ''}`}>
                    Accounting
                </div>
            </div>
        </>
    );
};

export default PromptTag;
