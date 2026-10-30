---
id: 0043
estado: Implementado
autor: Paula Zacarías
fecha: 28-10-2026
titulo: Consulta de Eventos de Calendario
---

# TDD-0043: Consulta de Eventos de Calendario

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores de mascotas deben consultar diversas secciones dispersas (turnos, vacunaciones y tratamientos de medicación) para saber cuándo les corresponde la próxima atención o dosis. Esto dificulta la organización diaria y el seguimiento preventivo de la salud de sus animales.
- **Resultado esperado:** Proveer un módulo de calendario centralizado que agregue, consolide y ordene cronológicamente los eventos sanitarios provenientes de turnos (`Appointment`), vencimientos de vacunas y antiparasitarios (`VaccinePet`) y tratamientos activos de medicación (`MedicationPet`). Los estudios médicos (`MedicalTest`) no forman parte del calendario, ya que representan registros médicos históricos o resultados pasados y no citas o eventos futuros programados. Este módulo no persiste entidades nuevas en la base de datos, sino que calcula y presenta en tiempo real la información al usuario con filtros por mascota y por tipo de entidad.

### User Persona
- **Dueño / Tutor de mascota (`Owner`):** Usuario autenticado que desea tener un panorama claro, cronológico y unificado de todas las actividades sanitarias de sus animales, sabiendo con exactitud qué eventos tocan hoy y cuáles tocan en cada mes futuro.

### User Story
**Como** dueño de una o varias mascotas,  
**quiero** visualizar en una sola pantalla todos los eventos de salud de mis animales (turnos, vencimientos de vacunas y tomas de medicación) ordenados en el tiempo y filtrables,  
**para que** pueda planificar las atenciones veterinarias y no olvidar ningún tratamiento ni vencimiento importante.

### Criterios de Aceptación
1. **Consolidación de eventos sanitarios:**
   - La consulta consolida eventos de tres fuentes activas (`isDeleted = false`) asociadas a mascotas del usuario autenticado:
     1. **Turnos (`Appointment`):** Fecha del turno (`date`), hora (`time` en formato `HH:MM`), nombre de la mascota, veterinario y descripción/motivo.
     2. **Vacunas y Antiparasitarios (`VaccinePet`):** Fecha de vencimiento (`expirationDate`) y nombre del producto aplicado. Si un registro no posee fecha de expiración, no se genera evento de vencimiento en el calendario.
     3. **Medicaciones (`MedicationPet`):** La ficha del medicamento aparece todos los días comprendidos entre `startDate` y `endDate` (ambos inclusive), sin realizar cálculos de tomas horarias ni dosis.
   - *Nota de exclusión:* Los estudios médicos (`MedicalTest`) quedan excluidos del calendario.
2. **Jerarquía y Agrupación de Secciones (Frontend):**
   - **Sección 1: Vencidas:** Muestra las vacunas y antiparasitarios vencidos. Esta sección se presenta colapsada por defecto y solo se visualiza en caso de existir eventos vencidos.
   - **Sección 2: Hoy:** Muestra exclusivamente los eventos programados para la fecha actual (`date == today` / `daysRemaining == 0`).
   - **Sección 3: Por Mes:** Eventos agrupados cronológicamente por mes y año (ej. *Noviembre 2026*, *Diciembre 2026*). Para el mes correspondiente a la fecha actual, se excluyen las actividades de hoy y las vencidas para evitar repeticiones visuales entre secciones.
3. **Formato Unificado de Tarjetas (Cards):**
   - Todas las tarjetas siguen una misma estructura visual estándar.
   - La fecha del evento se visualiza obligatoriamente en formato `DD/MM/AAAA`.
   - **Indicador a la derecha:**
     - En eventos comprendidos dentro de los próximos 10 días (`1 <= daysRemaining <= 10`), se muestra un badge lateral con la cuenta regresiva de días restantes (ej. `3d`, `10d`).
     - En eventos programados para dentro de más de 10 días o eventos vencidos, no se muestra ningún elemento a la derecha (no se muestra contador, badge redundante ni nombre de la mascota).
     - En los eventos de la sección "Hoy", se indica el badge representativo "Hoy".
4. **Regla de Etiqueta de Vencimiento en Meses:**
   - En las cabeceras mensuales, la etiqueta visual de advertencia (`⚠️ Vencimiento`) se presentará únicamente en aquellos meses donde exista un vencimiento de vacuna o antiparasitario que no se encuentre vencido.
5. **Regla de Vencimiento Futuro de Vacunas:**
   - Para cada vacuna/producto de una mascota solo se presentará el vencimiento futuro más próximo en el tiempo.
