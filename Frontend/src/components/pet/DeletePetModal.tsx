import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DeletePetModalProps {
  visible: boolean;
  petName: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeletePetModal({
  visible,
  petName,
  loading,
  onClose,
  onConfirm,
}: DeletePetModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        <View className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-xl">
          <View className="mx-auto mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#FCEAEA]">
            <Ionicons name="heart-dislike-outline" size={32} color="#B92020" />
          </View>

          <Text className="text-center text-xl font-bold text-[#2B1D1D]">
            Dar de baja a {petName}
          </Text>

          <Text className="mt-2.5 text-center text-xs leading-5 text-[#8C7B77]">
            Esta acción retirará a {petName} de tu lista activa de mascotas y de los recordatorios diarios.
            {'\n\n'}
            Su historial clínico, vacunas y estudios permanecerán resguardados en el sistema con el mayor cuidado y respeto.
          </Text>

          <View className="mt-6 gap-2.5">
            <Pressable
              onPress={onConfirm}
              disabled={loading}
              className="items-center justify-center rounded-2xl bg-[#B92020] py-3.5 active:opacity-90"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-sm font-bold text-white">Confirmar baja</Text>
              )}
            </Pressable>

            <Pressable
              onPress={onClose}
              disabled={loading}
              className="items-center justify-center rounded-2xl border border-[#F0E4DF] bg-[#FAF6F3] py-3.5 active:opacity-75"
            >
              <Text className="text-sm font-bold text-[#8C7B77]">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

