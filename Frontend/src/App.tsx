import './global.css';
import React, { useState, useContext, useEffect } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ThemeProvider, useSeasonTheme } from './context/ThemeContext';
import LoadingScreen from './components/brand/LoadingScreen';
import { useReminderSync, useReminderTap } from './notifications';
import { hasSeenOnboarding } from './services/onboardingService';

// Import Screens from main (manual routing components)
import DashboardScreen from './screens/DashboardScreen';
import PetListScreen from './screens/pet/PetListScreen';
import PetDetailScreen, { PetDetailTab, TAB_BY_EVENT } from './screens/pet/PetDetailScreen';
import { CalendarEvent } from './types/calendar';
import CalendarScreen from './screens/CalendarScreen';
import CreatePetModal from './components/pet/CreatePetModal';
import BottomNavBar, { NavTab } from './components/BottomNavBar';

// Import Screens from feature (React Navigation components)
import LoginScreen from './screens/LoginScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import OnboardingScreen from './screens/OnboardingScreen';

const Stack = createNativeStackNavigator();

// Este es el componente que integra la lógica de pestañas de main
// y reemplaza al HomeScreen antiguo.
function MainTabs() {
  const [currentTab, setCurrentTab] = useState<NavTab>('INICIO');
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedPetTab, setSelectedPetTab] = useState<PetDetailTab | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const navigation = useNavigation();
  const { palette } = useSeasonTheme();

  const handleSelectPet = (petId: number) => {
    setSelectedPetTab(undefined);
    setSelectedPetId(petId);
  };
  const handleBack = () => setSelectedPetId(null);

  // Abre la ficha de la mascota directo en una pestaña (Medicación, Vacunas, Turnos).
  const openPetTab = (petId: number, tab: PetDetailTab) => {
    setSelectedPetTab(tab);
    setSelectedPetId(petId);
  };
  const handleOpenEvent = (event: CalendarEvent) =>
    openPetTab(event.petId, TAB_BY_EVENT[event.entityType]);

  // Tocar el aviso de una toma o vacuna lleva a la pestaña correspondiente de esa mascota.
  useReminderTap(({ group, petId }) => {
    if (group === 'medication' && petId) {
      navigation.navigate('MainTabs' as never);
      openPetTab(petId, 'MEDICACION');
    } else if (group === 'vaccine' && petId) {
      navigation.navigate('MainTabs' as never);
      openPetTab(petId, 'VACUNAS');
    }
  });
  const handlePetCreated = () => setRefreshTrigger((prev) => prev + 1);
  const handlePetUpdated = () => setRefreshTrigger((prev) => prev + 1);

  const handleSelectTab = (tab: NavTab) => {
    setSelectedPetId(null);
    if (tab === 'PERFIL') {
      // Usar React Navigation para la pantalla de perfil
      navigation.navigate('Profile' as never);
    } else {
      setCurrentTab(tab);
    }
  };

  return (
    <View className="flex-1 bg-[#FAF6F3]">
      <View className="flex-1">
        {selectedPetId ? (
          <PetDetailScreen
            petId={selectedPetId}
            initialTab={selectedPetTab}
            onBack={handleBack}
            onPetUpdated={handlePetUpdated}
          />
        ) : currentTab === 'INICIO' ? (
          <DashboardScreen
            onSelectPet={handleSelectPet}
            onViewAllPets={() => setCurrentTab('MASCOTAS')}
            onOpenCreatePet={() => setIsModalOpen(true)}
            onNavigateToCalendar={() => setCurrentTab('CALENDARIO')}
            onOpenEvent={handleOpenEvent}
            refreshTrigger={refreshTrigger}
          />
        ) : currentTab === 'MASCOTAS' ? (
          <PetListScreen
            onSelectPet={handleSelectPet}
            onOpenCreatePet={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
          ) : currentTab === 'CALENDARIO' ? (
          <CalendarScreen onOpenEvent={handleOpenEvent} />
        ) : (
          <SafeAreaView className="flex-1 items-center justify-center p-6">
            <Ionicons name="calendar-outline" size={40} color={palette.accent} style={{ marginBottom: 8 }} />
            <Text className="text-xl font-bold text-[#2B1D1D]">Calendario</Text>
            <Text className="text-sm text-[#8C7B77] mt-1 text-center">
              Próximamente disponible.
            </Text>
          </SafeAreaView>
        )}
      </View>

      <CreatePetModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPetCreated={handlePetCreated}
      />

      <BottomNavBar
        currentTab={currentTab}
        isDetailActive={selectedPetId !== null}
        onSelectTab={handleSelectTab}
      />
    </View>
  );
}

function RootNavigator() {
  const authContext = useContext(AuthContext);
  if (!authContext) throw new Error("AuthContext debe usarse dentro de un AuthProvider");

  const { isLoading, userToken } = authContext;
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [seenOnboarding, setSeenOnboarding] = useState(true);

  // Se lee del disco una sola vez, al abrir la app.
  useEffect(() => {
    hasSeenOnboarding()
      .then((seen) => setSeenOnboarding(seen))
      .catch(() => setSeenOnboarding(true))
      .finally(() => setCheckingOnboarding(false));
  }, []);

  // Si hay sesión, el usuario ya conoce la app: al cerrar sesión no debe volver a ver el tutorial.
  useEffect(() => {
    if (userToken != null) setSeenOnboarding(true);
  }, [userToken]);

  // Avisos locales (medicación, y los que se vayan sumando): ver docs/notificaciones.md
  useReminderSync(userToken != null);

  // La pantalla de carga se muestra al menos 1,5 s al abrir la app, para que se vea la marca.
  const [minSplashDone, setMinSplashDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !minSplashDone || checkingOnboarding) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator
      initialRouteName={userToken == null ? (!seenOnboarding ? 'Onboarding' : 'Welcome') : 'MainTabs'}
      screenOptions={{ headerShown: false }}
    >
      {userToken == null ? (
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
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
