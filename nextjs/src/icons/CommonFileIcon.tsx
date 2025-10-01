const CommonFileIcon = ({ height, width, className = 'fill-b2' }: any) => {
    return (
        <svg
            className={className}
            width={width}
            height={height}
            viewBox="0 0 320 384"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d="M319.851 144C319.847 139.842 318.372 135.746 315.313 132.687L187.313 4.687C184.254 1.618 180.159 0.128998 176 0.128998V0H80C35.891 0 0 35.891 0 80V304C0 348.109 35.891 384 80 384H240C284.109 384 320 348.109 320 304V144H319.851ZM192 54.625L265.375 128H240C213.531 128 192 106.469 192 80V54.625ZM240 352H80C53.531 352 32 330.469 32 304V80C32 53.531 53.531 32 80 32H160V80C160 124.109 195.891 160 240 160H288V304C288 330.469 266.469 352 240 352Z" />
        </svg>
    );
};
export default CommonFileIcon;
