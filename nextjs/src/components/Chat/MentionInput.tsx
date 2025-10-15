import React, { useState } from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import Close from '@/icons/Close';

const customStyle = {
  control: {
    backgroundColor: '#fff',
    fontSize: 16,
    fontWeight: 'normal',
    borderRadius: 8,
  },
  '&multiLine': {
    control: {
      height: 100,
      overflowY: 'auto',
    },
    highlighter: {
      padding: 13,
      height: '100%',
    },
    input: {
      padding: 15,
      borderRadius: '8px',
      outline: 'none',
      overflowY: 'auto',
      '&focus-visible': {
        outline: 'none',
      },
    },
  },
  suggestions: {
    list: {
      backgroundColor: 'white',
      boxShadow: '0 0 5px #999999',
      fontSize: 14,
      maxHeight: '120px',
      overflowY: 'auto',
      position: 'absolute',
      left: 0,
      right: 0,
      width: '100%',
      minWidth: 'fit-content',
      maxWidth: '100vw',
      zIndex: 1000,
      borderRadius: '4px',
    },
    item: {
      padding: '5px 15px',
      borderBottom: '1px solid rgba(0,0,0,0.15)',
      '&focused': {
        backgroundColor: '#6637EC',
        color: '#FFFFFF',
      },
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      maxWidth: '100%',
    },
  },
};

const MentionInput = ({ users, setContent, content, onTyping, handleSubmit }) => {
  const filteredUsers = users.reduce((acc, item) => { 
       
      
    if(item) {
      const display = item?.fname && item?.lname 
      ? `@${item?.fname} ${item?.lname}`
      : `@${item?.email || ''}`;
  const id = item?.id;


        acc.push({  
          ...item,
            display,  
            id        
        });
    }
    return acc
},[]);  
  
    // const [value, setValue] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const handleChange = (event, newValue) => {
        // setValue(newValue);
        setContent(newValue);
        onTyping();
    };

    const renderUserSuggestion = (suggestion, search, highlightedDisplay) => (
        <div className="user-suggestion">
            {highlightedDisplay}
        </div>
    );

    return (
        <div className='relative'>
            <MentionsInput
                value={content}
                onChange={handleChange} 
                style={customStyle}
                placeholder={"Reply and Mention people using '@'"}
                allowSuggestionsAboveCursor={true}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && content.trim() !== '') {
                      handleSubmit(e);
                      e.preventDefault();
                  }
              }}
            >
                <Mention
                    trigger="@"
                    data={filteredUsers}
                    style={{ backgroundColor: '#fff' }}
                    renderSuggestion={renderUserSuggestion}
                    appendSpaceOnAdd={true}
                    
                    className="text-b2 font-bold relative z-[1] rounded-custom"
                />
            </MentionsInput>

            {/* <button onClick={toggleEmojiPicker} className="emoji-button">
                😊
            </button> */}

            {showEmojiPicker && (
                <div className='fixed z-[2] bottom-24'>
                    <div onClick={() => setShowEmojiPicker(false)} className='cursor-pointer'>
                     <Close className={"size-3 fill-black absolute right-1 top-1 z-10"}  />
                    </div>
                    {/* <EmojiPicker emojiStyle='google' onEmojiClick={(event, emojiObject) => onEmojiClick(emojiObject)} /> */}
                </div>
            )}
        </div>
    );
};

export default MentionInput;
