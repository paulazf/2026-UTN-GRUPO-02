import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import axiosClient from '../api/axiosClient';
import { useNavigation } from '@react-navigation/native';

export default function LoginScreen() {
  const navigation = useNavigation();
  const authContext = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Por favor completá ambos campos.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await axiosClient.post('/auth/login/', { email, password });
      if (response.status === 200) {
        const { token, owner } = response.data;
        authContext?.login(token, owner);
      }
    } catch (error: any) {
      if (error.response?.data?.error) {
        setErrorMsg(error.response.data.error);
      } else {
        setErrorMsg('Email o contraseña incorrectos. Intentá de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]">
      {/* HEADER (Flecha y Título) */}
      <View className="flex-row items-center px-6 pt-8 pb-2 mt-4 relative h-14">
        <TouchableOpacity 
          className="absolute left-6 top-6 z-10 w-10 h-10 bg-[#FCE8E8] rounded-full justify-center items-center"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color="#D8657B" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[16px] font-semibold text-[#1A202C] mt-4">
          Ingreso
        </Text>
      </View>

      <View className="flex-1 px-6 pt-10">
        {/* TITULOS */}
        <Text className="text-[32px] font-extrabold text-[#1A202C] mb-1">
          Iniciar sesión
        </Text>
        <Text className="text-[16px] text-[#718096] mb-8">
          Hola de nuevo, te extrañamos.
        </Text>

        {/* ALERTA DE ERROR ESTILO MOCKUP */}
        {errorMsg !== '' && (
          <View className="flex-row items-center bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <Ionicons name="warning-outline" size={20} color="#EF4444" />
            <Text className="ml-2 text-red-500 flex-1">{errorMsg}</Text>
          </View>
        )}

        {/* INPUT EMAIL */}
        <View className="mb-5">
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
        <View className="mb-2">
          <Text className="text-[11px] font-bold text-[#A0AEC0] mb-2 ml-1 tracking-widest uppercase">
            Contraseña
          </Text>
          <View className="flex-row items-center bg-white border border-[#F4C7C7] rounded-full px-5 h-[52px]">
            <TextInput
              className="flex-1 text-[#2D3748] text-[15px]"
              placeholder="••••••••"
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

        {/* OLVIDE MI CONTRASEÑA */}
        <TouchableOpacity className="self-end mt-2 mb-8">
          <Text className="text-[#D8657B] font-medium text-[14px]">¿Olvidé mi contraseña?</Text>
        </TouchableOpacity>

        {/* BOTON PRIMARIO */}
        <TouchableOpacity 
          className="bg-[#D8657B] rounded-full h-[52px] justify-center items-center shadow-sm flex-row"
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-[16px] font-bold">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        {/* DIVIDER */}
        <View className="flex-row items-center justify-center my-6">
          <View className="h-[1px] bg-slate-300 flex-1" />
          <View className="w-2 h-2 border border-[#A0AEC0] rounded-full mx-3" />
          <View className="h-[1px] bg-slate-300 flex-1" />
        </View>

        {/* BOTON GOOGLE */}
        <TouchableOpacity className="bg-white border border-slate-200 rounded-full h-[52px] justify-center items-center flex-row shadow-sm">
          <Ionicons name="logo-google" size={20} color="#2D3748" className="mr-3" />
          <Text className="text-[#2D3748] text-[15px] font-semibold">Continuar con Google</Text>
        </TouchableOpacity>

        {/* FOOTER - CREAR CUENTA */}
        <View className="flex-row justify-center mt-auto mb-10">
          <Text className="text-[#718096] text-[15px]">¿No tenés cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text className="text-[#D8657B] text-[15px] font-bold">Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
