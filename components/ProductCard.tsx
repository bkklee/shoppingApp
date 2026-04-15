import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Product } from '../services/api';

interface ProductCardProps {
  product: Product;
}

const SUPERMARKET_NAMES: Record<string, string> = {
  'WELLCOME': '惠康',
  'PARKNSHOP': '百佳',
  'JASONS': 'Market Place by Jasons',
  'WATSONS': '屈臣氏',
  'AEON': 'AEON',
  'DCHFOOD': '大昌食品',
};

const calculateJetsoPrice = (quantity: number, basePrice: number, offerText?: string): number => {
  if (!offerText || quantity <= 0) return basePrice * quantity;
  
  const text = offerText.toLowerCase();
  const subOffers = text.split('/').map(s => s.trim());
  
  let bestTotalPrice = basePrice * quantity;

  for (const subOffer of subOffers) {
    let currentOfferPrice = basePrice * quantity;

    // Pattern 1: X for $Y or Buy X at $Y or Buy X item(s) for $Y
    const forMatch = subOffer.match(/(?:buy\s+)?(\d+)(?:\s+item\(s\))?\s+(?:for|at)\s+\$?(\d+(?:\.\d+)?)/);
    if (forMatch) {
      const x = parseInt(forMatch[1], 10);
      const y = parseFloat(forMatch[2]);
      if (x > 0) {
        const times = Math.floor(quantity / x);
        const remainder = quantity % x;
        currentOfferPrice = (times * y) + (remainder * basePrice);
      }
    }
    // Pattern 2: Buy X to save $Y
    else if (subOffer.match(/buy\s+(\d+)\s+to\s+save\s+\$?(\d+(?:\.\d+)?)/)) {
      const saveMatch = subOffer.match(/buy\s+(\d+)\s+to\s+save\s+\$?(\d+(?:\.\d+)?)/);
      if (saveMatch) {
        const x = parseInt(saveMatch[1], 10);
        const y = parseFloat(saveMatch[2]);
        if (x > 0) {
          const times = Math.floor(quantity / x);
          currentOfferPrice = (quantity * basePrice) - (times * y);
        }
      }
    }
    // Pattern 3: Buy X get Y Free
    else if (subOffer.match(/(?:buy|add)\s+(\d+)(?:\s+item\(s\)?(?:\s+to\s+cart\s+and)?)?\s+get\s+(\d+)\s+free/)) {
      const freeMatch = subOffer.match(/(?:buy|add)\s+(\d+)(?:\s+item\(s\)?(?:\s+to\s+cart\s+and)?)?\s+get\s+(\d+)\s+free/);
      if (freeMatch) {
        const x = parseInt(freeMatch[1], 10);
        const y = parseInt(freeMatch[2], 10);
        if (x > 0 && y > 0) {
          const groupSize = x + y;
          const groups = Math.floor(quantity / groupSize);
          const remainder = quantity % groupSize;
          const paidItems = (groups * x) + Math.min(remainder, x);
          currentOfferPrice = paidItems * basePrice;
        }
      }
    }
    // Pattern 4: 2nd 50% off
    else if (subOffer.includes('2nd 50% off') || subOffer.includes('50% for 2nd') || subOffer.includes('2nd item for 50% off')) {
      const groups = Math.floor(quantity / 2);
      const remainder = quantity % 2;
      currentOfferPrice = (groups * 1.5 * basePrice) + (remainder * basePrice);
    }
    // Pattern 5: Buy X to get Y% off / X or more Y% off
    else {
      const percentMatch = subOffer.match(/(?:buy\s+(\d+)\s+to\s+get\s+)?(\d+(?:\.\d+)?)\s*%?\s*off/);
      if (percentMatch) {
        const threshold = percentMatch[1] ? parseInt(percentMatch[1], 10) : 1;
        const discount = parseFloat(percentMatch[2]);
        if (quantity >= threshold && discount > 0 && discount <= 100) {
          currentOfferPrice = (basePrice * quantity) * (1 - (discount / 100));
        }
      }
    }

    if (currentOfferPrice < bestTotalPrice) {
      bestTotalPrice = currentOfferPrice;
    }
  }

  return bestTotalPrice;
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [quantity, setQuantity] = useState(1);

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    setQuantity(quantity + 1);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.brand}>{product.brand?.['zh-Hant'] || product.brand?.en}</Text>
      <Text style={styles.name}>{product.name?.['zh-Hant'] || product.name?.en}</Text>
      
      <View style={styles.quantityContainer}>
        <Text style={styles.quantityLabel}>購買數量 (件):</Text>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={handleDecrease} style={styles.stepperButton}>
            <Text style={styles.stepperButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantityValue}>{quantity}</Text>
          <TouchableOpacity onPress={handleIncrease} style={styles.stepperButton}>
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.pricesContainer}>
        {product.prices?.map((price, index) => {
          const offer = product.offers?.find(o => o.supermarketCode === price.supermarketCode);
          const basePrice = parseFloat(price.price);
          const totalPrice = calculateJetsoPrice(quantity, basePrice, offer?.en);
          const averagePrice = totalPrice / quantity;
          const hasDiscount = totalPrice < (basePrice * quantity);

          return (
            <View key={`${price.supermarketCode}-${index}`} style={styles.priceRow}>
              <View style={styles.supermarketInfo}>
                <Text style={styles.supermarket}>{SUPERMARKET_NAMES[price.supermarketCode] || price.supermarketCode}</Text>
                {quantity === 1 && (
                  <Text style={styles.basePriceText}>${basePrice.toFixed(2)} / 件</Text>
                )}
                {quantity > 1 && (
                  <Text style={styles.averagePriceText}>
                    平均: <Text style={hasDiscount ? styles.discountText : {}}>${averagePrice.toFixed(2)}</Text> / 件
                  </Text>
                )}
              </View>
              <View style={styles.totalPriceInfo}>
                <Text style={styles.price}>總計: ${totalPrice.toFixed(2)}</Text>
                {hasDiscount && (
                   <Text style={styles.originalPriceStrikethrough}>
                     ${(basePrice * quantity).toFixed(2)}
                   </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {product.offers && product.offers.length > 0 && (
        <View style={styles.offersContainer}>
          <Text style={styles.offersTitle}>優惠情報</Text>
          {product.offers.map((offer, index) => (
            <View key={`offer-${offer.supermarketCode}-${index}`} style={styles.offerRow}>
              <Text style={styles.offerSupermarket}>{SUPERMARKET_NAMES[offer.supermarketCode] || offer.supermarketCode}</Text>
              <Text style={styles.offerText}>{offer['zh-Hant'] || offer.en}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  brand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stepperButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityValue: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pricesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  supermarketInfo: {
    flexDirection: 'column',
    flex: 1,
  },
  supermarket: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  basePriceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  averagePriceText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  discountText: {
    color: '#e91e63',
    fontWeight: 'bold',
  },
  totalPriceInfo: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#e91e63',
  },
  originalPriceStrikethrough: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  offersContainer: {
    backgroundColor: '#fffdf0',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  offersTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#d84315',
    marginBottom: 6,
  },
  offerRow: {
    flexDirection: 'column',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffe0b2',
  },
  offerSupermarket: {
    fontSize: 12,
    color: '#555',
    fontWeight: 'bold',
  },
  offerText: {
    fontSize: 12,
    color: '#e65100',
    marginTop: 2,
  },
});