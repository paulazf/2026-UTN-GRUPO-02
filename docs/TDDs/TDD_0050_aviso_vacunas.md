---
id: 0050
estado: Por implementar
autor: Matías Cortés
fecha: 17-11-2026
titulo: Aviso anticipado de vencimiento de vacunas y antiparasitarios
---

# TDD-0050: Aviso anticipado de vencimiento de vacunas y antiparasitarios

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** El dueño registra las vacunas y antiparasitarios (pipetas, pastillas desparasitarias) de sus mascotas, pero frecuentemente olvida las fechas exactas de vencimiento. Esto deja al animal desprotegido o genera demoras innecesarias para coordinar un turno con el veterinario.
- **Resultado esperado:** El teléfono avisa con anticipación (7 días antes del vencimiento a las 09:00 hs) indicando la mascota, el nombre del producto y la fecha límite, tanto en iOS como en Android.
  - Se integra de forma nativa al módulo de notificaciones locales de PetLife (`Frontend/src/notifications/`).
  - No requiere servidor push, Firebase ni certificados de Apple, funcionando tanto en Expo Go como en builds independientes.

### User Persona
- **Dueño / Tutor (`Owner`):** Tiene una o varias mascotas registradas y necesita que la app le avise a tiempo cuándo vence una vacuna o pipeta para llevarla al veterinario o aplicar el refuerzo.

### User Story (Épica: EP06 Calendario)
**Como** dueño de una mascota,  
**quiero** recibir un aviso antes de que venza una vacuna o una pipeta,  
**para** llevarla al veterinario a tiempo.

- **Sprint:** 3 / 4 (Objetivo: Notificaciones). **Épica:** EP06 Calendario. **Prioridad:** Alta. **Estimación:** 3 SP.

---

### Criterios de Aceptación (Gherkin)

**Escenario 1: Aviso anticipado**  
DADO que la Antirrábica de Beto vence el 17/11  
CUANDO llega el 10/11  
ENTONCES el dueño recibe "A Beto le vence la Antirrábica el 17/11"

**Escenario 2: Ya se aplicó el refuerzo**  
DADO que el dueño registró el refuerzo antes del aviso  
CUANDO llega la fecha del aviso  
ENTONCES no recibe nada

**Escenario 3: Mascota dada de baja**  
DADO que Beto fue dado de baja  
CUANDO llega la fecha  
ENTONCES no se envía el aviso

Además:
1. **Anticipación y horario:** El aviso se programa exactamente 7 días antes de la fecha de vencimiento (`expirationDate - 7 días`) a las 09:00 hs de la mañana en la hora local del dispositivo.
2. **Formato del aviso:**
   - Título: `Vacuna de {mascota}` (o `Antiparasitario de {mascota}` según el tipo de producto).
   - Mensaje: `"A {mascota} le vence la {vacuna} el {DD/MM}"`.
3. **Copia vigente (sin refuerzo posterior):** Solo se avisan aplicaciones que no hayan sido renovadas (`hasNewer = false`). Si el dueño ya registró una nueva aplicación posterior del mismo producto para la misma mascota, la aplicación anterior se considera renovada y no emite aviso.
4. **Exclusión de vencidas:** Vacunas cuya fecha de vencimiento ya expiró antes de la fecha actual no generan avisos.
5. **Navegación al tocar el aviso:** Tocar la notificación abre la ficha de la mascota en su pestaña **Vacunas** (`openPetTab(petId, 'VACUNAS')`).
6. **Configuración en Perfil:** El grupo `vaccine` se lista en **Perfil > Notificaciones** con su propio interruptor para activar o desactivar avisos y figura en el listado de próximos avisos.
7. **Sincronización:** Los avisos se recalculan al iniciar sesión, al volver la app a primer plano, y al registrar, modificar o eliminar una aplicación de vacuna/antiparasitario o dar de baja una mascota.

---

### Reglas de Negocio
- Fecha del recordatorio = `expirationDate - 7 días` a las `09:00:00` en la hora local del dispositivo.
- No se programan avisos para fechas que ya pasaron (`reminderDate <= now`).
- Solo se consideran mascotas activas (`isDeleted = false`) pertenecientes al tutor autenticado.
- Límite máximo de avisos pendientes para el grupo `vaccine`: 15 (la suma total con medicación y otros grupos no supera el límite de 60 de iOS).

