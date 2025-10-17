import { LocalStorage, CACHED_PROMPTS, CACHED_AGENTS } from './localstorage';
import { encryptedPersist, decryptedPersist } from './helper';

/**
 * Cache structure interface
 */
interface CacheData<T> {
    data: T[];
    timestamp: number;
    expiryHours: number;
}

/**
 * Default cache expiry time in hours
 */
const CACHE_EXPIRY_HOURS = 24;

/**
 * Convert hours to milliseconds
 */
const hoursToMilliseconds = (hours: number): number => hours * 60 * 60 * 1000;

/**
 * Check if cache is still valid based on timestamp
 * @param timestamp - The timestamp when cache was created
 * @param expiryHours - Number of hours before cache expires
 * @returns boolean indicating if cache is still valid
 */
const isCacheValid = (timestamp: number, expiryHours: number = CACHE_EXPIRY_HOURS): boolean => {
    const now = Date.now();
    const expiryTime = timestamp + hoursToMilliseconds(expiryHours);
    return now < expiryTime;
};

/**
 * Get cached prompts from localStorage (encrypted)
 * @returns Cached prompts data or null if cache is invalid/expired
 */
export const getCachedPrompts = <T = any>(): T[] | null => {
    try {
        const parsed: CacheData<T> = decryptedPersist(CACHED_PROMPTS);
        
        if (!parsed) {
            return null;
        }

        // Validate cache structure
        if (!parsed.timestamp || !Array.isArray(parsed.data)) {
            LocalStorage.remove(CACHED_PROMPTS);
            return null;
        }

        // Check if cache is still valid
        if (!isCacheValid(parsed.timestamp, parsed.expiryHours || CACHE_EXPIRY_HOURS)) {
            // Cache expired, remove it
            LocalStorage.remove(CACHED_PROMPTS);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error('Error reading cached prompts:', error);
        // If there's an error, remove corrupted cache
        LocalStorage.remove(CACHED_PROMPTS);
        return null;
    }
};

/**
 * Get cached agents from localStorage (encrypted)
 * @returns Cached agents data or null if cache is invalid/expired
 */
export const getCachedAgents = <T = any>(): T[] | null => {
    try {
        const parsed: CacheData<T> = decryptedPersist(CACHED_AGENTS);
        
        if (!parsed) {
            return null;
        }

        // Validate cache structure
        if (!parsed.timestamp || !Array.isArray(parsed.data)) {
            LocalStorage.remove(CACHED_AGENTS);
            return null;
        }

        // Check if cache is still valid
        if (!isCacheValid(parsed.timestamp, parsed.expiryHours || CACHE_EXPIRY_HOURS)) {
            // Cache expired, remove it
            LocalStorage.remove(CACHED_AGENTS);
            return null;
        }

        return parsed.data;
    } catch (error) {
        console.error('Error reading cached agents:', error);
        // If there's an error, remove corrupted cache
        LocalStorage.remove(CACHED_AGENTS);
        return null;
    }
};

/**
 * Store prompts in cache with timestamp (encrypted)
 * @param data - Array of prompts to cache
 * @param expiryHours - Optional custom expiry time in hours
 */
export const setCachedPrompts = <T = any>(data: T[], expiryHours: number = CACHE_EXPIRY_HOURS): void => {
    try {
        const cacheData: CacheData<T> = {
            data,
            timestamp: Date.now(),
            expiryHours,
        };
        
        encryptedPersist(cacheData, CACHED_PROMPTS);
    } catch (error) {
        console.error('Error setting cached prompts:', error);
    }
};

/**
 * Store agents in cache with timestamp (encrypted)
 * @param data - Array of agents to cache
 * @param expiryHours - Optional custom expiry time in hours
 */
export const setCachedAgents = <T = any>(data: T[], expiryHours: number = CACHE_EXPIRY_HOURS): void => {
    try {
        const cacheData: CacheData<T> = {
            data,
            timestamp: Date.now(),
            expiryHours,
        };
        
        encryptedPersist(cacheData, CACHED_AGENTS);
    } catch (error) {
        console.error('Error setting cached agents:', error);
    }
};

/**
 * Clear expired cache for both prompts and agents
 * Call this on app initialization or periodically
 */
export const clearExpiredCache = (): void => {
    // Check and clear prompts cache if expired
    try {
        const parsed = decryptedPersist(CACHED_PROMPTS);
        if (parsed && parsed.timestamp) {
            if (!isCacheValid(parsed.timestamp, parsed.expiryHours || CACHE_EXPIRY_HOURS)) {
                LocalStorage.remove(CACHED_PROMPTS);
                console.log('Expired prompts cache cleared');
            }
        }
    } catch (error) {
        LocalStorage.remove(CACHED_PROMPTS);
    }

    // Check and clear agents cache if expired
    try {
        const parsed = decryptedPersist(CACHED_AGENTS);
        if (parsed && parsed.timestamp) {
            if (!isCacheValid(parsed.timestamp, parsed.expiryHours || CACHE_EXPIRY_HOURS)) {
                LocalStorage.remove(CACHED_AGENTS);
                console.log('Expired agents cache cleared');
            }
        }
    } catch (error) {
        LocalStorage.remove(CACHED_AGENTS);
    }
};

/**
 * Manually clear all cached data (prompts and agents)
 * Useful for manual cache invalidation or logout
 */
export const clearAllCache = (): void => {
    LocalStorage.remove(CACHED_PROMPTS);
    LocalStorage.remove(CACHED_AGENTS);
    console.log('All prompt and agent cache cleared');
};

/**
 * Get cache info for debugging (decrypts data for inspection)
 * @returns Object with cache status information
 */
export const getCacheInfo = () => {
    const getInfo = (key: string, type: string) => {
        try {
            const parsed = decryptedPersist(key);
            
            if (!parsed) {
                return { type, exists: false, valid: false, itemCount: 0 };
            }
            
            const valid = isCacheValid(parsed.timestamp, parsed.expiryHours || CACHE_EXPIRY_HOURS);
            const ageHours = (Date.now() - parsed.timestamp) / hoursToMilliseconds(1);
            
            return {
                type,
                exists: true,
                valid,
                itemCount: parsed.data?.length || 0,
                ageHours: Math.round(ageHours * 100) / 100,
                expiresInHours: Math.round((parsed.expiryHours - ageHours) * 100) / 100,
            };
        } catch (error) {
            return { type, exists: true, valid: false, error: 'Decrypt/Parse error' };
        }
    };
    
    return {
        prompts: getInfo(CACHED_PROMPTS, 'prompts'),
        agents: getInfo(CACHED_AGENTS, 'agents'),
    };
};
