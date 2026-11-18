import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { brand } from '../theme/brand';
import {
  CHANNELS,
  REMINDER_SOURCES,
  ensurePermission,
  getPermissionState,
  getPrefs,
  getUpcomingReminders,
  isGroupEnabled,
  sendTestNotification,
  setGroupEnabled,
  syncReminders,
} from '../notifications';
import type { PermissionState, ReminderGroup, UpcomingReminder } from '../notifications';

const GROUP_ICONS: Record<ReminderGroup, keyof typeof Ionicons.glyphMap> = {
  medication: 'medkit-outline',
};

const UPCOMING_SHOWN = 5;

function formatWhen(date: Date | null): string {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (sameDay(date, today)) return `Hoy ${time}`;
  if (sameDay(date, tomorrow)) return `Mañana ${time}`;
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${time}`;
}

/**
 * Perfil > Notificaciones (TDD-0047).
 * Los interruptores salen de REMINDER_SOURCES: un grupo nuevo aparece acá solo.
 */
export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [prefs, setPrefs] = useState<Partial<Record<ReminderGroup, boolean>>>({});
  const [upcoming, setUpcoming] = useState<UpcomingReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [perm, savedPrefs, list] = await Promise.all([
      getPermissionState(),
      getPrefs(),
      getUpcomingReminders(),
    ]);
    setPermission(perm);
    setPrefs(savedPrefs);
    setUpcoming(list.filter((r) => r.group !== 'test'));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    // Al volver de los Ajustes del teléfono, refresca el estado del permiso.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncReminders().then(load);
    });
    return () => sub.remove();
  }, [load]);

  const handlePermission = async () => {
    if (permission === 'denied') {
      Linking.openSettings();
      return;
    }
    const granted = await ensurePermission();
    if (granted) await syncReminders();
    load();
  };

  const handleToggle = async (group: ReminderGroup, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [group]: value }));
    await setGroupEnabled(group, value);
    await syncReminders([group]);
    load();
  };

  const handleTest = async () => {
    const granted = await ensurePermission();
    if (!granted) {
      Alert.alert(
        'Notificaciones desactivadas',
        'Activá las notificaciones de PetLife en los Ajustes del teléfono para recibir avisos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    await sendTestNotification(5);
    Alert.alert('Aviso de prueba', 'En 5 segundos te llega una notificación. Podés bloquear el teléfono para verla.');
  };

  const permissionCopy: Record<PermissionState, { title: string; subtitle: string; action?: string }> = {
    granted: { title: 'Activadas', subtitle: 'PetLife puede avisarte en este teléfono.' },
    undetermined: {
      title: 'Sin activar',
      subtitle: 'Activalas para recibir los avisos de cada toma.',
      action: 'Activar',
    },
    denied: {
      title: 'Desactivadas en el teléfono',
      subtitle: 'Las apagaste desde los Ajustes. Volvé a activarlas ahí.',
      action: 'Abrir Ajustes',
    },
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF5F3]" edges={['top']}>
      <View className="flex-row items-center px-6 pt-6 pb-2">
        <TouchableOpacity
          className="w-10 h-10 bg-white rounded-full justify-center items-center shadow-sm"
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={20} color={brand.accent} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[18px] font-bold text-[#2D3748] mr-10">
          Notificaciones
        </Text>
      </View>

      {loading || !permission ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={brand.accent} />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pt-6" contentContainerClassName="pb-12">
          {/* Permiso del teléfono */}
          <Text className="text-[12px] font-bold text-[#A0AEC0] mb-4 ml-2 tracking-widest uppercase">
            En este teléfono
          </Text>
          <View className="flex-row items-center bg-white p-4 rounded-3xl mb-8 shadow-sm border border-slate-50">
            <View
              className={`w-10 h-10 rounded-full justify-center items-center mr-4 ${
                permission === 'granted' ? 'bg-[#E6F7EC]' : 'bg-brand-tint'
              }`}
            >
              <Ionicons
                name={permission === 'granted' ? 'notifications' : 'notifications-off-outline'}
                size={20}
                color={permission === 'granted' ? '#2E7D32' : brand.accent}
              />
            </View>
            <View className="flex-1">
              <Text className="text-[#2D3748] text-[16px] font-semibold">
                {permissionCopy[permission].title}
              </Text>
              <Text className="text-[12px] text-[#8C7B77] mt-0.5 leading-4">
                {permissionCopy[permission].subtitle}
              </Text>
            </View>
            {permissionCopy[permission].action && (
              <TouchableOpacity onPress={handlePermission} className="ml-2 rounded-full bg-brand px-3 py-2">
                <Text className="text-xs font-bold text-white">{permissionCopy[permission].action}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Un interruptor por tipo de aviso */}
          <Text className="text-[12px] font-bold text-[#A0AEC0] mb-4 ml-2 tracking-widest uppercase">
            Avisos
          </Text>
          {REMINDER_SOURCES.map(({ group }) => {
            const enabled = isGroupEnabled(prefs, group);
            return (
              <View
                key={group}
                className="flex-row items-center bg-white p-4 rounded-3xl mb-3 shadow-sm border border-slate-50"
              >
                <View className="w-10 h-10 bg-brand-tint rounded-full justify-center items-center mr-4">
                  <Ionicons name={GROUP_ICONS[group]} size={20} color={brand.accent} />
                </View>
                <View className="flex-1 pr-2">
                  <Text className="text-[#2D3748] text-[16px] font-semibold">{CHANNELS[group].name}</Text>
                  <Text className="text-[12px] text-[#8C7B77] mt-0.5 leading-4">
                    {CHANNELS[group].description}
                  </Text>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={(value) => handleToggle(group, value)}
                  trackColor={{ false: '#E5E5EA', true: brand.accent }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#E5E5EA"
                  accessibilityLabel={`Avisos de ${CHANNELS[group].name}`}
                />
              </View>
            );
          })}

          {/* Próximos avisos programados */}
          <Text className="text-[12px] font-bold text-[#A0AEC0] mt-5 mb-4 ml-2 tracking-widest uppercase">
            Próximos avisos
          </Text>
          <View className="bg-white rounded-3xl mb-6 shadow-sm border border-slate-50 px-4 py-2">
            {upcoming.length === 0 ? (
              <Text className="py-3 text-[13px] text-[#8C7B77]">
                No hay avisos programados. Aparecen al cargar un tratamiento en curso.
              </Text>
            ) : (
              upcoming.slice(0, UPCOMING_SHOWN).map((r, i) => (
                <View
                  key={r.id}
                  className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-[#F0E4DF]' : ''}`}
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-[14px] font-semibold text-[#2D3748]" numberOfLines={1}>
                      {r.title}
                    </Text>
                    <Text className="text-[12px] text-[#8C7B77] mt-0.5" numberOfLines={1}>
                      {r.body}
                    </Text>
                  </View>
                  <Text className="text-[12px] font-bold text-brand">{formatWhen(r.date)}</Text>
                </View>
              ))
            )}
            {upcoming.length > UPCOMING_SHOWN && (
              <Text className="pb-3 text-[12px] text-[#A0AEC0]">
                y {upcoming.length - UPCOMING_SHOWN} más
              </Text>
            )}
          </View>

          <TouchableOpacity
            onPress={handleTest}
            className="flex-row items-center justify-center rounded-3xl border border-dashed border-[#E0D3CD] bg-white py-4"
          >
            <Ionicons name="paper-plane-outline" size={18} color={brand.accent} />
            <Text className="ml-2 text-[15px] font-bold text-brand">Enviar aviso de prueba</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
