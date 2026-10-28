import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Appointment } from '../../types/appointment';
import { formatTimeDisplay, isoToDisplay, todayIso } from '../../utils/dates';

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit?: (appointment: Appointment) => void;
  onDelete?: (appointment: Appointment) => void;
}

export default function AppointmentCard({
  appointment,
  onEdit,
  onDelete,
}: AppointmentCardProps) {
  const [expanded, setExpanded] = useState(false);

  const today = todayIso();
  const appointmentDate = appointment.date;

  const isPast = appointmentDate < today;
  const deleteActionLabel = isPast ? 'Eliminar turno' : 'Cancelar turno';

  let statusLabel = 'Próximo';
  let statusBadgeStyle = { bg: 'bg-[#FCECEF]', text: 'text-[#B8324E]' };

  if (appointmentDate < today) {
    statusLabel = 'Realizado';
    statusBadgeStyle = { bg: 'bg-[#E6F7EC]', text: 'text-[#2E7D32]' };
  } else if (appointmentDate === today) {
    statusLabel = 'Hoy';
    statusBadgeStyle = { bg: 'bg-[#FEF0E2]', text: 'text-[#C16A10]' };
  }

  const formattedDate = isoToDisplay(appointment.date);
  const formattedTime = formatTimeDisplay(appointment.time);

  const address = appointment.address;
  const addressDetails = address
    ? `${address.street} ${address.number}${
        address.floor ? ` ${address.floor}°` : ''
      }${address.apartment ? ` ${address.apartment}` : ''}, ${address.cityName}`
    : null;

  return (
    <View
      className="mb-3 overflow-hidden rounded-2xl border border-[#E8DDD7] bg-white p-4"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
      }}
    >
      <Pressable onPress={() => setExpanded((v) => !v)} className="active:opacity-90">
        {/* Fila superior: Fecha/Hora y Badge de Estado */}
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#FCECEF]">
                <Ionicons name="calendar-outline" size={16} color="#DE6B80" />
              </View>
              <View>
                <Text className="text-base font-bold text-[#2B1D1D]">
                  {formattedDate} · {formattedTime}
                </Text>
                <Text className="text-xs font-medium text-[#8C7B77]">
                  {appointment.veterinarian}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row items-center gap-1.5 shrink-0">
            <View className={`rounded-full px-2.5 py-1 ${statusBadgeStyle.bg}`}>
              <Text className={`text-xs font-bold ${statusBadgeStyle.text}`}>
                {statusLabel}
              </Text>
            </View>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color="#8C7B77"
            />
          </View>
        </View>

        {/* Motivo de la consulta / Descripción */}
        <View className="mt-3">
          <Text className="text-sm font-semibold text-[#2B1D1D]">
            {appointment.description}
          </Text>
        </View>

        {/* Domicilio de atención */}
        <View className="mt-2.5 flex-row items-start gap-1.5">
          <Ionicons
            name={address ? 'location-outline' : 'videocam-outline'}
            size={14}
            color="#8C7B77"
            style={{ marginTop: 2 }}
          />
          <View className="flex-1">
            {address ? (
              <>
                <Text className="text-xs font-bold text-[#4A3B37]" numberOfLines={1}>
                  {address.referenceName}
                </Text>
                <Text className="text-[11px] font-medium text-[#8C7B77]" numberOfLines={1}>
                  {addressDetails} ({address.provinceName})
                </Text>
              </>
            ) : (
              <Text className="text-xs font-medium text-[#8C7B77]">
                Sin ubicación física asignada (Consulta / Virtual)
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* Acciones desplegables (Modificar y Cancelar) */}
      {expanded && (onEdit || onDelete) && (
        <View className="mt-4 flex-row gap-2 border-t border-[#F0E4DF] pt-3">
          {onEdit && (
            <ActionButton
              icon="create-outline"
              label="Modificar"
              onPress={() => onEdit(appointment)}
            />
          )}
          {onDelete && (
            <ActionButton
              icon="trash-outline"
              label={deleteActionLabel}
              onPress={() => onDelete(appointment)}
              danger
            />
          )}
        </View>
      )}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: 'create-outline' | 'trash-outline';
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-[20px] p-2.5 active:opacity-75 ${
        danger ? 'bg-[#FCEAEA]' : 'bg-[#FDF5F0]'
      }`}
    >
      <Ionicons name={icon} size={14} color={danger ? '#B92020' : '#D9627A'} />
      <Text
        className={`text-xs font-bold ${danger ? 'text-[#B92020]' : 'text-[#D9627A]'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}