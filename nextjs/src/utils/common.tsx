import DocsIcon from '@/icons/Docs';
import PdfIcon from '@/icons/PdfIcon';
import dayjs from 'dayjs';
import moment from 'moment';
import { DEFAULT_DATE_FORMAT, MODEL_CREDIT_INFO, MODEL_IMAGE_BY_CODE, SUBSCRIPTION_STATUS, AI_MODEL_CODE, GENERAL_BRAIN_TITLE, DEFAULT_BRAIN_TITLE, DEFAULT_CHAT_SLUG } from './constant';
import { isIndiaByTimezone, retrieveBrainData } from './helper';
import { STRIPE_SUBSCRIPTION_PRICE_ID, STRIPE_SUBSCRIPTION_PRICE_ID_IND } from '@/config/config';
import ExcelFileIcon from '@/icons/ExcelFileIcon';
import TxtFileIcon from '@/icons/TXTFILEIcon';
import CommonFileIcon from '@/icons/CommonFileIcon';
import { DEFAULT_CHARACTERS } from '@/components/CustomGpt/CharacterSelectionDialog';

export const isArray = (data) => data.constructor.name === 'Array';

export const isObject = (data) => data.constructor.name === 'Object';

export const isBoolean = (data) => data.constructor.name === 'Boolean';

export const isString = (data) => data.constructor.name === 'String';

export const joinString = (text) => {
    return text.replaceAll(' ', '_');
};

export const getEmailFirstLetter = (email) => {
    const firstPart = email.split('@')[0];
    return firstPart.charAt(0).toUpperCase();
};

export const capitalizeFirstLetter = (str) =>
    `${str.charAt(0).toUpperCase()}${str.slice(1)}`;

export const setDate = (date:any) => {
    return date ? dayjs(date) : '';
};

export const dateDisplay = (date, format = DEFAULT_DATE_FORMAT) => {
    return date ? dayjs(date).format(format) : '';
};

export const isRegex = (string_) => {
    if (typeof string_ !== 'string') {
        return false;
    }
    return !!(
        /^\/(.+)\/[gimuy]*$/.test(string_) || /^#(.+)#[gimuy]*$/.test(string_)
    );
};

export const convertToRegex = (string_) => {
    const regParts = string_.match(/^\/(.*?)\/([gim]*)$/);
    return regParts
        ? new RegExp(regParts[1], regParts[2])
        : new RegExp(string_);
};

export const formatTimeString = (date, time, format) => {
    const dt = dayjs(date).format('YYYY/MM/DD');
    const dateTimeString = `${dt} ${time}`;
    return dayjs(dateTimeString).format(format);
};

export const getFilterDate = (startDate, endDate) => {
    const $gt = dayjs(startDate).format('YYYY-MM-DDT00:00:00.000Z');
    const $lt = dayjs(endDate).format('YYYY-MM-DDT23:59:59.000Z');
    return startDate ? { createdAt: { $gt, $lt } } : {};
};


export const isEmptyObject = (obj) => {
    return (
        obj &&
        Object.keys(obj).length === 0 &&
        isObject(obj)
    );
}

export const getDocType = (mimeType) => {
    if (mimeType?.startsWith('image/') || mimeType == 'image') {
        return 'image';
    } else if (mimeType === 'application/pdf' || mimeType == 'pdf') {
        return <PdfIcon height={20} width={20} />;
    } else if (mimeType === 'application/msword' || mimeType == 'doc' || mimeType == 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return <DocsIcon className="fill-[#2B579A]" />;
    } else if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimeType === 'text/csv' || mimeType === 'csv' || mimeType === 'xls' || mimeType === 'xlsx') {
        return <ExcelFileIcon className="fill-[#2B579A]" />;
    } else if (mimeType === 'text/plain' || mimeType == 'txt') {
        return <TxtFileIcon />;
    } else {
        return <CommonFileIcon />;
    }
};

export const filterUniqueByNestedField = (arr, fieldPath) => {
    const keys = fieldPath.split('.');

    return arr.filter((item, index, self) => {
        const key = keys.reduce((obj, key) => (obj && obj[key]) ? obj[key] : undefined, item);
        const uniqueKey = key;

        return index === self.findIndex(obj => {
            const compareKey = keys.reduce((obj, key) => (obj && obj[key]) ? obj[key] : undefined, obj);
            const compareUniqueKey = compareKey;

            return uniqueKey === compareUniqueKey;
        });
    });
}

