import React, { useState, useContext, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);

  const [firstName, setFirstName] = useState(authContext?.userData?.firstName || '');
  const [lastName, setLastName] = useState(authContext?.userData?.lastName || '');
  const [phone, setPhone] = useState(authContext?.userData?.phone || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const scrollViewRef = useRef<any>(null);

  useEffect(() => {
    if (errorMsg) {
      Keyboard.dismiss();
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [errorMsg]);

  const handleSave = async () => {
    Keyboard.dismiss();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();

    if (!cleanFirstName || !cleanLastName) {
      setErrorMsg('Nombre y apellido son obligatorios.');
      return;
    }

    if (cleanFirstName.length > 150) {
      setErrorMsg('El nombre no puede superar los 150 caracteres.');
      return;
    }

    if (cleanLastName.length > 150) {
      setErrorMsg('El apellido no puede superar los 150 caracteres.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const response = await axiosClient.patch('/owner/me/', {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        phone: cleanPhone || null
      });

      if (response.status === 200) {
        // Actualizar el contexto para que se refleje globalmente
        authContext?.updateUserData(response.data);
        setSuccessMsg('Perfil actualizado correctamente.');
        
        // Regresar después de un corto delay para que se vea el mensaje de éxito
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error: any) {
      const data = error.response?.data;
      if (data?.firstName) {
        const msg = Array.isArray(data.firstName) ? data.firstName[0] : data.firstName;
        setErrorMsg(msg);
      } else if (data?.lastName) {
        const msg = Array.isArray(data.lastName) ? data.lastName[0] : data.lastName;
        setErrorMsg(msg);
      } else if (data?.phone) {
        const msg = Array.isArray(data.phone) ? data.phone[0] : data.phone;
        setErrorMsg(msg);
      } else if (data?.detail || data?.error) {
        setErrorMsg(data.detail || data.error);
      } else if (data?.non_field_errors) {
        const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
        setErrorMsg(msg);
      } else if (data) {
        setErrorMsg('Ocurrió un error al actualizar el perfil. Revisá los datos ingresados.');
      } else {
        setErrorMsg('No se pudo conectar con el servidor. Verificá tu conexión a internet.');
      }
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
          Editar perfil
        </Text>
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-6 pt-6" 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60 }}
        >
        
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

        {/* INPUT NOMBRE */}
        <View className="mb-5">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Nombre
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="Tu nombre"
              placeholderTextColor="#CBD5E0"
              value={firstName}
              onChangeText={(text) => { setFirstName(text); setErrorMsg(''); }}
            />
          </View>
        </View>

        {/* INPUT APELLIDO */}
        <View className="mb-5">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Apellido
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="Tu apellido"
              placeholderTextColor="#CBD5E0"
              value={lastName}
              onChangeText={(text) => { setLastName(text); setErrorMsg(''); }}
            />
          </View>
        </View>

        {/* INPUT TELÉFONO */}
        <View className="mb-5">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Teléfono
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="Ej: +54 9 11 1234 5678"
              placeholderTextColor="#CBD5E0"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => { setPhone(text); setErrorMsg(''); }}
            />
          </View>
        </View>

        {/* INPUT EMAIL (Disabled) */}
        <View className="mb-8 opacity-70">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Email (No modificable)
          </Text>
          <View className="flex-row items-center bg-gray-100 border border-gray-200 rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#718096] text-[15px]"
              value={authContext?.userData?.email}
              editable={false}
            />
            <Ionicons name="lock-closed" size={16} color="#A0AEC0" />
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
            <Text className="text-white text-[16px] font-bold">Guardar cambios</Text>
          )}
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
