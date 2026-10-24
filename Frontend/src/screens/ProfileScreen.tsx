import React, { useContext, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { fetchPets } from '../services/petService';
import ProfileDeletePetModal from '../components/pet/ProfileDeletePetModal';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  const owner = authContext?.userData;
  const firstName = owner?.firstName || '';
  const lastName = owner?.lastName || '';
  const email = owner?.email || '';

  const userFullName = `${firstName} ${lastName}`.trim() || 'Cargando...';

  const [petCount, setPetCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const loadPetCount = async () => {
    try {
      setLoadingCount(true);
      const data = await fetchPets();
      setPetCount(data.length);
    } catch (err) {
      console.warn('Error loading pet count in profile:', err);
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    loadPetCount();
  }, []);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-[#FAF6F3]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-16">
        {/* Tapa Rosa Superior */}
        <View className="relative items-center rounded-b-[40px] bg-[#E87A8E] px-6 pb-10 pt-12 shadow-sm">
          <TouchableOpacity
            className="absolute left-6 top-12 h-10 w-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="h-20 w-20 items-center justify-center rounded-full bg-white/25 shadow-sm">
            <Text className="text-4xl">👤</Text>
          </View>

          <Text className="mt-3 text-2xl font-bold text-white">{userFullName}</Text>
          <Text className="mt-1 text-sm text-white/80">{email}</Text>
        </View>

        {/* Opciones de Menú */}
        <View className="px-5 mt-6">
          {/* Card Mis mascotas */}
          <TouchableOpacity
            onPress={() => setIsDeleteModalOpen(true)}
            className="mb-3 flex-row items-center rounded-3xl border border-[#F0E4DF] bg-white p-4 shadow-xs active:opacity-80"
          >
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-[#FAF6F3]">
              <Ionicons name="paw-outline" size={24} color="#E87A8E" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-base font-bold text-[#2B1D1D]">Mis mascotas</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">
                {loadingCount || petCount === null
                  ? 'Cargando...'
                  : petCount === 1
                  ? '1 registrada'
                  : `${petCount} registradas`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8C7B77" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-3 flex-row items-center rounded-3xl border border-[#F0E4DF] bg-white p-4 shadow-xs">
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-[#FAF6F3]">
              <Ionicons name="notifications-outline" size={24} color="#E87A8E" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-base font-bold text-[#2B1D1D]">Notificaciones</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Recordatorios activados</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8C7B77" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-3 flex-row items-center rounded-3xl border border-[#F0E4DF] bg-white p-4 shadow-xs">
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-[#FAF6F3]">
              <Ionicons name="medkit-outline" size={24} color="#E87A8E" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-base font-bold text-[#2B1D1D]">Mis veterinarios</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Dr. Acosta, Dra. Ríos</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8C7B77" />
          </TouchableOpacity>

          <TouchableOpacity className="mb-3 flex-row items-center rounded-3xl border border-[#F0E4DF] bg-white p-4 shadow-xs">
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-[#FAF6F3]">
              <Ionicons name="document-text-outline" size={24} color="#E87A8E" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-base font-bold text-[#2B1D1D]">Historial completo</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Exportar PDF</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8C7B77" />
          </TouchableOpacity>

          <TouchableOpacity
            className="mb-8 flex-row items-center rounded-3xl border border-[#F0E4DF] bg-white p-4 shadow-xs"
            onPress={() => navigation.navigate('Settings' as never)}
          >
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-[#FAF6F3]">
              <Ionicons name="settings-outline" size={24} color="#E87A8E" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-base font-bold text-[#2B1D1D]">Configuración</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">Cuenta y privacidad</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8C7B77" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ProfileDeletePetModal
        visible={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onPetDeleted={loadPetCount}
      />
    </SafeAreaView>
  );
}