export const updateObjectInExistingArray = (array, updatedObject) => {
    if (!Array.isArray(array)) {
        console.error('Provided data is not an array');
        return array;
    }
    return array.map(obj => obj._id === updatedObject._id ? updatedObject : obj);
}

export const removeObjectFromArray = (array, idToRemove) => {
    if (!Array.isArray(array)) {
        console.error('Provided data is not an array');
        return array;
    }
    return array.filter(obj => obj._id !== idToRemove);
}

export const getTimeAgo = (targetDate) => {
    const currentDate = moment();
    const duration = moment.duration(currentDate.diff(targetDate));
    const seconds = duration.asSeconds();
    const minutes = duration.asMinutes();
    const hours = duration.asHours();
    const days = duration.asDays();

    if (seconds < 10) {
        return `few seconds ago`;
    } else if (seconds < 60) {
        return `${Math.floor(seconds)} seconds ago`;
    } else if (minutes < 60) {
        return `${Math.floor(minutes)} minutes ago`;
    } else if (hours < 24) {
        return `${Math.floor(hours)} hours ago`;
    } else {
        return `${Math.floor(days)} days ago`;
    }
}

export const bytesToMegabytes = (bytes) => {
    const megabytes = bytes / (1024 * 1024);
    return megabytes < 0 ? 0 : Math.round(megabytes);
};

export const megabytesToBytes = (megabytes) => {
    return megabytes * (1024 * 1024);
};

export const formatDate = (dateString) => {
    const date = new Date(dateString);

    const options:any = { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
    const dateTimeString = date.toLocaleString('en-US', options);

    const [monthDay, time] = dateTimeString.split(', ');
    const [month, day] = monthDay.split(' ');

    let daySuffix;
    if (day.endsWith('1') && day !== '11') {
        daySuffix = 'st';
    } else if (day.endsWith('2') && day !== '12') {
        daySuffix = 'nd';
    } else if (day.endsWith('3') && day !== '13') {
        daySuffix = 'rd';
    } else {
        daySuffix = 'th';
    }

    return `${month} ${day}${daySuffix} at ${time}`;
}

export const getCurrentTypingMention = (text, cursorPosition) => {
    const textUpToCursor = text.slice(0, cursorPosition);
    
    const mentionRegex = /@([^\s@]*)/g; 
    let match;
    let lastMention = '';

    while ((match = mentionRegex.exec(textUpToCursor)) !== null) {
        const mentionStart = match.index;
        const mentionEnd = mentionStart + match[0].length;
        
        // Check if the cursor is within the mention
        if (cursorPosition > mentionStart && cursorPosition <= mentionEnd) {
            lastMention = '@'+match[1]; // Capture the mention text without '@'
        }         
    }

    return lastMention;
};


export const filterUsersByKeyword = (records, substr) => {
    const substring = substr.replaceAll('@', '');
    
    return records.filter(item => {
        const fname = item.user.fname ? item.user.fname?.toLowerCase() : '';
        const lname = item.user.lname ? item.user.lname?.toLowerCase() : '';
        const searchString = substring?.toLowerCase();
        
        return fname.startsWith(searchString) || lname.startsWith(searchString);
    });
};

export const getWordAtCursor = (text, position) => {
    const left = text.slice(0, position).search(/\S+$/);
    const right = text.slice(position).search(/\s/);
    if (right === -1) {
        return text.slice(left);
    }
    return text.slice(left, right + position);
};

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);            
    } catch (err) {            
        console.error(err,'Failed to copy!');
    }
};

export const displayName = (user) => {
    return user?.fname && user?.lname 
      ? `${user?.fname} ${user?.lname}` 
      : user?.email;
};
 

export const truncateText=(text,maxLength)=>{
    try {

      return  text?.length>=maxLength ? text?.substring(0,maxLength)+"...":text
        
    } catch (error) {
        console.error("Error in the truncate text in bot ::: ",error)
    }
}

export const getModelImageByCode = (modelCode: string, responseModel = false) => { 
    try {     
        if(responseModel){
            const modelNameToCode = getCodeByModel(modelCode);
            return modelNameToCode ? MODEL_IMAGE_BY_CODE?.[modelNameToCode] : "/Ai-icon.svg";  
        }
        return MODEL_IMAGE_BY_CODE?.[modelCode] || "/Ai-icon.svg";  
    } catch (error) {
        console.error("Error in the getModelImageByCode ::: ",error);
    }
}


