import React, { useContext, useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { AuthContext } from '../context/AuthContext';
import { hasSeenOnboarding } from '../services/onboardingService';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const authContext = useContext(AuthContext);

  if (!authContext) throw new Error("AuthContext debe usarse dentro de un AuthProvider");

  const { isLoading, userToken } = authContext;
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [seenOnboarding, setSeenOnboarding] = useState(true);

  useEffect(() => {
    hasSeenOnboarding()
      .then((seen) => setSeenOnboarding(seen))
      .catch(() => setSeenOnboarding(true))
      .finally(() => setCheckingOnboarding(false));
  }, [userToken]);

  // Mientras verifica el SecureStore y el Onboarding, mostramos un loader
  if (isLoading || checkingOnboarding) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={userToken == null ? (!seenOnboarding ? 'Onboarding' : 'Welcome') : 'Home'}
      screenOptions={{ headerShown: false }}
    >
      {userToken == null ? (
        // Rutas públicas (No logueado)
        !seenOnboarding ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          </>
        )
      ) : (
        // Rutas privadas (Logueado)
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
