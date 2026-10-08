import React, { useState } from 'react';
import { View, SafeAreaView, Text } from 'react-native';
import './global.css';
import DashboardScreen from './screens/DashboardScreen';
import PetListScreen from './screens/pet/PetListScreen';
import PetDetailScreen from './screens/pet/PetDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreatePetModal from './components/pet/CreatePetModal';
import BottomNavBar, { NavTab } from './components/BottomNavBar';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('INICIO');
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectPet = (petId: number) => {
    setSelectedPetId(petId);
  };

  const handleBack = () => {
    setSelectedPetId(null);
  };

  const handlePetCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectTab = (tab: NavTab) => {
    setSelectedPetId(null);
    setCurrentTab(tab);
  };

  return (
    <View className="flex-1 bg-[#FAF6F3]">
      {/* Área de Pantallas */}
      <View className="flex-1">
        {selectedPetId ? (
          // Pantalla Detalle de Mascota
          <PetDetailScreen petId={selectedPetId} onBack={handleBack} />
        ) : currentTab === 'INICIO' ? (
          // Pantalla Inicio 
          <DashboardScreen
            onSelectPet={handleSelectPet}
            onViewAllPets={() => setCurrentTab('MASCOTAS')}
            onOpenCreatePet={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : currentTab === 'MASCOTAS' ? (
          // Pantalla Mis mascotas
          <PetListScreen
            onSelectPet={handleSelectPet}
            onOpenCreatePet={() => setIsModalOpen(true)}
            refreshTrigger={refreshTrigger}
          />
        ) : currentTab === 'PERFIL' ? (
          // Pantalla Perfil
          <ProfileScreen />
        ) : (
          // Pantalla Calendario
          <SafeAreaView className="flex-1 items-center justify-center p-6">
            <Text className="text-4xl mb-2">📅</Text>
            <Text className="text-xl font-bold text-[#2B1D1D]">Calendario</Text>
            <Text className="text-sm text-[#8C7B77] mt-1 text-center">
              Próximamente disponible.
            </Text>
          </SafeAreaView>
        )}
      </View>

      {/* Pantalla Modal Nueva Mascota */}
      <CreatePetModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onPetCreated={handlePetCreated}
      />

      {/* Componente Navbar */}
      <BottomNavBar
        currentTab={currentTab}
        isDetailActive={selectedPetId !== null}
        onSelectTab={handleSelectTab}
      />
    </View>
  );
}