export const createHandleOutsideClick = (
    inputRef:any,
    buttonRef:any,
    setIsEditing:any,
    setEditedTitles:any= false, //use for the chat title due to map on chat title
    setEditedTitle:any=false, //use for if user change title but click outside to set the actual title
    actualTitle:any=false, //before saved actual title
) => {
    try {
        return (event) => {
            if (
                inputRef.current &&
                !inputRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)
            ) {
                setIsEditing(false);
                setEditedTitles && setEditedTitles(false);
                setEditedTitle && actualTitle && setEditedTitle(actualTitle)
            }
        };
    } catch (error) {
        console.error('Error in handle click outside ::: ', error);
    }
};

export const showNameOrEmail=(user)=>{
    try {
        return (user?.fname && user?.lname )? `${user?.fname} ${user?.lname}`:user?.email
        
    } catch (error) {
        console.error("Error in showNameOrEmail ::: ",error)
    }
}

export const timestampToDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
};

export const showPrice = (amount:any) => {
    return (amount / 100).toFixed(2);
};

export const showCurrencySymbol = (countryCode) => {
    switch (countryCode) {
        case 'inr':
            return '₹'; // Indian Rupee
        case 'INR':
            return '₹'; // Indian Rupee
        case 'usd':
            return '$'; // US Dollar
        default:
            return '$'; // Return empty string for unsupported country codes
    }
};

export const getDefaultSlug = (user) => {
    return user?.isPrivateBrainVisible ? `default-brain-${user?._id}` : 'general-brain';
}


export const isCreditLimitExceeded = (msgCreditLimit,msgCreditUsed) => {
   return msgCreditUsed >= msgCreditLimit
}

export const getCodeByModel = (model) => {
    const result = MODEL_CREDIT_INFO.find(entry => entry.model === model);
    return result ? result.code : false;
}

export const modelNameConvert = (code: string, modelName: string) => {
    if(code == AI_MODEL_CODE.DEEPSEEK){
        return modelName.split(':')[0].split('/')?.[1] || modelName;
    }
    if(code == AI_MODEL_CODE.LLAMA4){
        return modelName.split(':')[0].split('/')?.[1] || modelName;
    }
    if(code == AI_MODEL_CODE.QWEN){
        return modelName.split(':')[0].split('/')?.[1] || modelName;
    }
    return modelName;
}

export const priceId = isIndiaByTimezone() ? STRIPE_SUBSCRIPTION_PRICE_ID_IND : STRIPE_SUBSCRIPTION_PRICE_ID;

export const generateDefaultSlug = (user) => {
    return `default-brain-${user?._id}`
}

export const getFileIconClassName = (fileType: string) => {
    const baseClasses = "w-4 h-4 object-contain rounded-custom inline-block me-[9px] fill-black";
    
    if (fileType === 'doc' || fileType === 'docx') {
        return `${baseClasses} fill-[#2B579A]`;
    }
    if (fileType === 'txt') {
        return `${baseClasses} fill-[#333333]`;
    }
    return baseClasses;
};

export const chatHasConversation = (chat) => {
    return chat?.length > 0
}

export const isMessageChatPage = (pathname: string) => {
    return pathname.includes('/chat/')
}

export const getSelectedBrain = (brains: any[], getCurrentUser: any, isDefaultNewChat: boolean = false) => {
    if (!Array.isArray(brains) || brains.length === 0) return null;

    const { _id, isPrivateBrainVisible } = getCurrentUser || {};

    if (isPrivateBrainVisible) {

        if (!isDefaultNewChat) {
            const brainData = retrieveBrainData();
            if (brainData) return brainData;
        }

        const privateBrain = brains.find(
            brain => brain.slug === `${DEFAULT_CHAT_SLUG}${_id}`
        );
        if (privateBrain) return privateBrain;
    }

    return (
        brains.find(brain => brain.title === GENERAL_BRAIN_TITLE) ||
        brains[0]
    );
};

