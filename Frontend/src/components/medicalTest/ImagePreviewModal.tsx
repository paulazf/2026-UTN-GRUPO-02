import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { FlatList, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MedicalTestFile } from '../../types/medicalTest';
import ZoomableImage from './ZoomableImage';

interface ImagePreviewModalProps {
  visible: boolean;
  images: MedicalTestFile[]; // imágenes del estudio, para pasar de una a otra deslizando
  initialIndex: number;
  onClose: () => void;
  onShare: (file: MedicalTestFile) => void;
}

// Visor a pantalla completa de las imágenes de un estudio (placas, fotos del resultado).
// Zoom con dos dedos o doble toque; mientras hay zoom no se desliza a la imagen siguiente.
export default function ImagePreviewModal({
  visible,
  images,
  initialIndex,
  onClose,
  onShare,
}: ImagePreviewModalProps) {
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setZoomed(false);
    }
  }, [visible, initialIndex]);

  const current = images[index];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait']}>
      {/* Un Modal es otra raíz: necesita su propio SafeAreaProvider (márgenes en iOS)
          y su propio GestureHandlerRootView (gestos en Android) */}
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
          <FlatList
            data={images}
            keyExtractor={(item) => String(item.idMedicalTestFile)}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height }} className="items-center justify-center overflow-hidden">
                <ZoomableImage uri={item.url} width={width} height={height * 0.8} onZoomChange={setZoomed} />
              </View>
            )}
          />

          {/* Barra superior: cerrar, nombre y contador, compartir */}
          <SafeAreaView edges={['top']} className="absolute left-0 right-0 top-0 bg-black/40">
            <View className="flex-row items-center gap-3 px-4 py-3">
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={20} color="white" />
              </Pressable>
              <View className="flex-1">
                <Text className="text-sm font-bold text-white" numberOfLines={1}>
                  {current?.name}
                </Text>
                {images.length > 1 && (
                  <Text className="text-xs text-white/70">
                    {index + 1} de {images.length}
                  </Text>
                )}
              </View>
              {current && (
                <Pressable
                  onPress={() => onShare(current)}
                  hitSlop={8}
                  className="h-9 w-9 items-center justify-center rounded-full bg-white/15 active:opacity-70"
                  accessibilityLabel={`Compartir ${current.name}`}
                >
                  <Ionicons name="share-outline" size={18} color="white" />
                </Pressable>
              )}
            </View>
          </SafeAreaView>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
}
