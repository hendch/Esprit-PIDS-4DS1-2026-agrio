import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CoinToastProps {
  visible: boolean;
  amount: number;
  reason: string;
  onHide: () => void;
}

export function CoinToast({ visible, amount, reason, onHide }: CoinToastProps) {
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;

    // Reset to off-screen before each new show (handles repeated toasts correctly)
    translateY.setValue(-120);
    opacity.setValue(0);

    const slideIn = Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    slideIn.start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => onHide());
    }, 2500);

    return () => {
      clearTimeout(timer);
      slideIn.stop();
    };
  }, [visible]);

  // Always render the Modal — let the modal's visible prop control visibility
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      // statusBarTranslucent keeps the toast above the Android status bar
      statusBarTranslucent={Platform.OS === 'android'}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.container,
            { top: insets.top + 12, transform: [{ translateY }], opacity },
          ]}
        >
          <Text style={styles.emoji}>🪙</Text>
          <View style={styles.textBlock}>
            <Text style={styles.amount}>+{amount} coins</Text>
            <Text style={styles.reason}>{reason}</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    pointerEvents: 'box-none',
  },
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#1B5E20',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
  },
  emoji: {
    fontSize: 28,
  },
  textBlock: {
    flex: 1,
  },
  amount: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 18,
  },
  reason: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
  },
});
