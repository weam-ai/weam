'use client';
import React from 'react';
import Image from 'next/image';
import Avatar1 from '../../../public/avatar-1.jpg';
import ArrowBack from '@/icons/ArrowBack';
import ArrowNext from '@/icons/ArrowNext';

const AddMember = ({ onNext, onPrev }) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle form submission, validation, or API calls here
        // For simplicity, let's just move to the next step
        onNext();
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                {/* Search Start */}
                <div className="search-docs relative mb-2.5">
                    <input
                        type="text"
                        className="default-form-input default-form-input-md !border-b10 focus:!border-b2 !pl-10"
                        id="searchMember"
                        placeholder="Search Member"
                    />
                    <span className="inline-block absolute left-[15px] top-1/2 -translate-y-1/2 [&>svg]:fill-b7">
                        <svg
                            width="16"
                            height="17"
                            viewBox="0 0 16 17"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M7.17959 0.50293C5.27642 0.50612 3.45212 1.26356 2.10638 2.60931C0.760633 3.95505 0.00319056 5.77935 0 7.68251C0.0015906 9.58728 0.758136 11.4138 2.10388 12.7618C3.44962 14.1098 5.27482 14.8694 7.17959 14.8742C8.8689 14.8742 10.4255 14.2799 11.6563 13.2965L14.6458 16.2859C14.7972 16.4268 14.9973 16.5034 15.2041 16.4998C15.4109 16.4962 15.6082 16.4126 15.7546 16.2665C15.901 16.1205 15.9852 15.9234 15.9893 15.7166C15.9935 15.5099 15.9174 15.3096 15.777 15.1577L12.7875 12.1652C13.8085 10.8954 14.3651 9.31492 14.3652 7.68553C14.3652 3.72771 11.1374 0.50293 7.17959 0.50293ZM7.17959 2.10174C10.2746 2.10174 12.7664 4.59047 12.7664 7.68251C12.7664 10.7746 10.2746 13.2784 7.17959 13.2784C4.08452 13.2784 1.5958 10.7836 1.5958 7.68855C1.5958 4.59348 4.08452 2.10174 7.17959 2.10174Z" />
                        </svg>
                    </span>
                </div>
                {/* Search Start */}
                <div className="member-lists bg-white p-5 flex flex-col gap-2.5 rounded-custom h-full overflow-y-auto w-full">
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                    {/* Member Item Start */}
                    <div className="member-item flex px-5 py-2.5 rounded-custom bg-b12">
                        <div className="block pt-1.5 !ps-[1.5rem]">
                            <input
                                className="input-checkbox bg-white !-ms-[1.5rem] !me-0 !mt-[0.15rem]"
                                type="checkbox"
                                id="checkboxNoLabel"
                                value=""
                                aria-label="..."
                            />
                        </div>
                        <div className="member-img-name ms-5 flex items-center">
                            <Image
                                src={Avatar1}
                                alt="Christopher Miller"
                                width={40}
                                height={40}
                                className="w-10 h-10 min-w-10 rounded-full object-cover"
                            ></Image>
                            <p className="my-0 ml-2.5 text-font-16 leading-[22px] font-normal text-b2">
                                Christopher Miller
                            </p>
                        </div>
                    </div>
                    {/* Member Item End */}
                </div>

                <div className="flex justify-between mt-5">
                    <button
                        type="button"
                        onClick={onPrev}
                        className="btn btn-black"
                    >
                        <ArrowBack
                            className="me-2.5 inline-block align-middle -mt-0.5 fill-b15"
                            width="14"
                            height="12"
                        />
                        Previous
                    </button>
                    <button type="submit" className="btn btn-black">
                        Next
                        <ArrowNext
                            width="14"
                            height="12"
                            className="fill-b15 ms-2.5 inline-block align-middle -mt-0.5"
                        />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddMember;
