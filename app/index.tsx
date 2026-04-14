import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, FlatList, TextInput, ActivityIndicator, SafeAreaView, Platform, StatusBar } from 'react-native';
import { fetchPriceWatchData, Product } from '../services/api';
import { ProductCard } from '../components/ProductCard';

export default function HomeScreen() {
  const [data, setData] = useState<Product[]>([]);
  const [filteredData, setFilteredData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadBytes, setDownloadBytes] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setDownloadProgress(0);
      setDownloadBytes(0);
      
      const fetchedData = await fetchPriceWatchData((written, expected) => {
        setDownloadBytes(written);
        // Fallback to ~2.5MB (2534107 bytes) if the API doesn't return Content-Length
        const total = expected > 0 ? expected : 2534107;
        setDownloadProgress(Math.min(written / total, 1));
      });
      
      setData(fetchedData);
      setFilteredData(fetchedData);
    } catch (e) {
      setError('無法獲取數據。請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredData(data);
      return;
    }

    const lowerCaseQuery = text.toLowerCase();
    const filtered = data.filter((item) => {
      const nameEn = item.name?.en?.toLowerCase() || '';
      const nameZh = item.name?.['zh-Hant'] || '';
      const brandEn = item.brand?.en?.toLowerCase() || '';
      const brandZh = item.brand?.['zh-Hant'] || '';
      return nameEn.includes(lowerCaseQuery) || nameZh.includes(lowerCaseQuery) || brandEn.includes(lowerCaseQuery) || brandZh.includes(lowerCaseQuery);
    });
    setFilteredData(filtered);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e91e63" />
          <Text style={styles.loadingText}>正在獲取最新價格...</Text>
          {downloadProgress > 0 && downloadProgress < 1 && (
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${Math.round(downloadProgress * 100)}%` }]} />
            </View>
          )}
          {downloadBytes > 0 && downloadProgress < 1 && (
             <Text style={styles.progressText}>
               {(downloadBytes / 1024 / 1024).toFixed(2)} MB / ~2.42 MB
             </Text>
          )}
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => <ProductCard product={item} />}
        initialNumToRender={10}
        maxToRenderPerBatch={20}
        windowSize={5}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PriceBite HK ⚡ 格價王</Text>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="搜索產品或品牌..."
            value={searchQuery}
            onChangeText={handleSearch}
            clearButtonMode="while-editing"
            placeholderTextColor="#888"
          />
        </View>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  progressContainer: {
    width: '80%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#e91e63',
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
});