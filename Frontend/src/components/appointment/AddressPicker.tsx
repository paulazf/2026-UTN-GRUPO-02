import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Address, NewAddressPayload } from '../../types/address';
import { City, Province } from '../../types/geo';
import { fetchCities, fetchProvinces } from '../../services/geoService';
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from '../../services/addressService';

interface AddressPickerProps {
  isManaging: boolean;
  onOpenManage: () => void;
  onCloseManage: () => void;
  addresses: Address[];
  loadingAddresses: boolean;
  selectedAddressId: number | null;
  onSelectAddress: (addressId: number | null) => void;
  onAddressCreated: (created: Address) => void;
  onAddressUpdated: (updated: Address) => void;
  onAddressDeleted: (deletedId: number) => void;
}

type InnerView = 'LIST' | 'FORM' | 'PROVINCES' | 'CITIES';

export default function AddressPicker({
  isManaging,
  onOpenManage,
  onCloseManage,
  addresses,
  loadingAddresses,
  selectedAddressId,
  onSelectAddress,
  onAddressCreated,
  onAddressUpdated,
  onAddressDeleted,
}: AddressPickerProps) {
  const [innerView, setInnerView] = useState<InnerView>('LIST');

  // Búsqueda en lista de domicilios
  const [addressSearch, setAddressSearch] = useState('');

  // Formulario alta/edición
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<NewAddressPayload>({
    referenceName: '',
    idCity: 0,
    street: '',
    number: '',
    floor: null,
    apartment: '',
  });

  // Catálogo Geo
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [provinceSearch, setProvinceSearch] = useState('');

  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  // Cargar provincias
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingProvinces(true);
        const data = await fetchProvinces();
        if (mounted) setProvinces(data);
      } catch (err) {
        console.warn('Error loading provinces:', err);
      } finally {
        if (mounted) setLoadingProvinces(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Cargar localidades cuando cambia la provincia
  useEffect(() => {
    if (!selectedProvinceId) {
      setCities([]);
      return;
    }
    let mounted = true;
    (async () => {
      try {
        setLoadingCities(true);
        const data = await fetchCities(selectedProvinceId);
        if (mounted) setCities(data);
      } catch (err) {
        console.warn('Error loading cities:', err);
      } finally {
        if (mounted) setLoadingCities(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedProvinceId]);

  // Domicilio seleccionado actualmente
  const currentSelectedAddress = useMemo(
    () => addresses.find((a) => a.idAddress === selectedAddressId) || null,
    [addresses, selectedAddressId]
  );

  const selectedProvince = useMemo(
    () => provinces.find((p) => p.idProvince === selectedProvinceId),
    [provinces, selectedProvinceId]
  );

  const selectedCity = useMemo(
    () => cities.find((c) => c.idCity === formData.idCity),
    [cities, formData.idCity]
  );

  // Filtros
  const filteredAddresses = useMemo(() => {
    const q = addressSearch.toLowerCase().trim();
    if (!q) return addresses;
    return addresses.filter(
      (a) =>
        a.referenceName.toLowerCase().includes(q) ||
        a.street.toLowerCase().includes(q) ||
        a.cityName.toLowerCase().includes(q) ||
        a.provinceName.toLowerCase().includes(q)
    );
  }, [addresses, addressSearch]);

  const filteredProvinces = useMemo(() => {
    const q = provinceSearch.toLowerCase().trim();
    if (!q) return provinces;
    return provinces.filter((p) => p.name.toLowerCase().includes(q));
  }, [provinces, provinceSearch]);

  const filteredCities = useMemo(() => {
    const q = citySearch.toLowerCase().trim();
    if (!q) return cities;
    return cities.filter((c) => c.name.toLowerCase().includes(q));
  }, [cities, citySearch]);

  // Handlers
  const handleSelectAndReturn = (id: number | null) => {
    onSelectAddress(id);
    onCloseManage();
  };

  const handleStartCreate = () => {
    setEditingAddress(null);
    setSelectedProvinceId(null);
    setFormData({
      referenceName: '',
      idCity: 0,
      street: '',
      number: '',
      floor: null,
      apartment: '',
    });
    setInnerView('FORM');
  };

  const handleStartEdit = (addr: Address) => {
    setEditingAddress(addr);
    setSelectedProvinceId(addr.idProvince || null);
    setFormData({
      referenceName: addr.referenceName,
      idCity: addr.idCity,
      street: addr.street,
      number: addr.number,
      floor: addr.floor !== undefined ? addr.floor : null,
      apartment: addr.apartment || '',
    });
    setInnerView('FORM');
  };

  const validateForm = (): boolean => {
    if (!formData.referenceName.trim()) {
      Alert.alert('Campo requerido', 'Ingresá un nombre de referencia (ej. Veterinaria San Roque).');
      return false;
    }
    if (!formData.idCity || formData.idCity <= 0) {
      Alert.alert('Campo requerido', 'Seleccioná una localidad del catálogo.');
      return false;
    }
    if (!formData.street.trim()) {
      Alert.alert('Campo requerido', 'Ingresá el nombre de la calle.');
      return false;
    }
    if (!formData.number.trim()) {
      Alert.alert('Campo requerido', 'Ingresá el número de la dirección.');
      return false;
    }
    return true;
  };

  const handleSaveForm = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      if (editingAddress) {
        const updated = await updateAddress(editingAddress.idAddress, formData);
        onAddressUpdated(updated);
        Alert.alert('Domicilio actualizado', 'El domicilio se modificó correctamente.');
      } else {
        const created = await createAddress(formData);
        onAddressCreated(created);
        onSelectAddress(created.idAddress);
        Alert.alert('Domicilio guardado', 'El domicilio se registró y quedó seleccionado.');
      }
      setInnerView('LIST');
      setEditingAddress(null);
    } catch (err: any) {
      Alert.alert(
        'Error al guardar',
        err?.message || 'No se pudo guardar el domicilio. Verificá los datos.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = (addr: Address) => {
    Alert.alert(
      'Eliminar domicilio',
      `¿Deseás eliminar "${addr.referenceName}" de tus lugares guardados?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(addr.idAddress);
              onAddressDeleted(addr.idAddress);
              if (selectedAddressId === addr.idAddress) {
                onSelectAddress(null);
              }
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar el domicilio.');
            }
          },
        },
      ]
    );
  };

  // 1. VISTA COMPACTA (cuando se muestra en el formulario del turno)
  if (!isManaging) {
    return (
      <View className="mb-4">
        <Text className="mb-1.5 text-xs font-bold tracking-wider text-[#8C7B77]">
          LUGAR DE ATENCIÓN / DOMICILIO
        </Text>

        <Pressable
          onPress={onOpenManage}
          className="flex-row items-center justify-between rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] p-3.5 active:opacity-80"
        >
          <View className="flex-1 flex-row items-center gap-3 pr-2">
            <View
              className={`h-9 w-9 items-center justify-center rounded-xl ${
                currentSelectedAddress ? 'bg-[#FCECEF]' : 'bg-[#EAE2DC]'
              }`}
            >
              <Ionicons
                name={currentSelectedAddress ? 'business-outline' : 'videocam-outline'}
                size={18}
                color={currentSelectedAddress ? '#DE6B80' : '#8C7B77'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-[#2B1D1D]" numberOfLines={1}>
                {currentSelectedAddress
                  ? currentSelectedAddress.referenceName
                  : 'Sin domicilio presencial'}
              </Text>
              <Text className="text-[11px] font-medium text-[#8C7B77]" numberOfLines={1}>
                {currentSelectedAddress
                  ? `${currentSelectedAddress.street} ${currentSelectedAddress.number} · ${currentSelectedAddress.cityName}`
                  : 'Consulta virtual, a domicilio o a convenir'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1 rounded-full border border-[#F0E4DF] bg-white px-2.5 py-1">
            <Text className="text-xs font-bold text-[#DE6B80]">Cambiar</Text>
            <Ionicons name="chevron-forward" size={13} color="#DE6B80" />
          </View>
        </Pressable>
      </View>
    );
  }

  // 2. VISTA DE GESTIÓN (reemplaza temporalmente el formulario del turno dentro del mismo sheet)
  return (
    <View style={{ flex: 1, minHeight: 440 }}>
      {/* VISTA A: LISTADO DE DOMICILIOS CON BUSCADOR */}
      {innerView === 'LIST' && (
        <View style={{ flex: 1, minHeight: 440 }}>
          <View className="mb-3 flex-row items-center justify-between border-b border-[#F0E4DF]/60 pb-3">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={onCloseManage}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#FAF5F2] active:opacity-70"
              >
                <Ionicons name="arrow-back" size={18} color="#2B1D1D" />
              </Pressable>
              <Text className="text-lg font-bold text-[#2B1D1D]">
                Lugar de atención
              </Text>
            </View>
            <Pressable
              onPress={onCloseManage}
              hitSlop={8}
              className="rounded-full bg-[#FAF5F2] px-3 py-1"
            >
              <Text className="text-xs font-bold text-[#8C7B77]">Listo</Text>
            </Pressable>
          </View>

          {/* Buscador de domicilios */}
          <View className="mb-3 flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3">
            <Ionicons name="search" size={16} color="#8C7B77" />
            <TextInput
              value={addressSearch}
              onChangeText={setAddressSearch}
              placeholder="Buscar por referencia, calle o ciudad..."
              placeholderTextColor="#B5A7A3"
              className="h-10 flex-1 px-2 text-sm text-[#2B1D1D]"
            />
            {!!addressSearch && (
              <Pressable onPress={() => setAddressSearch('')}>
                <Ionicons name="close-circle" size={16} color="#8C7B77" />
              </Pressable>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
            contentContainerClassName="gap-2 pb-8"
          >
            {/* Opción Sin Domicilio / Virtual */}
            <Pressable
              onPress={() => handleSelectAndReturn(null)}
              className={`flex-row items-center justify-between rounded-2xl border p-3.5 active:opacity-80 ${
                selectedAddressId === null
                  ? 'border-[#DE6B80] bg-[#FAF5F2]'
                  : 'border-[#F0E4DF] bg-white'
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`h-8 w-8 items-center justify-center rounded-xl ${
                    selectedAddressId === null ? 'bg-[#FCECEF]' : 'bg-[#FAF5F2]'
                  }`}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={16}
                    color={selectedAddressId === null ? '#DE6B80' : '#8C7B77'}
                  />
                </View>
                <View>
                  <Text className="text-sm font-bold text-[#2B1D1D]">
                    Sin domicilio presencial
                  </Text>
                  <Text className="text-[11px] font-medium text-[#8C7B77]">
                    Consulta virtual, a domicilio o a convenir
                  </Text>
                </View>
              </View>
              {selectedAddressId === null && (
                <Ionicons name="checkmark-circle" size={18} color="#DE6B80" />
              )}
            </Pressable>

            {/* Listado filtrado de domicilios guardados */}
            {loadingAddresses ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#DE6B80" />
              </View>
            ) : (
              filteredAddresses.map((addr) => {
                const isSelected = selectedAddressId === addr.idAddress;
                return (
                  <View
                    key={addr.idAddress}
                    className={`flex-row items-center justify-between rounded-2xl border p-3.5 ${
                      isSelected
                        ? 'border-[#DE6B80] bg-[#FAF5F2]'
                        : 'border-[#F0E4DF] bg-white'
                    }`}
                  >
                    <Pressable
                      onPress={() => handleSelectAndReturn(addr.idAddress)}
                      className="flex-1 pr-2 active:opacity-80"
                    >
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons
                          name="business-outline"
                          size={14}
                          color={isSelected ? '#DE6B80' : '#8C7B77'}
                        />
                        <Text
                          className="text-sm font-bold text-[#2B1D1D]"
                          numberOfLines={1}
                        >
                          {addr.referenceName}
                        </Text>
                      </View>
                      <Text
                        className="mt-0.5 text-xs text-[#8C7B77]"
                        numberOfLines={1}
                      >
                        {addr.street} {addr.number}
                        {addr.floor ? ` ${addr.floor}°` : ''}
                        {addr.apartment ? ` ${addr.apartment}` : ''} ·{' '}
                        {addr.cityName} ({addr.provinceName})
                      </Text>
                    </Pressable>

                    {/* Acciones de la tarjeta */}
                    <View className="flex-row items-center gap-2 pl-1">
                      <Pressable
                        onPress={() => handleStartEdit(addr)}
                        hitSlop={8}
                        className="h-7 w-7 items-center justify-center rounded-full bg-[#FAF5F2] active:opacity-70"
                        accessibilityLabel="Editar este domicilio"
                      >
                        <Ionicons name="create-outline" size={14} color="#8C7B77" />
                      </Pressable>

                      <Pressable
                        onPress={() => handleDeleteAddress(addr)}
                        hitSlop={8}
                        className="h-7 w-7 items-center justify-center rounded-full bg-[#FCEAEA] active:opacity-70"
                        accessibilityLabel="Eliminar este domicilio"
                      >
                        <Ionicons name="trash-outline" size={14} color="#B92020" />
                      </Pressable>

                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#DE6B80"
                        />
                      )}
                    </View>
                  </View>
                );
              })
            )}

            {/* Botón "+ Registrar nuevo domicilio" */}
            <Pressable
              onPress={handleStartCreate}
              className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-[#DE6B80] bg-[#FAF5F2] py-3.5 active:opacity-80"
            >
              <Ionicons name="add-circle-outline" size={16} color="#DE6B80" />
              <Text className="text-xs font-bold text-[#DE6B80]">
                + Registrar nuevo lugar / domicilio
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* VISTA B: FORMULARIO DE ALTA O EDICIÓN */}
      {innerView === 'FORM' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-6"
        >
          <View className="mb-4 flex-row items-center justify-between border-b border-[#F0E4DF]/60 pb-3">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setInnerView('LIST')}
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#FAF5F2]"
              >
                <Ionicons name="arrow-back" size={18} color="#2B1D1D" />
              </Pressable>
              <Text className="text-base font-bold text-[#2B1D1D]">
                {editingAddress ? 'Modificar domicilio' : 'Nuevo domicilio'}
              </Text>
            </View>
          </View>

          {/* Nombre de referencia */}
          <View className="mb-3">
            <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">
              NOMBRE DE REFERENCIA *
            </Text>
            <TextInput
              value={formData.referenceName}
              onChangeText={(val) =>
                setFormData((prev) => ({ ...prev, referenceName: val }))
              }
              placeholder="ej. Veterinaria San Roque, Clínica Central..."
              placeholderTextColor="#B5A7A3"
              className="h-[46px] rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3.5 text-sm text-[#2B1D1D]"
            />
          </View>

          {/* Selector de Provincia */}
          <View className="mb-3">
            <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">
              PROVINCIA *
            </Text>
            <Pressable
              onPress={() => {
                setProvinceSearch('');
                setInnerView('PROVINCES');
              }}
              className="h-[46px] flex-row items-center justify-between rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3.5 active:opacity-80"
            >
              <Text
                className={`text-sm ${
                  selectedProvince
                    ? 'font-medium text-[#2B1D1D]'
                    : 'text-[#B5A7A3]'
                }`}
              >
                {selectedProvince ? selectedProvince.name : 'Seleccionar provincia...'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#8C7B77" />
            </Pressable>
          </View>

          {/* Selector de Localidad */}
          <View className="mb-3">
            <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">
              LOCALIDAD / CIUDAD *
            </Text>
            <Pressable
              onPress={() => {
                if (selectedProvinceId) {
                  setCitySearch('');
                  setInnerView('CITIES');
                }
              }}
              disabled={!selectedProvinceId}
              className={`h-[46px] flex-row items-center justify-between rounded-2xl border border-[#F0E4DF] px-3.5 active:opacity-80 ${
                selectedProvinceId ? 'bg-[#FAF5F2]' : 'bg-[#EFE6E2]/40 opacity-70'
              }`}
            >
              <Text
                className={`text-sm ${
                  selectedCity ? 'font-medium text-[#2B1D1D]' : 'text-[#B5A7A3]'
                }`}
              >
                {!selectedProvinceId
                  ? 'Primero seleccioná una provincia'
                  : loadingCities
                  ? 'Cargando localidades...'
                  : selectedCity
                  ? selectedCity.name
                  : 'Seleccionar localidad...'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#8C7B77" />
            </Pressable>
          </View>

          {/* Calle y Número */}
          <View className="mb-3 flex-row gap-2">
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">CALLE *</Text>
              <TextInput
                value={formData.street}
                onChangeText={(val) =>
                  setFormData((prev) => ({ ...prev, street: val }))
                }
                placeholder="ej. Av. Corrientes"
                placeholderTextColor="#B5A7A3"
                className="h-[46px] rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3.5 text-sm text-[#2B1D1D]"
              />
            </View>

            <View className="w-24">
              <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">NÚMERO *</Text>
              <TextInput
                value={formData.number}
                onChangeText={(val) =>
                  setFormData((prev) => ({ ...prev, number: val }))
                }
                placeholder="1234"
                placeholderTextColor="#B5A7A3"
                keyboardType="numeric"
                className="h-[46px] rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3.5 text-sm text-[#2B1D1D]"
              />
            </View>
          </View>

          {/* Piso y Depto */}
          <View className="mb-4 flex-row gap-2">
            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">
                PISO (OPCIONAL)
              </Text>
              <TextInput
                value={
                  formData.floor !== undefined && formData.floor !== null
                    ? String(formData.floor)
                    : ''
                }
                onChangeText={(val) => {
                  const clean = val.replace(/\D/g, '');
                  setFormData((prev) => ({
                    ...prev,
                    floor: clean ? parseInt(clean, 10) : null,
                  }));
                }}
                placeholder="ej. 3"
                placeholderTextColor="#B5A7A3"
                keyboardType="numeric"
                className="h-[46px] rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3.5 text-sm text-[#2B1D1D]"
              />
            </View>

            <View className="flex-1">
              <Text className="mb-1 text-[11px] font-bold text-[#8C7B77]">
                DEPTO (OPCIONAL)
              </Text>
              <TextInput
                value={formData.apartment || ''}
                onChangeText={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    apartment: val.toUpperCase(),
                  }))
                }
                placeholder="ej. B"
                placeholderTextColor="#B5A7A3"
                maxLength={6}
                className="h-[46px] rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3.5 text-sm text-[#2B1D1D]"
              />
            </View>
          </View>

          {/* Botones de acción */}
          <View className="gap-2">
            <Pressable
              onPress={handleSaveForm}
              disabled={saving}
              className="items-center justify-center rounded-2xl bg-[#D9627A] py-3.5 active:opacity-85"
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-xs font-bold text-white">
                  {editingAddress ? 'Guardar cambios de domicilio' : 'Guardar domicilio'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => setInnerView('LIST')}
              disabled={saving}
              className="items-center justify-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] py-3 active:opacity-75"
            >
              <Text className="text-xs font-semibold text-[#8C7B77]">
                Volver a mis domicilios
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* VISTA C: SELECTOR DE PROVINCIAS */}
      {innerView === 'PROVINCES' && (
        <View className="flex-1">
          <View className="mb-3 flex-row items-center gap-2 border-b border-[#F0E4DF]/60 pb-3">
            <Pressable
              onPress={() => setInnerView('FORM')}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-[#FAF5F2]"
            >
              <Ionicons name="arrow-back" size={18} color="#2B1D1D" />
            </Pressable>
            <Text className="text-base font-bold text-[#2B1D1D]">
              Seleccionar Provincia
            </Text>
          </View>

          <View className="mb-3 flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3">
            <Ionicons name="search" size={16} color="#8C7B77" />
            <TextInput
              value={provinceSearch}
              onChangeText={setProvinceSearch}
              placeholder="Buscar provincia..."
              placeholderTextColor="#B5A7A3"
              className="h-10 flex-1 px-2 text-sm text-[#2B1D1D]"
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-1"
          >
            {loadingProvinces ? (
              <ActivityIndicator color="#DE6B80" className="py-6" />
            ) : (
              filteredProvinces.map((prov) => (
                <Pressable
                  key={prov.idProvince}
                  onPress={() => {
                    setSelectedProvinceId(prov.idProvince);
                    setFormData((prev) => ({ ...prev, idCity: 0 }));
                    setInnerView('FORM');
                  }}
                  className={`flex-row items-center justify-between border-b border-[#F0E4DF]/60 py-3 active:bg-[#FAF5F2] ${
                    selectedProvinceId === prov.idProvince ? 'bg-[#FAF5F2]' : ''
                  }`}
                >
                  <Text className="text-sm font-medium text-[#2B1D1D]">
                    {prov.name}
                  </Text>
                  {selectedProvinceId === prov.idProvince && (
                    <Ionicons name="checkmark" size={18} color="#DE6B80" />
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* VISTA D: SELECTOR DE LOCALIDADES */}
      {innerView === 'CITIES' && (
        <View className="flex-1">
          <View className="mb-3 flex-row items-center gap-2 border-b border-[#F0E4DF]/60 pb-3">
            <Pressable
              onPress={() => setInnerView('FORM')}
              hitSlop={8}
              className="h-8 w-8 items-center justify-center rounded-full bg-[#FAF5F2]"
            >
              <Ionicons name="arrow-back" size={18} color="#2B1D1D" />
            </Pressable>
            <View>
              <Text className="text-base font-bold text-[#2B1D1D]">
                Seleccionar Localidad
              </Text>
              {selectedProvince && (
                <Text className="text-xs text-[#8C7B77]">
                  {selectedProvince.name}
                </Text>
              )}
            </View>
          </View>

          <View className="mb-3 flex-row items-center rounded-2xl border border-[#F0E4DF] bg-[#FAF5F2] px-3">
            <Ionicons name="search" size={16} color="#8C7B77" />
            <TextInput
              value={citySearch}
              onChangeText={setCitySearch}
              placeholder="Buscar localidad..."
              placeholderTextColor="#B5A7A3"
              className="h-10 flex-1 px-2 text-sm text-[#2B1D1D]"
            />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-1"
          >
            {loadingCities ? (
              <ActivityIndicator color="#DE6B80" className="py-6" />
            ) : filteredCities.length === 0 ? (
              <Text className="py-6 text-center text-xs text-[#8C7B77]">
                No se encontraron localidades.
              </Text>
            ) : (
              filteredCities.map((city) => (
                <Pressable
                  key={city.idCity}
                  onPress={() => {
                    setFormData((prev) => ({ ...prev, idCity: city.idCity }));
                    setInnerView('FORM');
                  }}
                  className={`flex-row items-center justify-between border-b border-[#F0E4DF]/60 py-3 active:bg-[#FAF5F2] ${
                    formData.idCity === city.idCity ? 'bg-[#FAF5F2]' : ''
                  }`}
                >
                  <Text className="text-sm font-medium text-[#2B1D1D]">
                    {city.name}
                  </Text>
                  {formData.idCity === city.idCity && (
                    <Ionicons name="checkmark" size={18} color="#DE6B80" />
                  )}
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
