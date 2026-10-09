import './global.css';
import React, { useState, useContext } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, AuthContext } from './context/AuthContext';

// Import Screens from main (manual routing components)
import DashboardScreen from './screens/DashboardScreen';
import PetListScreen from './screens/pet/PetListScreen';
import PetDetailScreen from './screens/pet/PetDetailScreen';
import CreatePetModal from './components/pet/CreatePetModal';
import BottomNavBar, { NavTab } from './components/BottomNavBar';

// Import Screens from feature (React Navigation components)
import LoginScreen from './screens/LoginScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import EditProfileScreen from './screens/EditProfileScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

// Este es el componente que integra la lógica de pestañas de main
// y reemplaza al HomeScreen antiguo.
function MainTabs() {
  const [currentTab, setCurrentTab] = useState<NavTab>('INICIO');
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const navigation = useNavigation();

  const handleSelectPet = (petId: number) => setSelectedPetId(petId);
  const handleBack = () => setSelectedPetId(null);
  const handlePetCreated = () => setRefreshTrigger((prev) => prev + 1);

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
          <PetDetailScreen petId={selectedPetId} onBack={handleBack} />
        ) : currentTab === 'INICIO' ? (
          <DashboardScreen
            onSelectPet={handleSelectPet}
            onViewAllPets={() => setCurrentTab('MASCOTAS')}
            onOpenCreatePet={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : currentTab === 'MASCOTAS' ? (
          <PetListScreen
            onSelectPet={handleSelectPet}
            onOpenCreatePet={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <SafeAreaView className="flex-1 items-center justify-center p-6">
            <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-[#FCECEF]">
              <Ionicons name="calendar-outline" size={30} color="#DE6B80" />
            </View>
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

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken == null ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}