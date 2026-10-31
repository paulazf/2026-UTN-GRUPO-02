import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { CalendarEvent } from '../../types/calendar';

interface CalendarEventCardProps {
  event: CalendarEvent;
}

interface EntityStyle {
  iconFamily: 'Ionicons' | 'MaterialCommunityIcons';
  icon: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
}

function getEntityStyle(event: CalendarEvent): EntityStyle {
  switch (event.entityType) {
    case 'VACCINE':
      return {
        iconFamily: 'MaterialCommunityIcons',
        icon: 'needle',
        accentColor: '#7B61C9', // Violeta del perfil de la mascota
        badgeBg: '#F3E8FF',
        badgeText: '#7B61C9',
        iconBg: '#EFEAFB',
      };
    case 'APPOINTMENT':
      return {
        iconFamily: 'Ionicons',
        icon: 'calendar-outline',
        accentColor: '#F59E0B', // Ámbar / Naranja
        badgeBg: '#FFFBEB',
        badgeText: '#B45309',
        iconBg: '#FDF2E9',
      };
    case 'MEDICATION':
    default:
      return {
        iconFamily: 'Ionicons',
        icon: 'medkit-outline',
        accentColor: '#4A9BD4', // Coral / Rosa del perfil
        badgeBg: '#E8F0FA',
        badgeText: '#4A9BD4',
        iconBg: '#E8F0FA',
      };
  }
}

function formatDateDDMMAAAA(dateString: string): string {
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export default function CalendarEventCard({ event }: CalendarEventCardProps) {
  const style = getEntityStyle(event);

  // Regla de indicador derecho:
  // - En los próximos 10 días (1 a 10 días): se muestran los días que faltan (ej. 3d, 10d).
  // - Si es hoy (0 días): se muestra el badge "Hoy".
  // - Si son más de 10 días o está vencida: no se muestra nada a la derecha (evitar redundancia).
  const showCountdown = event.daysRemaining > 0 && event.daysRemaining <= 10;
  const isToday = event.daysRemaining === 0 && !event.isExpired;

  return (
    <View className="mb-3 flex-row items-center justify-between rounded-3xl border border-[#F5ECE8] bg-white p-3.5 shadow-sm">
      <View className="flex-row items-center gap-3.5 flex-1 mr-2">
        <View
          className="h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: style.iconBg }}
        >
          {style.iconFamily === 'MaterialCommunityIcons' ? (
            <MaterialCommunityIcons name={style.icon as any} size={22} color={style.accentColor} />
          ) : (
            <Ionicons name={style.icon as any} size={22} color={style.accentColor} />
          )}
        </View>

        <View className="flex-1">
          <Text className="text-sm font-bold text-[#2B1D1D]" numberOfLines={1}>
            {event.title}
          </Text>
          {event.subtitle ? (
            <Text className="text-xs text-[#8C7B77] mt-0.5" numberOfLines={1}>
              {event.subtitle}
            </Text>
          ) : null}
          <Text className="text-[11px] text-[#A89B98] mt-0.5">
            {formatDateDDMMAAAA(event.date)}
          </Text>
        </View>
      </View>

      {showCountdown ? (
        <View
          className="rounded-full px-3 py-1 items-center justify-center"
          style={{ backgroundColor: style.badgeBg }}
        >
          <Text
            className="text-xs font-bold"
            style={{ color: style.badgeText }}
          >
            {`${event.daysRemaining}d`}
          </Text>
        </View>
      ) : isToday ? (
        <View
          className="rounded-full px-3 py-1 items-center justify-center bg-[#FDF2F4]"
        >
          <Text className="text-xs font-bold text-[#DE6B80]">
            Hoy
          </Text>
        </View>
      ) : null}
    </View>
  );
}
