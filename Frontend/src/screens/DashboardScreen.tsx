import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Pet } from '../types/pet';
import { CalendarEvent } from '../types/calendar';
import { fetchPets } from '../services/petService';
import { fetchCalendarEvents } from '../services/calendarService';
import PetCarouselCard from '../components/pet/PetCarouselCard';
import CalendarEventCard from '../components/calendar/CalendarEventCard';

interface DashboardScreenProps {
  onSelectPet: (petId: number) => void;
  onViewAllPets: () => void;
  onOpenCreatePet: () => void;
  onNavigateToCalendar?: () => void;
  refreshTrigger?: number;
}

export default function DashboardScreen({
  onSelectPet,
  onViewAllPets,
  onOpenCreatePet,
  onNavigateToCalendar,
  refreshTrigger,
}: DashboardScreenProps) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [petsData, eventsData] = await Promise.all([
        fetchPets().catch((err) => {
          console.warn('Error loading dashboard pets:', err);
          return [];
        }),
        fetchCalendarEvents().catch((err) => {
          console.warn('Error loading dashboard calendar events:', err);
          return [];
        }),
      ]);
      setPets(petsData);
      setEvents(eventsData);
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // -------------------------------------------------------------
  // Cálculos para el cuadro de métricas simplificadas (Mockup)
  // -------------------------------------------------------------

  // 1. Vacunas vencidas: vacunas con isExpired = true
  const expiredVaccinesCount = useMemo(() => {
    return events.filter((e) => e.entityType === 'VACCINE' && e.isExpired).length;
  }, [events]);

  // 2. Por vencer: vacunas activas próximas a vencer en los próximos 30 días
  const expiringSoonCount = useMemo(() => {
    return events.filter(
      (e) => e.entityType === 'VACCINE' && !e.isExpired && e.daysRemaining >= 0 && e.daysRemaining <= 30
    ).length;
  }, [events]);

  // 3. Próximos turnos: turnos vigentes futuros o del día de hoy
  const upcomingAppointmentsCount = useMemo(() => {
    return events.filter(
      (e) => e.entityType === 'APPOINTMENT' && !e.isExpired && e.daysRemaining >= 0
    ).length;
  }, [events]);

  // 4. Próximos eventos (ventana de los próximos 30 días)
  const next30DaysEvents = useMemo(() => {
    return events.filter(
      (e) => !e.isExpired && e.daysRemaining >= 0 && e.daysRemaining <= 30
    );
  }, [events]);

  return (
    <SafeAreaView edges={['left', 'right']} className="flex-1 bg-[#FAF6F3]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DE6B80" />
        }
      >
        {/* Espacio para integrar datos del usuario */}
        <View className="h-24 rounded-b-[40px] bg-[#E87A8E] shadow-sm justify-center px-6">
        </View>

        <View className="px-5 mt-6">
          {/* Sección mis mascotas */}
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-[#2B1D1D]">Mis mascotas</Text>
            <Pressable onPress={onViewAllPets} className="active:opacity-70">
              <Text className="text-xs font-semibold text-[#DE6B80]">Ver todas</Text>
            </Pressable>
          </View>

          {/* Carrusel de Mascotas */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            {pets.map((pet) => (
              <PetCarouselCard
                key={pet.id}
                pet={pet}
                onPress={() => onSelectPet(pet.id)}
              />
            ))}

            {/* Tarjeta para agregar mascota */}
            <Pressable
              onPress={onOpenCreatePet}
              className="w-32 items-center justify-center rounded-3xl border-2 border-dashed border-[#DE6B80] bg-[#FFF8F9] p-4 active:opacity-75"
            >
              <View className="mb-1 h-9 w-9 items-center justify-center rounded-full bg-[#FCECEF]">
                <Text className="text-lg font-bold text-[#DE6B80]">+</Text>
              </View>
              <Text className="text-center text-xs font-bold text-[#DE6B80]">Agregar</Text>
              <Text className="text-center text-[10px] text-[#8C7B77]">Nueva...</Text>
            </Pressable>
          </ScrollView>

          {/* Cuadro de resumen sanitario simplificado (Mockup) */}
          <View className="mt-6 flex-row items-center rounded-3xl bg-white p-4 shadow-sm border border-[#F5ECE8]">
            {/* Columna 1: Vacunas vencidas */}
            <View className="flex-1 items-center justify-center border-r border-[#F0E4DF] px-1">
              <Text className="text-2xl font-black text-[#DE4860]">
                {expiredVaccinesCount}
              </Text>
              <Text className="text-center text-[11px] font-medium text-[#8C7B77] mt-1 leading-4">
                Vacunas{'\n'}vencidas
              </Text>
            </View>

            {/* Columna 2: Por vencer */}
            <View className="flex-1 items-center justify-center border-r border-[#F0E4DF] px-1">
              <Text className="text-2xl font-black text-[#E67E22]">
                {expiringSoonCount}
              </Text>
              <Text className="text-center text-[11px] font-medium text-[#8C7B77] mt-1 leading-4">
                Por{'\n'}vencer
              </Text>
            </View>

            {/* Columna 3: Próximos turnos */}
            <View className="flex-1 items-center justify-center px-1">
              <Text className="text-2xl font-black text-[#10B981]">
                {upcomingAppointmentsCount}
              </Text>
              <Text className="text-center text-[11px] font-medium text-[#8C7B77] mt-1 leading-4">
                Próximos{'\n'}turnos
              </Text>
            </View>
          </View>

          {/* Sección próximos eventos (ventana de 30 días) */}
          <View className="mt-8">
            <View className="mb-3.5 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-[#2B1D1D]">Próximos eventos</Text>
              {onNavigateToCalendar && (
                <Pressable onPress={onNavigateToCalendar} className="active:opacity-70">
                  <Text className="text-xs font-semibold text-[#DE6B80]">Ver calendario</Text>
                </Pressable>
              )}
            </View>

            {loadingEvents && !refreshing ? (
              <View className="py-8 items-center justify-center">
                <ActivityIndicator size="small" color="#DE6B80" />
                <Text className="text-xs text-[#8C7B77] mt-2">Cargando próximos eventos...</Text>
              </View>
            ) : next30DaysEvents.length === 0 ? (
              <View className="py-6 items-center justify-center rounded-2xl bg-white border border-[#F5ECE8] px-4">
                <Ionicons name="calendar-outline" size={28} color="#DE6B80" />
                <Text className="text-sm font-semibold text-[#2B1D1D] mt-2">
                  Sin eventos en los próximos 30 días
                </Text>
                <Text className="text-xs text-[#8C7B77] text-center mt-1">
                  No hay turnos, vacunas ni tratamientos agendados para este período.
                </Text>
              </View>
            ) : (
              next30DaysEvents.map((event) => (
                <CalendarEventCard key={event.id} event={event} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
