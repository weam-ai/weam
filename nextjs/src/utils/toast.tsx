import toast from 'react-hot-toast';

type ToastType = 'success' | 'error' | 'custom';

const Toast = (message: string, type: ToastType = 'success', config = {}) => {
    toast[type](message, {
        duration: 2000,
        position: 'top-right',
        style: { borderRadius: '8px', minWidth: '250px' },
        className: '',
        ...config,
    });
}

export const NotificationToast = (payload, notificationData) => {

    return toast.custom(
        (t) => (
            <button
                type="button"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Space') {
                        if (notificationData?.deepLink) {
                            window.location.href = notificationData.deepLink;
                        }
                        toast.dismiss(t.id);
                    }
                }}
                onClick={() => {
                    if (notificationData?.deepLink) {
                        window.location.href = notificationData.deepLink;
                    }
                    toast.dismiss(t.id);
                }}
                className={`${
                    t.visible ? 'animate-enter' : 'animate-leave'
                } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer`}
            >
                <div className="flex-1 w-0 p-4">
                    <div className="flex items-start">
                        <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                                {payload.title}
                            </p>
                            <p className="mt-1 text-font-14 text-gray-500">
                                {payload.body}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex border-l border-gray-200">
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        Close
                    </button>
                </div>
            </button>
        ),
        {
            position: 'top-center',
            duration: 4000,
        }
    );
};

export default Toast