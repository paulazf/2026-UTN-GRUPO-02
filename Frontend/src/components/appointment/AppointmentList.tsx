import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appointment } from '../../types/appointment';
import {
  deleteAppointment,
  fetchAppointments,
} from '../../services/appointmentService';
import { todayIso } from '../../utils/dates';
import AppointmentCard from './AppointmentCard';
import CreateAppointmentModal from './CreateAppointmentModal';

interface AppointmentListProps {
  petId: number;
}

export default function AppointmentList({ petId }: AppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Estados de desplegables
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showPast, setShowPast] = useState(true);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAppointments(petId);
      setAppointments(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los turnos de la mascota.');
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleOpenCreate = () => {
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleSaved = (saved: Appointment) => {
    setAppointments((prev) => {
      const savedId = saved.idAppointment || saved.id;
      const exists = prev.some((item) => (item.idAppointment || item.id) === savedId);
      if (exists) {
        return prev.map((item) => ((item.idAppointment || item.id) === savedId ? saved : item));
      }
      return [saved, ...prev];
    });
  };

  const handleDelete = (appointment: Appointment) => {
    const appointmentId = appointment.idAppointment || appointment.id!;
    const isPast = appointment.date < todayIso();
    const alertTitle = isPast ? 'Eliminar turno' : 'Cancelar turno';
    const alertMessage = isPast
      ? `¿Estás seguro de que querés eliminar el registro del turno con ${appointment.veterinarian}?`
      : `¿Estás seguro de que querés cancelar el turno programado con ${appointment.veterinarian}?`;
    const confirmButtonText = isPast ? 'Eliminar' : 'Cancelar turno';

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: 'Volver', style: 'cancel' },
        {
          text: confirmButtonText,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointmentId);
              setAppointments((prev) =>
                prev.filter((item) => (item.idAppointment || item.id) !== appointmentId)
              );
            } catch (err: any) {
              Alert.alert(
                isPast ? 'Error al eliminar' : 'Error al cancelar',
                err?.message || 'No se pudo completar la operación. Intenta nuevamente.'
              );
            }
          },
        },
      ]
    );
  };

  // Separar en Próximos (hoy y futuros) y Pasados
  const today = todayIso();

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
      });
  }, [appointments, today]);

  const pastAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date < today)
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
      });
  }, [appointments, today]);

  const countText = `${appointments.length} ${
    appointments.length === 1 ? 'turno agendado' : 'turnos agendados'
  }`;

  return (
    <View className="flex-1">
      {/* Cabecera: Contador y Botón "+ Agendar" */}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#2B1D1D]">{countText}</Text>

        <Pressable
          onPress={handleOpenCreate}
          className="rounded-full bg-[#D9627A] px-4 py-2 shadow-xs active:opacity-85"
        >
          <Text className="text-xs font-bold text-white">+ Agendar</Text>
        </Pressable>
      </View>

      {/* Estados: Loading, Error, Vacío o Lista */}
      {loading ? (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color="#DE6B80" />
          <Text className="mt-3 text-xs text-[#8C7B77]">Cargando turnos...</Text>
        </View>
      ) : error ? (
        <View className="items-center rounded-2xl border border-red-200 bg-red-50 p-6">
          <Text className="mb-3 text-center text-sm font-semibold text-red-600">
            {error}
          </Text>
          <Pressable
            onPress={loadAppointments}
            className="rounded-xl bg-[#FCECEF] px-4 py-2 active:opacity-80"
          >
            <Text className="text-xs font-bold text-[#DE6B80]">Reintentar</Text>
          </Pressable>
        </View>
      ) : appointments.length === 0 ? (
        <Pressable
          onPress={handleOpenCreate}
          className="items-center rounded-3xl border-2 border-dashed border-[#D9627A] bg-[#FDF0F3] p-8 active:opacity-75"
        >
          <Ionicons name="calendar-outline" size={28} color="#D9627A" />
          <Text className="mt-2 text-sm font-extrabold text-[#D9627A]">
            Todavía no hay turnos agendados
          </Text>
          <Text className="mt-1 text-center text-xs font-medium text-[#A07878]">
            Tocá acá para agendar la primera consulta médica.
          </Text>
        </Pressable>
      ) : (
        <View className="gap-4">
          {/* SECCIÓN 1: PRÓXIMOS TURNOS (ENCIMA) */}
          <SectionContainer
            title="Próximos turnos"
            count={upcomingAppointments.length}
            icon="calendar"
            iconColor="#DE6B80"
            iconBg="#FCECEF"
            expanded={showUpcoming}
            onToggle={() => setShowUpcoming((prev) => !prev)}
          >
            {upcomingAppointments.length === 0 ? (
              <View className="mb-3 rounded-2xl border border-dashed border-[#DACDC6] bg-white/70 p-4">
                <Text className="text-center text-xs font-medium text-[#8C7B77]">
                  No tenés turnos programados próximos.
                </Text>
              </View>
            ) : (
              upcomingAppointments.map((item) => (
                <AppointmentCard
                  key={item.idAppointment || item.id}
                  appointment={item}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </SectionContainer>

          {/* SECCIÓN 2: TURNOS PASADOS / ANTERIORES */}
          <SectionContainer
            title="Turnos anteriores"
            count={pastAppointments.length}
            icon="time-outline"
            iconColor="#8C7B77"
            iconBg="#EAE2DC"
            expanded={showPast}
            onToggle={() => setShowPast((prev) => !prev)}
          >
            {pastAppointments.length === 0 ? (
              <View className="mb-3 rounded-2xl border border-dashed border-[#DACDC6] bg-white/70 p-4">
                <Text className="text-center text-xs font-medium text-[#8C7B77]">
                  No hay registros de turnos anteriores.
                </Text>
              </View>
            ) : (
              pastAppointments.map((item) => (
                <AppointmentCard
                  key={item.idAppointment || item.id}
                  appointment={item}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </SectionContainer>
        </View>
      )}

      {/* Modal para agendar o editar turno */}
      <CreateAppointmentModal
        visible={isModalOpen}
        petId={petId}
        appointmentToEdit={editingAppointment}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAppointment(null);
        }}
        onSaved={handleSaved}
      />
    </View>
  );
}

interface SectionContainerProps {
  title: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function SectionContainer({
  title,
  count,
  icon,
  iconColor,
  iconBg,
  expanded,
  onToggle,
  children,
}: SectionContainerProps) {
  return (
    <View className="overflow-hidden rounded-[26px] border border-[#E8DDD7] bg-[#F7F1EC] shadow-2xs">
      {/* Cabecera / Barra clickeable */}
      <Pressable
        onPress={onToggle}
        className={`flex-row items-center justify-between px-4 py-3.5 bg-white/80 active:opacity-80 ${
          expanded ? 'border-b border-[#E8DDD7]' : ''
        }`}
      >
        <View className="flex-row items-center gap-2.5">
          <View
            className="h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: iconBg }}
          >
            <Ionicons name={icon} size={16} color={iconColor} />
          </View>
          <Text className="text-sm font-bold text-[#2B1D1D]">{title}</Text>
          <View className="rounded-full bg-white px-2.5 py-0.5 border border-[#E8DDD7]">
            <Text className="text-xs font-bold text-[#8C7B77]">{count}</Text>
          </View>
        </View>

        <View className="h-7 w-7 items-center justify-center rounded-full bg-white border border-[#E8DDD7]">
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
            color="#8C7B77"
          />
        </View>
      </Pressable>

      {/* Contenido contenido dentro del marco del contenedor */}
      {expanded && <View className="p-3 pb-0">{children}</View>}
    </View>
  );
}