---

## Dependencias y Estimación

### Dependencias
- **TDD-0028 a TDD-0031:** Entidad `VaccinePet` y catálogo `Vaccine`.
- **TDD-0047:** Módulo de notificaciones locales (`expo-notifications`).

### Estimación
- **Story Points:** 3 SP.
  - Backend: endpoint `GET /api/v1/vaccine-pets/reminders/` y tests (1 SP).
  - Frontend: planner `vaccinePlanner.ts`, tests unitarios, registro de fuentes, canales y eventos de tap (2 SP).

---

## Diseño Técnico (RFC)

### 1. Backend (Django REST Framework)
- **Endpoint:** `GET /api/v1/vaccine-pets/reminders/`
- **Permisos:** `IsAuthenticated`
- **Filtros:**
  - `pet__in = active_pets(request)` (solo mascotas activas del dueño autenticado, excluyendo mascotas dadas de baja).
  - `isDeleted = False` en `VaccinePet`.
  - `expirationDate >= timezone.localdate()` (no vencidas en el pasado).
  - `hasNewer = False` (excluye aplicaciones que ya tienen un refuerzo con fecha de aplicación posterior).
- **Serializador:** `VaccinePetSerializer` (incluye `idVaccinePet`, `idPet`, `petName`, `vaccineName`, `expirationDate`, `vaccineType`).

### 2. Frontend (React Native + Expo)
- **Tipos (`Frontend/src/notifications/types.ts`):** `ReminderGroup = 'medication' | 'vaccine';`
- **Canal Android (`channels.ts`):** Canal `vaccine` con nombre *"Vacunas y antiparasitarios"*.
- **Planner (`planners/vaccinePlanner.ts`):**
  - Función pura `planVaccineReminders(vaccines, now, daysBefore = 7)`.
  - Calcula `date = new Date(year, month - 1, day - 7, 9, 0)`.
  - Arma el mensaje `"A {mascota} le vence la {vacuna} el {DD/MM}"`.
  - Filtra recordatorios con `date > now`.
- **Fuente (`sources.ts`):** Entrada `{ group: 'vaccine', limit: 15, load: ... }`.
- **Servicio (`services/vaccinePetService.ts`):** `fetchVaccineReminders()`.
- **Sincronización:** Disparo de `syncReminders(['vaccine'])` al crear, editar o eliminar en `CreateVaccinePetModal` y `VaccinePetList`.

---

## Plan de Pruebas (Test Cases)

### Backend (`Backend/api/test_vaccine_reminders.py`):
1. `test_devuelve_vacunas_proximas_a_vencer`: Valida status 200 y retorno de vacunas activas vigentes.
2. `test_excluye_vacunas_con_refuerzo_posterior`: (Escenario 2) Si existe una aplicación posterior del mismo producto, la anterior se excluye.
3. `test_excluye_mascotas_dadas_de_baja`: (Escenario 3) Si la mascota tiene `isDeleted=True`, sus vacunas no se retornan.
4. `test_excluye_vacunas_ya_vencidas`: Vacunas con `expirationDate < hoy` se omiten.
5. `test_excluye_vacunas_eliminadas`: Aplicaciones con `isDeleted=True` se omiten.
6. `test_excluye_mascotas_de_otros_duenios`: Aislamiento por tutor autenticado.
7. `test_requiere_autenticacion`: Petición anónima devuelve 401.

### Frontend (`Frontend/tests/vaccinePlanner.test.ts`):
1. Escenario 1: Aviso 7 días antes a las 09:00 con el texto `"A Beto le vence la Antirrábica el 17/11"`.
2. Escenario 2: Refuerzo aplicado (no genera aviso si el estado es RENEWED).
3. No avisa vencimientos pasados (fecha del aviso anterior a `now`).
4. Claves únicas y estables (`vaccine-{id}`).
5. Diferenciación de título para vacunas y antiparasitarios.
6. Ignora vacunas con bajas lógicas (`isDeleted: true`).
