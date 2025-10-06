import React, { useState } from 'react';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import Label from '@/widgets/Label';
import Toast from '@/utils/toast';
import commonApi from '@/api';
import { MODULE_ACTIONS } from '@/utils/constant';

const ResponseTime = ({ m, setShowTimer }) => {
    const data = [
        {
            id: 1,
            value: '5'
        },
        {
            id: 2,
            value: '10'
        },
        {
            id: 3,
            value: '15'
        },
        {
            id: 4,
            value: '30'
        },
        {
            id: 5,
            value: '45'
        },
        {
            id: 6,
            value: '60'
        },
    ]

    const [options, setOptions] = useState('5 Mins');
    const handleValueChange = (value) => {
        setOptions(value);
        Toast(`You saved ${value} mins`)
        commonApi({
            action: MODULE_ACTIONS.SAVE_RESPONSE_TIME,
            data: {
                id: m.id,
                responseTime: value
            }
        }).catch(error => console.error('error: ', error));
        setShowTimer(false);
    };
    return (
        <div className=' px-4 pb-4 rounded-10'>
            <div className="font-bold mb-2">How much time do you save? (In Minutes)</div>
            <RadioGroup value={options} defaultValue="option-1" className="flex" onValueChange={handleValueChange}>
                {
                    data.map((el) => (
                        <div key={el.id} className="flex items-center space-x-2 mr-1 mt-1 relative">
                            <RadioGroupItem className="absolute left-0 top-0 opacity-0" value={el.value} id={el.value}/>
                            <Label className={'text-font-16 block w-9 h-9 bg-ligheter text-black rounded-[6px] text-center leading-9 !m-0 cursor-pointer hover:bg-black hover:text-white'} htmlFor={el.value} title={el.value} required={false}/>
                        </div>
                    ))
                }
            </RadioGroup>
        </div>
    );
};

export default ResponseTime;
