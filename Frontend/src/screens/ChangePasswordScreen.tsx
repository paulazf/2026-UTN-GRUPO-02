import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';

export default function ChangePasswordScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSave = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg('Por favor completá todos los campos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas nuevas no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await axiosClient.post('/owner/me/password/', {
        currentPassword,
        newPassword
      });

      if (response.status === 200 && response.data.token) {
        setSuccessMsg('Contraseña actualizada correctamente.');
        
        // Actualizar el token en el contexto silenciosamente
        await authContext?.updateToken(response.data.token);

        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'La contraseña actual es incorrecta o hubo un error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-6 pt-6 pb-2">
        <TouchableOpacity 
          className="w-10 h-10 bg-white rounded-full justify-center items-center shadow-sm"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#D8657B" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[18px] font-bold text-[#2D3748] mr-10">
          Cambiar contraseña
        </Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" keyboardShouldPersistTaps="handled">
        
        {errorMsg !== '' && (
          <View className="flex-row items-center bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <Ionicons name="warning-outline" size={20} color="#EF4444" />
            <Text className="ml-2 text-red-500 flex-1">{errorMsg}</Text>
          </View>
        )}

        {successMsg !== '' && (
          <View className="flex-row items-center bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
            <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
            <Text className="ml-2 text-green-600 flex-1">{successMsg}</Text>
          </View>
        )}

        {/* INPUT CONTRASEÑA ACTUAL */}
        <View className="mb-5">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Contraseña actual
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="••••••••"
              placeholderTextColor="#CBD5E0"
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} className="pl-2">
              <Ionicons name={showCurrent ? "eye-off" : "eye"} size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INPUT NUEVA CONTRASEÑA */}
        <View className="mb-5">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Nueva contraseña
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="••••••••"
              placeholderTextColor="#CBD5E0"
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)} className="pl-2">
              <Ionicons name={showNew ? "eye-off" : "eye"} size={20} color="#A0AEC0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* INPUT CONFIRMAR CONTRASEÑA */}
        <View className="mb-8">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Confirmar nueva contraseña
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="••••••••"
              placeholderTextColor="#CBD5E0"
              secureTextEntry={!showNew}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>
        </View>

        {/* BOTON PRIMARIO */}
        <TouchableOpacity 
          className="bg-[#D8657B] rounded-full h-[52px] justify-center items-center shadow-sm flex-row mb-10"
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-[16px] font-bold">Actualizar contraseña</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
