const GmailIcon = ({ className }) => {
    return (
        <svg
            className={className}
            width="22"
            height="16"
            viewBox="0 0 22 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M2.35036 15.0271H5.53712V7.28788L3.45038 3.64404L0.984619 3.8735V13.6614C0.984619 14.4159 1.5958 15.0271 2.35036 15.0271Z"
                fill="#0085F7"
            />
            <path
                d="M16.4629 15.0271H19.6497C20.4042 15.0271 21.0154 14.4159 21.0154 13.6614V3.8735L18.5532 3.64404L16.4629 7.28788V15.0271H16.4629Z"
                fill="#00A94B"
            />
            <path
                d="M16.4627 1.36941L14.5908 4.94146L16.4627 7.28766L21.0152 3.87328V2.05231C21.0152 0.364464 19.0884 -0.599526 17.7374 0.413406L16.4627 1.36941Z"
                fill="#FFBC00"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.53715 7.28763L3.75342 3.5197L5.53715 1.36938L11.0001 5.46661L16.4631 1.36938V7.28763L11.0001 11.3849L5.53715 7.28763Z"
                fill="#FF4131"
            />
            <path
                d="M0.984619 2.05231V3.87328L5.53712 7.28766V1.36941L4.26242 0.413406C2.91146 -0.599526 0.984619 0.364464 0.984619 2.05231Z"
                fill="#E51C19"
            />
        </svg>
    );
};

export default GmailIcon;