// Simple debounce utility function
export const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
};
// Default character images - you can replace these with actual character images later
export const DEFAULT_CHARACTERS_BRAIN = {
    '☁️ Soft': [
        { id: 'soft-1', image: '/brain-characters/soft-1.svg' },
        { id: 'soft-2', image: '/brain-characters/soft-2.svg' },
        { id: 'soft-3', image: '/brain-characters/soft-3.svg' },
        { id: 'soft-4', image: '/brain-characters/soft-4.svg' },
        { id: 'soft-5', image: '/brain-characters/soft-5.svg' },
        { id: 'soft-6', image: '/brain-characters/soft-6.svg' },
        { id: 'soft-7', image: '/brain-characters/soft-7.svg' },
        { id: 'soft-8', image: '/brain-characters/soft-8.svg' },
        { id: 'soft-9', image: '/brain-characters/soft-9.svg' },
        { id: 'soft-10', image: '/brain-characters/soft-10.svg' },
        { id: 'soft-11', image: '/brain-characters/soft-11.svg' },
        { id: 'soft-12', image: '/brain-characters/soft-12.svg' },
        { id: 'soft-13', image: '/brain-characters/soft-13.svg' },
        { id: 'soft-14', image: '/brain-characters/soft-14.svg' },
        { id: 'soft-15', image: '/brain-characters/soft-15.svg' },
        { id: 'soft-16', image: '/brain-characters/soft-16.svg' },
        { id: 'soft-17', image: '/brain-characters/soft-17.svg' },
        { id: 'soft-18', image: '/brain-characters/soft-18.svg' },
    ],
    '🌿 Nature': [
        { id: 'nature-1', image: '/brain-characters/nature-1.svg' },
        { id: 'nature-2', image: '/brain-characters/nature-2.svg' },
        { id: 'nature-3', image: '/brain-characters/nature-3.svg' },
        { id: 'nature-4', image: '/brain-characters/nature-4.svg' },
        { id: 'nature-5', image: '/brain-characters/nature-5.svg' },
        { id: 'nature-6', image: '/brain-characters/nature-6.svg' },
        { id: 'nature-7', image: '/brain-characters/nature-7.svg' },
        { id: 'nature-8', image: '/brain-characters/nature-8.svg' },
        { id: 'nature-9', image: '/brain-characters/nature-9.svg' },
    ],
    '🎨 Vibrant': [
        { id: 'vibrant-1', image: '/brain-characters/vibrant-1.svg' },
        { id: 'vibrant-2', image: '/brain-characters/vibrant-2.svg' },
        { id: 'vibrant-3', image: '/brain-characters/vibrant-3.svg' },
        { id: 'vibrant-4', image: '/brain-characters/vibrant-4.svg' },
        { id: 'vibrant-5', image: '/brain-characters/vibrant-5.svg' },
        { id: 'vibrant-6', image: '/brain-characters/vibrant-6.svg' },
    ],
    '❄️ Cool': [
        { id: 'cool-1', image: '/brain-characters/cool-1.svg' },
        { id: 'cool-2', image: '/brain-characters/cool-2.svg' },
        { id: 'cool-3', image: '/brain-characters/cool-3.svg' },
        { id: 'cool-4', image: '/brain-characters/cool-4.svg' },
        { id: 'cool-5', image: '/brain-characters/cool-5.svg' },
        { id: 'cool-6', image: '/brain-characters/cool-6.svg' },
        { id: 'cool-7', image: '/brain-characters/cool-7.svg' },
        { id: 'cool-8', image: '/brain-characters/cool-8.svg' },
        { id: 'cool-9', image: '/brain-characters/cool-9.svg' },
        { id: 'cool-10', image: '/brain-characters/cool-10.svg' },
        { id: 'cool-11', image: '/brain-characters/cool-11.svg' },
        { id: 'cool-12', image: '/brain-characters/cool-12.svg' },
        { id: 'cool-13', image: '/brain-characters/cool-13.svg' },
        { id: 'cool-14', image: '/brain-characters/cool-14.svg' },
        { id: 'cool-15', image: '/brain-characters/cool-15.svg' },
        { id: 'cool-16', image: '/brain-characters/cool-16.svg' },
        { id: 'cool-17', image: '/brain-characters/cool-17.svg' },
    ],
    '⛰️ Earth': [
        { id: 'earth-1', image: '/brain-characters/earth-1.svg' },
        { id: 'earth-2', image: '/brain-characters/earth-2.svg' },
        { id: 'earth-3', image: '/brain-characters/earth-3.svg' },
        { id: 'earth-4', image: '/brain-characters/earth-4.svg' },
        { id: 'earth-5', image: '/brain-characters/earth-5.svg' },
        { id: 'earth-6', image: '/brain-characters/earth-6.svg' },
        { id: 'earth-7', image: '/brain-characters/earth-7.svg' },
        { id: 'earth-8', image: '/brain-characters/earth-8.svg' },
        { id: 'earth-9', image: '/brain-characters/earth-9.svg' },
        { id: 'earth-10', image: '/brain-characters/earth-10.svg' },
        { id: 'earth-11', image: '/brain-characters/earth-11.svg' },
        { id: 'earth-12', image: '/brain-characters/earth-12.svg' },
        { id: 'earth-13', image: '/brain-characters/earth-13.svg' },
        { id: 'earth-14', image: '/brain-characters/earth-14.svg' },
        { id: 'earth-15', image: '/brain-characters/earth-15.svg' },
        { id: 'earth-16', image: '/brain-characters/earth-16.svg' },
        { id: 'earth-17', image: '/brain-characters/earth-17.svg' },
    ],
    '⚡ Electric': [   
        { id: 'electric-1', image: '/brain-characters/electric-1.svg' },
        { id: 'electric-2', image: '/brain-characters/electric-2.svg' },
        { id: 'electric-3', image: '/brain-characters/electric-3.svg' },
        { id: 'electric-4', image: '/brain-characters/electric-4.svg' },
        { id: 'electric-5', image: '/brain-characters/electric-5.svg' },
        { id: 'electric-6', image: '/brain-characters/electric-6.svg' },
        { id: 'electric-7', image: '/brain-characters/electric-7.svg' },
        { id: 'electric-8', image: '/brain-characters/electric-8.svg' },
        { id: 'electric-9', image: '/brain-characters/electric-9.svg' },
        { id: 'electric-10', image: '/brain-characters/electric-10.svg' },
        { id: 'electric-11', image: '/brain-characters/electric-11.svg' },
        { id: 'electric-12', image: '/brain-characters/electric-12.svg' },
        { id: 'electric-13', image: '/brain-characters/electric-13.svg' },
        { id: 'electric-14', image: '/brain-characters/electric-14.svg' },
        { id: 'electric-15', image: '/brain-characters/electric-15.svg' },
        { id: 'electric-16', image: '/brain-characters/electric-16.svg' },
        { id: 'electric-17', image: '/brain-characters/electric-17.svg' },
        { id: 'electric-18', image: '/brain-characters/electric-18.svg' },
    ],
    '🔥 Warm': [   
        { id: 'warm-1', image: '/brain-characters/warm-1.svg' },
        { id: 'warm-2', image: '/brain-characters/warm-2.svg' },
        { id: 'warm-3', image: '/brain-characters/warm-3.svg' },
        { id: 'warm-4', image: '/brain-characters/warm-4.svg' },
        { id: 'warm-5', image: '/brain-characters/warm-5.svg' },
        { id: 'warm-6', image: '/brain-characters/warm-6.svg' },
    ],
    '🌊 Aqua': [   
        { id: 'aqua-1', image: '/brain-characters/aqua-1.svg' },
        { id: 'aqua-2', image: '/brain-characters/aqua-2.svg' },
        { id: 'aqua-3', image: '/brain-characters/aqua-3.svg' },
        { id: 'aqua-4', image: '/brain-characters/aqua-4.svg' },
        { id: 'aqua-5', image: '/brain-characters/aqua-5.svg' },
        { id: 'aqua-6', image: '/brain-characters/aqua-6.svg' },
        { id: 'aqua-7', image: '/brain-characters/aqua-7.svg' },
    ],
    
};

