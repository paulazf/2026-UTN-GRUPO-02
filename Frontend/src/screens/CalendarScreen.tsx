import React, { useEffect, useState, useMemo } from 'react';
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
import { CalendarEntityType, CalendarEvent } from '../types/calendar';
import { fetchPets } from '../services/petService';
import { fetchCalendarEvents } from '../services/calendarService';
import CalendarFilterPills from '../components/calendar/CalendarFilterPills';
import CalendarEventCard from '../components/calendar/CalendarEventCard';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface MonthGroup {
  key: string; // YYYY-MM
  label: string; // e.g. "Noviembre 2026"
  events: CalendarEvent[];
  hasVaccineExpiration: boolean;
}

export default function CalendarScreen() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<CalendarEntityType | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sección de vencidas: colapsada por defecto
  const [isExpiredExpanded, setIsExpiredExpanded] = useState(false);

  // Carga de mascotas registradas
  useEffect(() => {
    fetchPets()
      .then((data) => setPets(data))
      .catch((err) => console.warn('Error al cargar mascotas para filtros:', err));
  }, []);

  // Carga de eventos de calendario según filtros
  const loadEvents = async () => {
    try {
      setError(null);
      const params: { idPet?: number; entityType?: CalendarEntityType } = {};
      if (selectedPetId !== null) params.idPet = selectedPetId;
      if (selectedEntityType !== null) params.entityType = selectedEntityType;

      const data = await fetchCalendarEvents(params);
      setEvents(data);
    } catch (err) {
      console.error('Error cargando eventos del calendario:', err);
      setError('No se pudieron cargar los eventos sanitarios.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadEvents();
  }, [selectedPetId, selectedEntityType]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  // -------------------------------------------------------------
  // Segmentación de eventos para las secciones requeridas
  // -------------------------------------------------------------

  // 1. Sección "Vencidas": Vacunas vencidas de la última aplicación registrada
  const expiredEvents = useMemo(() => {
    return events.filter((e) => e.isExpired && e.entityType === 'VACCINE');
  }, [events]);

  // 2. Sección "Hoy": Actividades exactamente del día actual
  const todayEvents = useMemo(() => {
    return events.filter(
      (e) => e.daysRemaining === 0 && !(e.isExpired && e.entityType === 'VACCINE')
    );
  }, [events]);

  // 3. Sección "Por Mes": Eventos agrupados cronológicamente por mes,
  // excluyendo las actividades de hoy y las vacunas vencidas (que van a su propia sección).
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const monthEvents = events.filter(
      (e) => !(e.isExpired && e.entityType === 'VACCINE') && e.daysRemaining !== 0
    );

    const groupsMap = new Map<string, { label: string; events: CalendarEvent[]; hasVaccineExpiration: boolean }>();

    monthEvents.forEach((ev) => {
      try {
        const [yearStr, monthStr] = ev.date.split('-');
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;
        const key = `${yearStr}-${monthStr}`;

        if (!groupsMap.has(key)) {
          const monthLabel = MONTH_NAMES[monthIndex] || 'Desconocido';
          groupsMap.set(key, {
            label: `${monthLabel} ${year}`,
            events: [],
            hasVaccineExpiration: false,
          });
        }

        const currentGroup = groupsMap.get(key)!;
        currentGroup.events.push(ev);

        // Si es una vacuna con fecha límite de vencimiento en ese mes
        if (ev.entityType === 'VACCINE') {
          currentGroup.hasVaccineExpiration = true;
        }
      } catch (err) {
        console.warn('Error agrupando evento por mes:', ev.date, err);
      }
    });

    // Ordenar los meses cronológicamente
    const sortedKeys = Array.from(groupsMap.keys()).sort();
    const groups: MonthGroup[] = sortedKeys.map((key) => {
      const g = groupsMap.get(key)!;
      // Ordenar eventos dentro del mes por fecha ascendente
      g.events.sort((a, b) => a.date.localeCompare(b.date));
      return {
        key,
        label: g.label,
        events: g.events,
        hasVaccineExpiration: g.hasVaccineExpiration,
      };
    });

    return groups;
  }, [events]);

  const isEmpty = !loading && events.length === 0;

  return (
    <View className="flex-1 bg-[#FAF6F3]">
      {/* Header Rosa Superior que va sobre el resto de la página */}
      <View
        className="bg-[#E87A8E] rounded-b-[40px] shadow-sm z-10"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <SafeAreaView edges={['top']}>
          <View className="pt-3 pb-6">
            <View className="px-5">
              <Text className="text-3xl font-extrabold text-white">Eventos</Text>
              <Text className="text-sm mt-1 mb-2 text-white/90">
                Vacunas, turnos, tratamientos y vencimientos
              </Text>
            </View>

            {/* Barra de filtros (Mascotas y Tipos de Entidad) */}
            <CalendarFilterPills
              pets={pets}
              selectedPetId={selectedPetId}
              onSelectPet={setSelectedPetId}
              selectedEntityType={selectedEntityType}
              onSelectEntityType={setSelectedEntityType}
            />
          </View>
        </SafeAreaView>
      </View>

      {/* Contenido principal */}
      <ScrollView
        className="flex-1 bg-[#FAF6F3]"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#E87A8E"
            colors={['#E87A8E']}
          />
        }
      >
        {loading && !refreshing ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="large" color="#DE6B80" />
            <Text className="text-sm text-[#8C7B77] mt-3">
              Cargando eventos...
            </Text>
          </View>
        ) : error ? (
          <View className="py-16 items-center px-4">
            <Ionicons name="alert-circle-outline" size={40} color="#E02424" />
            <Text className="text-base font-semibold text-[#2B1D1D] mt-2 text-center">
              {error}
            </Text>
            <Pressable
              onPress={loadEvents}
              className="mt-4 rounded-full bg-[#DE6B80] px-6 py-2.5 active:opacity-80"
            >
              <Text className="text-sm font-bold text-white">Reintentar</Text>
            </Pressable>
          </View>
        ) : isEmpty ? (
          <View className="py-20 items-center px-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-[#FCEBED] mb-4">
              <Ionicons name="calendar-outline" size={38} color="#DE6B80" />
            </View>
            <Text className="text-lg font-bold text-[#2B1D1D] text-center">
              Sin eventos programados
            </Text>
            <Text className="text-sm text-[#8C7B77] text-center mt-1.5 leading-5">
              No hay turnos veterinarios, tratamientos ni vencimientos para el filtro seleccionado.
            </Text>
          </View>
        ) : (
          <>
            {/* Sección 1: Vencidas (Colapsada por defecto, solo visible si hay vacunas vencidas) */}
            {expiredEvents.length > 0 && (
              <View className="mb-7 rounded-2xl border border-[#FDE8E8] bg-[#FFF5F5] overflow-hidden shadow-xs">
                <Pressable
                  onPress={() => setIsExpiredExpanded(!isExpiredExpanded)}
                  className="flex-row items-center justify-between p-4 active:opacity-75"
                >
                  <View className="flex-row items-center gap-2.5">
                    <Ionicons name="alert-circle-outline" size={20} color="#E02424" />
                    <Text className="text-sm font-bold text-[#991B1B]">
                      Vencidas ({expiredEvents.length})
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-xs font-semibold text-[#DC2626]">
                      {isExpiredExpanded ? 'Ocultar' : 'Ver'}
                    </Text>
                    <Ionicons
                      name={isExpiredExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#DC2626"
                    />
                  </View>
                </Pressable>

                {isExpiredExpanded && (
                  <View className="px-4 pb-3 pt-1">
                    {expiredEvents.map((event) => (
                      <CalendarEventCard key={event.id} event={event} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Sección 2: Hoy */}
            {todayEvents.length > 0 && (
              <View className="mb-7">
                <View className="flex-row items-center gap-2 mb-3">
                  <View className="h-2.5 w-2.5 rounded-full bg-[#DE6B80]" />
                  <Text className="text-lg font-bold text-[#2B1D1D]">Hoy</Text>
                </View>
                {todayEvents.map((event) => (
                  <CalendarEventCard key={event.id} event={event} />
                ))}
              </View>
            )}

            {/* Sección 3: Por Mes (sin los eventos de hoy ni los vencidos) */}
            {monthGroups.map((group) => (
              <View key={group.key} className="mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-bold text-[#2B1D1D]">
                    {group.label}
                  </Text>

                  {/* Badge de advertencia de vencimiento en el mes */}
                  {group.hasVaccineExpiration && (
                    <View className="flex-row items-center gap-1.5 rounded-full bg-[#FDE8E8] px-2.5 py-1 border border-[#f0c0c0]">
                      <Ionicons name="warning-outline" size={13} color="#DE6B80" />
                      <Text className="text-xs font-bold text-[#DE6B80]">
                        Vencimiento
                      </Text>
                    </View>
                  )}
                </View>

                {group.events.map((event) => (
                  <CalendarEventCard key={event.id} event={event} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
