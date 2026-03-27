import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bill } from './types';

class CacheManager {
  private static instance: CacheManager;
  private readonly BILLS_CACHE_KEY = '@cached_bills';

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Save bills to AsyncStorage
   * @param bills List of bills to cache
   */
  public async saveBills(bills: Bill[]): Promise<void> {
    try {
      const jsonValue = JSON.stringify(bills);
      await AsyncStorage.setItem(this.BILLS_CACHE_KEY, jsonValue);
      console.log(`[CacheManager] Saved ${bills.length} bills to cache.`);
    } catch (e) {
      console.error('[CacheManager] Error saving bills to cache:', e);
    }
  }

  /**
   * Get cached bills from AsyncStorage
   * @returns Promise resolving to the list of cached bills
   */
  public async getCachedBills(): Promise<Bill[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(this.BILLS_CACHE_KEY);
      if (jsonValue != null) {
        const bills = JSON.parse(jsonValue) as Bill[];
        console.log(`[CacheManager] Retrieved ${bills.length} bills from cache.`);
        return bills;
      }
      return [];
    } catch (e) {
      console.error('[CacheManager] Error retrieving bills from cache:', e);
      return [];
    }
  }

  /**
   * Clear all cached data
   */
  public async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.BILLS_CACHE_KEY);
      console.log('[CacheManager] Cache cleared.');
    } catch (e) {
      console.error('[CacheManager] Error clearing cache:', e);
    }
  }
}

export const cacheManager = CacheManager.getInstance();
