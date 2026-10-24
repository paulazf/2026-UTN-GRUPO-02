import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Pet } from '../../types/pet';
import { deletePet, fetchPets } from '../../services/petService';

interface ProfileDeletePetModalProps {
  visible: boolean;
  onClose: () => void;
  onPetDeleted?: () => void;
}

export default function ProfileDeletePetModal({
  visible,
  onClose,
  onPetDeleted,
}: ProfileDeletePetModalProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadPets = async () => {
    try {
      setLoadingPets(true);
      const data = await fetchPets();
      setPets(data);
      if (data.length > 0) {
        setSelectedPet(data[0]);
      } else {
        setSelectedPet(null);
      }
    } catch (err) {
      console.warn('Error loading pets in delete modal:', err);
    } finally {
      setLoadingPets(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadPets();
    }
  }, [visible]);

  const handleConfirmDelete = async () => {
    if (!selectedPet) {
      Alert.alert('Seleccioná una mascota', 'Elegí la mascota que deseás dar de baja.');
      return;
    }

    try {
      setDeleting(true);
      await deletePet(selectedPet.id);
      const petName = selectedPet.name;
      Alert.alert('Mascota dada de baja', `${petName} fue dada de baja correctamente.`);
      onClose();
      if (onPetDeleted) {
        onPetDeleted();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo dar de baja la mascota.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-xl">
          <View className="mx-auto mb-3 h-14 w-14 items-center justify-center rounded-full bg-[#FCEAEA]">
            <Ionicons name="heart-dislike-outline" size={28} color="#B92020" />
          </View>

          <Text className="text-center text-xl font-bold text-[#2B1D1D]">
            Dar de baja mascota
          </Text>

          {loadingPets ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#DE6B80" />
            </View>
          ) : pets.length === 0 ? (
            <View className="py-6 items-center">
              <Text className="text-sm text-[#8C7B77]">No tenés mascotas registradas.</Text>
              <Pressable
                onPress={onClose}
                className="mt-4 rounded-2xl bg-[#FAF6F3] px-5 py-2.5 border border-[#F0E4DF]"
              >
                <Text className="text-xs font-bold text-[#8C7B77]">Cerrar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text className="mt-2 text-center text-xs leading-5 text-[#8C7B77]">
                Seleccioná la mascota que ya no convive contigo o ha partido. Su historial médico permanecerá resguardado.
              </Text>

              {/* Selector de mascota */}
              <ScrollView className="my-4 max-h-48" showsVerticalScrollIndicator={false}>
                <View className="gap-2">
                  {pets.map((p) => {
                    const isSelected = selectedPet?.id === p.id;
                    return (
                      <Pressable
                        key={p.id}
                        onPress={() => setSelectedPet(p)}
                        className={`flex-row items-center justify-between rounded-2xl p-3 border active:opacity-80 ${
                          isSelected
                            ? 'border-[#B92020] bg-[#FFF5F5]'
                            : 'border-[#F0E4DF] bg-[#FAF5F2]'
                        }`}
                      >
                        <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                          {p.photo ? (
                            <Image
                              source={{ uri: p.photo }}
                              className="h-9 w-9 rounded-xl bg-[#EFE6E2]"
                              resizeMode="cover"
                            />
                          ) : (
                            <View className="h-9 w-9 items-center justify-center rounded-xl bg-white border border-[#F0E4DF]">
                              <Ionicons name="paw" size={16} color="#DE6B80" />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text
                              className={`text-xs font-bold ${
                                isSelected ? 'text-[#B92020]' : 'text-[#2B1D1D]'
                              }`}
                              numberOfLines={1}
                            >
                              {p.name}
                            </Text>
                            <Text className="text-[10px] text-[#8C7B77]" numberOfLines={1}>
                              {p.breed?.name}
                            </Text>
                          </View>
                        </View>

                        <View
                          className={`h-5 w-5 items-center justify-center rounded-full border ${
                            isSelected ? 'border-[#B92020] bg-[#B92020]' : 'border-[#C8B8B4]'
                          }`}
                        >
                          {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <View className="gap-2">
                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={deleting || !selectedPet}
                  className={`items-center justify-center rounded-2xl py-3.5 active:opacity-90 ${
                    selectedPet ? 'bg-[#B92020]' : 'bg-[#E0D0CE]'
                  }`}
                >
                  {deleting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-sm font-bold text-white">
                      {selectedPet ? `Dar de baja a ${selectedPet.name}` : 'Seleccioná una mascota'}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={onClose}
                  disabled={deleting}
                  className="items-center justify-center rounded-2xl border border-[#F0E4DF] bg-[#FAF6F3] py-3 active:opacity-75"
                >
                  <Text className="text-xs font-bold text-[#8C7B77]">Cancelar</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

