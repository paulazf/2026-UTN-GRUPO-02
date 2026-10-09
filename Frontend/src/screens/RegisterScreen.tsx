import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function RegisterScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const authContext = useContext(AuthContext);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    // Validaciones básicas
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      setErrorMsg('Por favor completá todos los campos.');
      return;
    }
    
    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      // Registrar al usuario
      const response = await axiosClient.post('/owner/', {
        firstName,
        lastName,
        email,
        password
      });
      
      if (response.status === 201 || response.status === 200) {
        // Auto login luego de crear la cuenta
        const loginResponse = await axiosClient.post('/auth/login/', { email, password });
        if (loginResponse.status === 200) {
          const { token, owner } = loginResponse.data;
          authContext?.login(token, owner);
        }
      }
    } catch (error: any) {
      if (error.response?.data?.email) {
        setErrorMsg('Este email ya está registrado.');
      } else if (error.response?.data?.error || error.response?.data?.detail) {
        setErrorMsg(error.response.data.error || error.response.data.detail);
      } else {
        setErrorMsg('Ocurrió un error. Revisá los datos ingresados.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]">
      {/* HEADER */}
      <View className="flex-row items-center px-6 pt-8 pb-2 mt-4 relative h-14">
        <TouchableOpacity 
          className="absolute left-6 top-6 z-10 w-10 h-10 bg-[#FCE8E8] rounded-full justify-center items-center"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#D8657B" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[16px] font-semibold text-[#1A202C] mt-4">
          Registro
        </Text>
      </View>

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          className="flex-1 px-6 pt-10"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 250 }}
        >
          {/* TITULOS */}
          <Text className="text-[32px] font-extrabold text-[#1A202C] mb-1">
            Crear cuenta
          </Text>
          <Text className="text-[16px] text-[#718096] mb-8">
            Unite para cuidar a tus mejores amigos.
          </Text>

          {/* ALERTA DE ERROR */}
          {errorMsg !== '' && (
            <View className="flex-row items-center bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
              <Ionicons name="warning-outline" size={20} color="#EF4444" />
              <Text className="ml-2 text-red-500 flex-1">{errorMsg}</Text>
            </View>
          )}

          {/* INPUT NOMBRE */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
              Nombre
            </Text>
            <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
              <TextInput
                className="flex-1 text-[#2D3748] text-[15px]"
                placeholder="Ej: Valentina"
                placeholderTextColor="#CBD5E0"
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* INPUT APELLIDO */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
              Apellido
            </Text>
            <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
              <TextInput
                className="flex-1 text-[#2D3748] text-[15px]"
                placeholder="Ej: García"
                placeholderTextColor="#CBD5E0"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* INPUT EMAIL */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
              Email
            </Text>
            <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
              <TextInput
                className="flex-1 text-[#2D3748] text-[15px]"
                placeholder="Ej: tu@email.com"
                placeholderTextColor="#CBD5E0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMsg('');
                }}
              />
            </View>
          </View>

          {/* INPUT CONTRASEÑA */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
              Contraseña
            </Text>
            <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
              <TextInput
                className="flex-1 text-[#2D3748] text-[15px]"
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#CBD5E0"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMsg('');
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="pl-2">
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#A0AEC0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* INPUT CONFIRMAR CONTRASEÑA */}
          <View className="mb-8">
            <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
              Confirmar contraseña
            </Text>
            <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
              <TextInput
                className="flex-1 text-[#2D3748] text-[15px]"
                placeholder="Repetí tu contraseña"
                placeholderTextColor="#CBD5E0"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMsg('');
                }}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="pl-2">
                <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color="#A0AEC0" />
              </TouchableOpacity>
            </View>
          </View>

          {/* BOTON PRIMARIO */}
          <TouchableOpacity 
            className="bg-[#D8657B] rounded-full h-[52px] justify-center items-center shadow-sm flex-row mb-6"
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text className="text-white text-[16px] font-bold">Crear cuenta</Text>
            )}
          </TouchableOpacity>

          {/* BOTON GOOGLE */}
          <TouchableOpacity className="bg-white border border-slate-200 rounded-full h-[52px] justify-center items-center flex-row shadow-sm">
            <Ionicons name="logo-google" size={20} color="#2D3748" className="mr-3" />
            <Text className="text-[#2D3748] text-[15px] font-semibold">Continuar con Google</Text>
          </TouchableOpacity>

          {/* FOOTER - INICIAR SESIÓN */}
          <View className="flex-row justify-center mt-10">
            <Text className="text-[#718096] text-[15px]">¿Ya tenés cuenta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text className="text-[#D8657B] text-[15px] font-bold">Iniciar sesión</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