export const DEFAULT_CHARACTERS_SOLUTION_APP =[
            '/solution-characters/soft-1.svg',
            '/solution-characters/soft-2.svg',
            '/solution-characters/soft-3.svg',
            '/solution-characters/soft-4.svg',
            '/solution-characters/soft-5.svg',
            '/solution-characters/soft-6.svg',
            '/solution-characters/soft-7.svg',
            '/solution-characters/soft-8.svg',
            '/solution-characters/soft-9.svg',
            '/solution-characters/soft-10.svg',
            '/solution-characters/soft-11.svg',
            '/solution-characters/soft-12.svg',
            '/solution-characters/soft-13.svg',
            '/solution-characters/soft-14.svg',
            '/solution-characters/soft-15.svg',
            '/solution-characters/soft-16.svg',
            '/solution-characters/soft-17.svg',
            '/solution-characters/soft-18.svg',
          
            '/solution-characters/nature-1.svg',
            '/solution-characters/nature-2.svg',
            '/solution-characters/nature-3.svg',
            '/solution-characters/nature-4.svg',
            '/solution-characters/nature-5.svg',
            '/solution-characters/nature-6.svg',
            '/solution-characters/nature-7.svg',
            '/solution-characters/nature-8.svg',
            '/solution-characters/nature-9.svg',
            '/solution-characters/nature-10.svg',
          
            '/solution-characters/vibrant-1.svg',
            '/solution-characters/vibrant-2.svg',
            '/solution-characters/vibrant-3.svg',
            '/solution-characters/vibrant-4.svg',
            '/solution-characters/vibrant-5.svg',
            '/solution-characters/vibrant-6.svg',
          
            '/solution-characters/cool-1.svg',
            '/solution-characters/cool-2.svg',
            '/solution-characters/cool-3.svg',
            '/solution-characters/cool-4.svg',
            '/solution-characters/cool-5.svg',
            '/solution-characters/cool-6.svg',
            '/solution-characters/cool-7.svg',
            '/solution-characters/cool-8.svg',
            '/solution-characters/cool-9.svg',
            '/solution-characters/cool-10.svg',
            '/solution-characters/cool-11.svg',
            '/solution-characters/cool-12.svg',
            '/solution-characters/cool-13.svg',
            '/solution-characters/cool-14.svg',
            '/solution-characters/cool-15.svg',
            '/solution-characters/cool-16.svg',
            '/solution-characters/cool-17.svg',
          
            '/solution-characters/earth-1.svg',
            '/solution-characters/earth-2.svg',
            '/solution-characters/earth-3.svg',
            '/solution-characters/earth-4.svg',
            '/solution-characters/earth-5.svg',
            '/solution-characters/earth-6.svg',
            '/solution-characters/earth-7.svg',
            '/solution-characters/earth-8.svg',
            '/solution-characters/earth-9.svg',
            '/solution-characters/earth-10.svg',
            '/solution-characters/earth-11.svg',
            '/solution-characters/earth-12.svg',
            '/solution-characters/earth-13.svg',
            '/solution-characters/earth-14.svg',
            '/solution-characters/earth-15.svg',
            '/solution-characters/earth-16.svg',
            '/solution-characters/earth-17.svg',
          
            '/solution-characters/electric-1.svg',
            '/solution-characters/electric-2.svg',
            '/solution-characters/electric-3.svg',
            '/solution-characters/electric-4.svg',
            '/solution-characters/electric-5.svg',
            '/solution-characters/electric-6.svg',
            '/solution-characters/electric-7.svg',
            '/solution-characters/electric-8.svg',
            '/solution-characters/electric-9.svg',
            '/solution-characters/electric-10.svg',
            '/solution-characters/electric-11.svg',
            '/solution-characters/electric-12.svg',
            '/solution-characters/electric-13.svg',
            '/solution-characters/electric-14.svg',
            '/solution-characters/electric-15.svg',
            '/solution-characters/electric-16.svg',
            '/solution-characters/electric-17.svg',
            '/solution-characters/electric-18.svg',
          
            '/solution-characters/warm-1.svg',
            '/solution-characters/warm-2.svg',
            '/solution-characters/warm-3.svg',
            '/solution-characters/warm-4.svg',
            '/solution-characters/warm-5.svg',
            '/solution-characters/warm-6.svg',
          
            '/solution-characters/aqua-1.svg',
            '/solution-characters/aqua-2.svg',
            '/solution-characters/aqua-3.svg',
            '/solution-characters/aqua-4.svg',
            '/solution-characters/aqua-5.svg',
            '/solution-characters/aqua-6.svg',
            '/solution-characters/aqua-7.svg'
];

export const getRandomCharacterAgent = () => {
    const allCharacters: Array<{id: string, image: string}> = [];
    
    // Flatten all characters from all categories into a single array
    Object.values(DEFAULT_CHARACTERS).forEach(category => {
        allCharacters.push(...category);
    });
    
    // Return a random character
    const randomIndex = Math.floor(Math.random() * allCharacters.length);
    return allCharacters[randomIndex];
};

 // Function to get a random character from all tabs
 export const getRandomCharacter = () => {
    const allCharacters: Array<{id: string, image: string}> = [];
    
    // Flatten all characters from all categories into a single array
    Object.values(DEFAULT_CHARACTERS_BRAIN).forEach(category => {
        allCharacters.push(...category);
    });
    
    // Return a random character
    const randomIndex = Math.floor(Math.random() * allCharacters.length);
    return allCharacters[randomIndex];
};
