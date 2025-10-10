import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import VoiceChatIcon from '@/icons/VoiceChatIcon';
import MuteMikeIcon from '@/icons/MuteMikeIcon';
import Toast from '@/utils/toast';

declare global {
    interface Window {
        SpeechRecognition: any;
        webkitSpeechRecognition: any;
    }
}

const VoiceChat = React.memo(({ setText }) => {
   // Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const [showTimer, setShowTimer] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Ref to track if the user manually stopped the recording
  const userManuallyStoppedRef = useRef(false);

  const formatTime = (time) => {
    return time.toString().padStart(2, '0');
  };
  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      
      // Initialize speech recognition
      recognitionRef.current = new SpeechRecognition();
      const recognition = recognitionRef.current;
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.lang = '';
      
      recognition.onstart = () => {
        setIsListening(true);
        console.log('Updated: Speech recognition started');
      };
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscriptText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscriptText += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        setTranscript(interimTranscript);
        if (finalTranscriptText) {
        //   setFinalTranscript(prev => prev + finalTranscriptText + ' ');
          setText(prev => prev + finalTranscriptText + ' ');
        }
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        console.log('Updated: Speech recognition ended');
        if (userManuallyStoppedRef.current) {
          setIsListening(false);
        }
        else {
          // This is an automatic timeout by the browser. Restart it.
          try {
            console.log('Auto-restarting speech recognition...');
            recognition.start();
          } catch (err) {
            console.error('Error on auto-restart:', err);
            setIsListening(false); // Fallback to stop if restart fails
          }
        }
      };
    } else {
      Toast('Speech Recognition not supported in this browser. Try Chrome or Edge.', 'error');
    }

    // Load voices for speech synthesis
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      console.log('Available voices:', availableVoices.length);
    };

    // Load voices immediately and also when they change
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      setShowTimer(true);
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev === 59) {
            setMinutes(prev => prev + 1);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setShowTimer(false);
      setMinutes(0);
      setSeconds(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      userManuallyStoppedRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (err) {
        Toast('Failed to start speech recognition: ' + err.message, 'error');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      userManuallyStoppedRef.current = true;
      recognitionRef.current.stop();
    }
  };

    return (
        <>
            <div className="flex items-center ml-auto">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div
                                onClick={isListening ? stopListening : startListening}
                                className={`transition ease-in-out duration-200 w-auto h-8 flex items-center px-[5px] rounded-md`}
                            >
                                {isListening ? (
                                    <MuteMikeIcon width="14"
                                        height="14"
                                        className="fill-greendark w-auto h-[18px] ml-auto" />
                                ) : (
                                    <VoiceChatIcon width="14" height="14" className="fill-b5 w-auto h-[18px]" />
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-font-14">{isListening ? "Stop Voice Chat" : "Voice Chat"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                {showTimer && (
                    <p className="text-font-12 text-b5 ml-1">{formatTime(minutes)}:{formatTime(seconds)}</p>
                )}
            </div>
        </>
    );
});

export default VoiceChat;