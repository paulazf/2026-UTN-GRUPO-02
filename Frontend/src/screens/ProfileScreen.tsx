import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  const owner = authContext?.userData;
  const firstName = owner?.firstName || '';
  const lastName = owner?.lastName || '';
  const email = owner?.email || '';
  
  const userFullName = `${firstName} ${lastName}`.trim() || 'Cargando...';

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-[#FAF6F3]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-16">
        {/* Tapa Rosa Superior con Esquinas Redondeadas (Estética de main) */}
        <View className="relative items-center rounded-b-[40px] bg-[#E87A8E] px-6 pb-10 pt-12 shadow-sm">
          {/* Botón de regreso usando lógica de feature */}
          <TouchableOpacity 
            className="absolute left-6 top-12 h-10 w-10 items-center justify-center rounded-full bg-white/20"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="h-20 w-20 items-center justify-center rounded-full bg-white/25 shadow-sm">
            <Ionicons name="person" size={36} color="#FFFFFF" />
          </View>
          
          <Text className="mt-3 text-2xl font-bold text-white">{userFullName}</Text>
          <Text className="mt-1 text-sm text-white/80">{email}</Text>
        </View>

        {/* Opciones de Menú (Lógica de feature, estética adaptada a main) */}
        <View className="px-5 mt-6">
          <TouchableOpacity className="mb-3 flex-row items-center rounded-3xl border border-[#F0E4DF] bg-white p-4 shadow-xs">
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-[#FAF6F3]">
              <Ionicons name="paw-outline" size={24} color="#E87A8E" />
            </View>
            <View className="flex-1 justify-center">
              <Text className="text-base font-bold text-[#2B1D1D]">Mis mascotas</Text>
              <Text className="mt-0.5 text-xs text-[#8C7B77]">2 registradas</Text>
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
    </SafeAreaView>
  );
}
