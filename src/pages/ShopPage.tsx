import React, { useState, useEffect } from 'react';
import { SwipeCard } from '../components/SwipeCard';
import { useProducts } from '../hooks/useProducts';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { Product } from '../types/product';

export const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { addLikedProduct, addToCart } = useProducts();

  const fetchMoreProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/get_images`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Received data:', data);
      
      if (data.images && Array.isArray(data.images) && data.images.length > 0) {
        const newProducts = data.images.map((item: any) => {
          console.log('Processing item:', item);
          return {
            id: item.clothing_id.toString(),
            name: item.name,
            price: typeof item.prize === 'string' ? 
              parseFloat(item.prize.replace('£', '')) : 
              item.prize,
            description: item.description || '',
            imageUrl: Array.isArray(item.images) ? item.images[0] : item.images,
            brand: item.name?.split(' ')[0] || 'Unknown',
            size: item.name?.split(' - ')[1] || '',
            condition: item.description?.split('CONDITION: ')[1]?.split('\n')[0] || '',
            externalUrl: item.url || '#'
          };
        });
        
        console.log('Processed products:', newProducts);
        setProducts(prevProducts => [...prevProducts, ...newProducts]);
      } else {
        console.warn('No images in response:', data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch initial products
  useEffect(() => {
    fetchMoreProducts();
  }, []);

  // Fetch more products when running low
  useEffect(() => {
    if (products.length - currentIndex <= 2) {
      fetchMoreProducts();
    }
  }, [currentIndex, products.length]);

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentProduct = products[currentIndex];
    
    try {
      if (direction === 'right') {
        await api.like(currentProduct.id);
        addLikedProduct(currentProduct);
      } else {
        await api.dislike(currentProduct.id);
      }
      
      // Fetch new recommendations immediately after successful swipe
      await fetchMoreProducts();
      setCurrentIndex(0); // Reset index to show new recommendations
      setProducts([]); // Clear existing products
    } catch (error) {
      console.error('Error recording swipe:', error);
    }
  };

  const handleAddToCart = () => {
    addToCart(products[currentIndex]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <div className="container mx-auto max-w-md px-4">
        <AnimatePresence mode="wait">
          {currentIndex < products.length ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
            >
              <SwipeCard
                product={products[currentIndex]}
                onSwipe={handleSwipe}
                onAddToCart={handleAddToCart}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center bg-white p-8 rounded-xl shadow-xl"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                You've seen all items!
              </h2>
              <p className="text-gray-600">
                Check back later for more curated fashion pieces.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};