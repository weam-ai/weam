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

const VoiceChat = React.memo(({ setText, text }) => {

    const [seconds, setSeconds] = useState(0);
    const [minutes, setMinutes] = useState(0);
    const [showTimer, setShowTimer] = useState(false);
    const [timerId, setTimerId] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const transcriptRef = useRef(""); // Store speech text manually

    useEffect(() => {
        if (showTimer) {
            const timer = setInterval(() => {
                setSeconds((prevSeconds) => {
                    if (prevSeconds === 59) {
                        setMinutes((prevMinutes) => prevMinutes + 1);
                        return 0;
                    }
                    return prevSeconds + 1;
                });
            }, 1000);
            setTimerId(timer);
            return () => {
                clearInterval(timer); // Clear using the timer value from closure
            };
        }
    }, [showTimer]);

    const formatTime = (time) => (time < 10 ? `0${time}` : time);
   
    // Memoize the startListening function
    const startListening = useCallback(() => {
        if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            alert("Your browser does not support Speech Recognition.");
            return;
        }

        // Add check to prevent starting if already listening
        if (isListening) {
            return;
        }

        if (!recognitionRef.current) {
            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = "";
            recognition.maxSpeechTime = 10000; // (milliseconds)

            recognition.onresult = (event) => {
                let newTranscript = "";
                for (let i = 0; i < event.results.length; i++) {
                    newTranscript += event.results[i][0].transcript + " ";
                }
                transcriptRef.current = newTranscript.trim();
            };

            recognition.onerror = (event) => {
                // Show user-friendly error messages
                const errorMessages = {
                    'no-speech': 'No speech was detected. Please try again.',
                    'audio-capture': 'No microphone was found or microphone is disabled.',
                    'not-allowed': 'Microphone permission was denied.',
                    'network': 'Network error occurred. Please check your connection.',
                    'aborted': 'Speech recognition was aborted.',
                    'service-not-allowed': 'Speech recognition service is not allowed.',
                };
                
                Toast(errorMessages[event.error] || 'An error occurred during speech recognition.', 'error');
                stopListening(); // Stop listening when an error occurs
                //setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        try {
            recognitionRef.current.start();
            setIsListening(true);
            setShowTimer(true);            
        } catch (error) {
            Toast('Error starting speech recognition. Please try again.', 'error');
            setIsListening(false);
        }
    }, [isListening]); // Add isListening to dependencies

    // Memoize the stopListening function
    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            setShowTimer(false);
            setSeconds(0);
            setMinutes(0);
            setTimeout(() => {
                setText((prevText) => prevText + (prevText ? ' ' : '') + transcriptRef.current);
                transcriptRef.current = "";
            }, 500);
        }
    }, [setText]);

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