6. **Formato de Horario:**
   - Todo horario asociado a un evento (como turnos veterinarios) debe formatearse estrictamente con hora y minutos: `HH:MM` (sin segundos).
7. **Filtros Dinámicos:**
   - **Filtro por Mascota:** Permite consultar los eventos de todas las mascotas del usuario (`Todas`) o filtrar exclusivamente por una mascota puntual (`idPet`).
   - **Filtro por Entidad:** Permite consultar todos los tipos de eventos (`Todos`) o filtrar por categoría específica: `APPOINTMENT` (Turnos), `VACCINE` (Vacunas) o `MEDICATION` (Medicaciones).
8. **Aislamiento de Usuario y Seguridad:**
   - Solo se devuelven eventos pertenecientes a mascotas activas del dueño autenticado (`request.user.owner_profile`). Mascotas eliminadas (`isDeleted = true`) o de otros tutores no se incluyen.
9. **Integración en Pantalla de Inicio (`DashboardScreen`):**
   - **Cuadro de Resumen Sanitario:** Tarjeta simplificada con tres métricas clave calculadas en tiempo real:
     1. *Vacunas vencidas:* Total de vacunas de mascotas con fecha de expiración caducada (`isExpired = true`).
     2. *Por vencer:* Total de vacunas activas que vencen en los próximos 30 días (`0 <= daysRemaining <= 30`).
     3. *Próximos turnos:* Total de turnos vigentes programados para hoy o fechas futuras (`daysRemaining >= 0`).
   - **Sección Próximos Eventos:** Lista de eventos comprendidos dentro de la ventana de los próximos 30 días (`0 <= daysRemaining <= 30`), con cabecera y botón/enlace 'Ver calendario' que conmuta a la pestaña `CALENDARIO`.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidades sanitarias existentes:**
   - `Appointment` (TDD-0034)
   - `VaccinePet` (TDD-0028)
   - `MedicationPet` (TDD-0021)
2. **Entidad `Pet` y autenticación `Owner` (TDD-0001, TDD-0004):** Validación de pertenencia.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Servicio agregador y endpoint `GET /api/v1/calendar/events/`: *1.5 SP*
  - Pantalla móvil `CalendarScreen`, filtros dobles y secciones (hoy y meses con badge condicional de 10 días): *1.5 SP*

---

## Diseño Técnico (RFC)

### Arquitectura de la Solución
- El módulo no requiere la creación de una nueva tabla relacional en PostgreSQL. Se implementa una vista de consulta unificada (`CalendarEventsView`) que ejecuta queries optimizadas con `select_related` sobre las tablas existentes y construye una respuesta JSON homogénea ordenada cronológicamente.

### Contrato de API (Django REST Framework)

- **Endpoint:** `GET /api/v1/calendar/events/`
- **Autenticación requerida:** `Token <token>` (Tutor autenticado)
- **Parámetros de consulta (Query Params - Opcionales):**
  - `idPet`: Entero (ID de mascota para filtrar).
  - `entityType`: Cadena (`APPOINTMENT`, `VACCINE`, `MEDICATION`).
  - `fromDate`: Cadena en formato ISO `YYYY-MM-DD` (límite inferior opcional).
  - `toDate`: Cadena en formato ISO `YYYY-MM-DD` (límite superior opcional).

#### Response Body (`200 OK`)

