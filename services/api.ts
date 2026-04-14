import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalizedString {
  en?: string;
  "zh-Hant"?: string;
  "zh-Hans"?: string;
}

export interface Price {
  supermarketCode: string;
  price: string;
}

export interface Offer {
  supermarketCode: string;
  en?: string;
  "zh-Hant"?: string;
  "zh-Hans"?: string;
}

export interface Product {
  code: string;
  brand: LocalizedString;
  name: LocalizedString;
  cat1Name: LocalizedString;
  cat2Name: LocalizedString;
  cat3Name: LocalizedString;
  prices: Price[];
  offers: Offer[];
}

const API_URL = 'https://res.data.gov.hk/api/get-download-file?name=https%3A%2F%2Fonline-price-watch.consumer.org.hk%2Fopw%2Fopendata%2Fpricewatch.json';
const CACHE_FILE_URI = FileSystem.documentDirectory + 'pricewatch_data.json';
const CACHE_TIMESTAMP_KEY = 'PRICEWATCH_TIMESTAMP_CACHE';
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export const fetchPriceWatchData = async (
  onProgress?: (downloadedBytes: number, totalBytesExpected: number) => void
): Promise<Product[]> => {
  try {
    const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);
    const fileInfo = await FileSystem.getInfoAsync(CACHE_FILE_URI);

    if (cachedTimestamp && fileInfo.exists) {
      const now = Date.now();
      const timestamp = parseInt(cachedTimestamp, 10);
      
      // If the cache is valid (less than 1 hour old), return it immediately
      if (now - timestamp < CACHE_EXPIRATION_MS) {
        console.log('Loading data from local file cache...');
        const cachedData = await FileSystem.readAsStringAsync(CACHE_FILE_URI);
        return JSON.parse(cachedData);
      }
    }

    // Cache expired or doesn't exist, fetch fresh data to file
    console.log('Fetching fresh data from API...');
    
    const downloadResumable = FileSystem.createDownloadResumable(
      API_URL,
      CACHE_FILE_URI,
      {},
      (downloadProgress) => {
        const { totalBytesWritten, totalBytesExpectedToWrite } = downloadProgress;
        if (onProgress) {
          onProgress(totalBytesWritten, totalBytesExpectedToWrite);
        }
      }
    );

    const result = await downloadResumable.downloadAsync();
    if (!result || result.status !== 200) {
      throw new Error(`HTTP error! status: ${result?.status}`);
    }

    // Update the timestamp to mark fresh cache
    await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());

    // Read from the newly downloaded file and return JSON
    const dataString = await FileSystem.readAsStringAsync(CACHE_FILE_URI);
    return JSON.parse(dataString);
  } catch (error) {
    console.error("Failed to fetch price watch data:", error);
    
    // Fallback: If network fails, try to return stale cache file if it exists
    const fileInfo = await FileSystem.getInfoAsync(CACHE_FILE_URI);
    if (fileInfo.exists) {
      console.log('Network failed, returning stale cached file data...');
      const staleData = await FileSystem.readAsStringAsync(CACHE_FILE_URI);
      return JSON.parse(staleData);
    }
    
    throw error;
  }
};