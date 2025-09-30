const ZoomIcon = ({ className }) => {
    return (
        <svg
            className={className}
            width="23"
            height="23"
            viewBox="0 0 23 23"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M11.5 0C5.15 0 0 5.15 0 11.5S5.15 23 11.5 23 23 17.85 23 11.5 17.85 0 11.5 0zm5.75 15.64c0 .92-.75 1.67-1.67 1.67H7.42c-.92 0-1.67-.75-1.67-1.67V7.36c0-.92.75-1.67 1.67-1.67h8.16c.92 0 1.67.75 1.67 1.67v8.28z"
                fill="#2D8CFF"
            />
            <path
                d="M15.58 7.36H7.42v8.28h8.16V7.36z"
                fill="white"
            />
            <path
                d="M13.8 9.2v4.6l2.3-1.15V9.2h-2.3z"
                fill="#2D8CFF"
            />
        </svg>
    );
};

export default ZoomIcon;