```json
[
  {
    "id": "appointment-3",
    "entityType": "APPOINTMENT",
    "title": "Turno: Control anual Dr. Acosta",
    "subtitle": "Beto · Dr. Acosta · 10:00hs",
    "date": "2026-10-29",
    "time": "10:00",
    "petId": 1,
    "petName": "Beto",
    "daysRemaining": 0,
    "isExpired": false,
    "hasVaccineExpirationInMonth": false,
    "sourceId": 3
  },
  {
    "id": "medication-4-2026-11-05",
    "entityType": "MEDICATION",
    "title": "Amoxicilina",
    "subtitle": "Luna · Medicación",
    "date": "2026-11-05",
    "time": null,
    "petId": 2,
    "petName": "Luna",
    "daysRemaining": 7,
    "isExpired": false,
    "hasVaccineExpirationInMonth": false,
    "sourceId": 4
  },
  {
    "id": "vaccine-12-exp",
    "entityType": "VACCINE",
    "title": "Refuerzo antirrábica",
    "subtitle": "Luna · Vencimiento",
    "date": "2026-11-20",
    "time": null,
    "petId": 2,
    "petName": "Luna",
    "daysRemaining": 22,
    "isExpired": false,
    "hasVaccineExpirationInMonth": true,
    "sourceId": 12
  }
]
```

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :---: |
| **Consulta general exitosa** | Usuario con mascotas y eventos sanitarios variados. Devuelve lista consolidada ordenada cronológicamente por `date` y `time`, con hora en formato `HH:MM` y nombre de mascota en turnos. | `200 OK` |
| **Filtro por mascota (`idPet`)** | Petición con parámetro `idPet` perteneciente al tutor. Devuelve únicamente los eventos asociados a esa mascota. | `200 OK` |
| **Filtro por mascota ajena o inexistente** | Petición con `idPet` inexistente o que pertenece a otro dueño. Rechaza por aislamiento de datos. | `404 Not Found` |
| **Filtro por entidad (`entityType`)** | Petición con parámetro `entityType` (ej. `VACCINE`, `APPOINTMENT`). Devuelve únicamente eventos de la categoría indicada. | `200 OK` |
| **Vacuna sin fecha de expiración** | Registro de vacuna con `expirationDate` nula o vacía. Se omite de la generación de vencimientos en el calendario. | `200 OK` |
| **Límite de vencimiento futuro de vacuna** | Mascota con múltiples aplicaciones o registros de una misma vacuna. Emite únicamente el vencimiento futuro más próximo en el tiempo. | `200 OK` |
| **Medicación por rango de fechas directo** | Registro de tratamiento con `startDate` y `endDate`. Genera evento diario durante todos los días entre ambas fechas inclusive, sin cálculos horarios. | `200 OK` |
| **Evento del día actual (`date == today`)** | Turno o toma programada para hoy. Devuelve `daysRemaining: 0` y `isExpired: false` para ubicarse en la sección "Hoy". | `200 OK` |
| **Identificación de mes con vencimiento** | Mes futuro que contiene un vencimiento de vacuna. Marca `hasVaccineExpirationInMonth: true` para que el frontend active el badge de advertencia del mes. | `200 OK` |
| **Usuario sin mascotas o sin eventos** | Usuario recién registrado o sin registros sanitarios. Devuelve colección vacía `[]`. | `200 OK` |
| **Exclusión de registros dados de baja** | Registros con `isDeleted = true`. Se excluyen de la agregación y no figuran en la respuesta. | `200 OK` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica de Agregación y Servicio (Backend):**
   - En `Backend/api/views/calendar.py`:
     - `Appointment`: Hora en `HH:MM`, inclusión de `pet.name` en subtítulo y filtro de activas.
     - `VaccinePet`: Validación `if not vp.expirationDate: continue`. Cálculo del vencimiento futuro más próximo por vacuna.
     - `MedicationPet`: Generación de eventos diarios directamente desde `startDate` hasta `endDate` inclusive (`curr += timedelta(days=1)`), sin fórmulas de dosis.
     - Orden cronológico por `date` y `time`.
   - Ruta registrada en `Backend/api/urls.py` (`calendar/events/`).

2. **Etapa 2 - Servicio y Tipos en Frontend (Mobile):**
   - Tipos e interfaces en `Frontend/src/types/calendar.ts`.
   - Servicio consumidor en `Frontend/src/services/calendarService.ts`.

3. **Etapa 3 - Componentes y Pantalla de Calendario (Frontend):**
   - `CalendarFilterPills.tsx`: Selectores de mascota y tipo de entidad (`Todos`, `Turnos`, `Vacunas`, `Medicaciones`).
   - `CalendarEventCard.tsx`: Formato unificado de tarjeta, fecha obligatoria en formato `DD/MM/AAAA`. Lógica de lateral derecho: badge de días restantes solo si `1 <= daysRemaining <= 10`; nada si son más de 10 días; badge "Hoy" si es del día actual. Ícono de vacuna correspondiente a aguja (`needle`) de `MaterialCommunityIcons` en violeta (`#7B61C9`).
   - `CalendarScreen.tsx`:
     - Sección "Vencidas": vacunas vencidas (colapsada por defecto, solo visible si existen).
     - Sección "Hoy" (`daysRemaining === 0`).
     - Sección "Por Mes": agrupada por mes excluyendo las actividades de hoy y las vacunas vencidas para evitar duplicados. Badge `⚠️ Vencimiento` en el encabezado mensual si corresponde.

4. **Etapa 4 - Integración y Navegación:**
   - Pantalla conectada a la pestaña `CALENDARIO` en `Frontend/src/App.tsx`.

5. **Etapa 5 - Integración en Inicio (`DashboardScreen`):**
   - Incorporación del cuadro de resumen simplificado con métricas en tiempo real (*Vacunas vencidas*, *Por vencer*, *Próximos turnos*).
   - Sección 'Próximos eventos' con ventana de 30 días y enlace directo 'Ver calendario' conectado a la navegación de pestañas.
