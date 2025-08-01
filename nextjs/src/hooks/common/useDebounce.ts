import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number):[T] {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);

        return () => clearTimeout(timer);
    }, [value]);

    return [debouncedValue];
}

export default useDebounce;