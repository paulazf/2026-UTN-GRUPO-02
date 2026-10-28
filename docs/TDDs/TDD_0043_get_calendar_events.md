---
id: 0043
estado: Por implementar
autor: Paula Zacarías
fecha: 28-10-2026
titulo: Consulta de Eventos de Calendario
---

# TDD-0043: Consulta de Eventos de Calendario

## Contexto de Negocio (PRD)

### Objetivo
- **Problema que resuelve:** Los tutores de mascotas deben consultar diversas secciones dispersas (turnos, estudios, vacunaciones y tratamientos de medicación) para saber cuándo les corresponde la próxima atención o dosis. Esto dificulta la organización diaria y el seguimiento preventivo de la salud de sus animales.
- **Resultado esperado:** Proveer un módulo de calendario centralizado que agregue, consolide y ordene cronológicamente los eventos sanitarios provenientes de turnos (`Appointment`), estudios médicos (`MedicalTest`), vacunas y antiparasitarios (`VaccinePet`) y tratamientos activos de medicación (`MedicationPet`). Este módulo no persiste entidades nuevas en la base de datos, sino que calcula y presenta en tiempo real la información al usuario con filtros por mascota y por tipo de entidad.

### User Persona
- **Dueño / Tutor de mascota (`Owner`):** Usuario autenticado que desea tener un panorama claro, cronológico y unificado de todas las actividades sanitarias de sus animales, sabiendo con exactitud qué eventos tocan hoy, cuáles están próximos a vencer y cuáles están vencidos.

### User Story
**Como** dueño de una o varias mascotas,  
**quiero** visualizar en una sola pantalla todos los eventos de salud de mis animales (turnos, estudios, vencimientos de vacunas y tomas de medicación) ordenados en el tiempo y filtrables,  
**para que** pueda planificar las atenciones veterinarias y no olvidar ninguna dosis ni vencimiento importante.

### Criterios de Aceptación
1. **Consolidación de eventos sanitarios:**
   - La consulta consolida eventos de cuatro fuentes activas (`isDeleted = false`) asociadas a mascotas del usuario autenticado:
     1. **Turnos (`Appointment`):** Fecha del turno (`date`), hora (`time` en formato `HH:MM`), veterinario y descripción/motivo.
     2. **Estudios (`MedicalTest`):** Fecha del estudio (`date`), nombre del estudio y tipo.
     3. **Vacunas y Antiparasitarios (`VaccinePet`):** Fecha de vencimiento (`expirationDate`) y nombre del producto aplicado.
     4. **Medicaciones (`MedicationPet`):** Proyección de fechas de administración activa entre `startDate` y `endDate`, calculadas según `frequencyHours` y `quantityDose`.
2. **Jerarquía y Agrupación de Secciones (Frontend):**
   - **Sección 1: Vencidas:** Muestra exclusivamente vacunas y antiparasitarios cuya fecha de vencimiento sea anterior a la fecha actual (`expirationDate < today`). Esta sección se ubica al inicio de la pantalla y se muestra **colapsada por defecto**, desplegándose al ser pulsada por el usuario.
   - **Sección 2: Hoy:** Eventos programados exactamente para la fecha actual (`date == today`).
   - **Sección 3: Próximos 60 días:** Eventos futuros comprendidos entre mañana y los siguientes 60 días (`today < date <= today + 60 días`), acompañados de un indicador de días restantes (ej. `3d`, `11d`).
   - **Sección 4: Por Mes:** Eventos agrupados por mes y año (ej. *Noviembre 2026*, *Diciembre 2026*).
3. **Regla de Etiqueta de Vencimiento en Meses:**
   - En las agrupaciones mensuales, la etiqueta visual de advertencia (`⚠️ Vencimiento`) solo se presentará en aquellos meses futuros donde se registre el vencimiento de una vacuna o antiparasitario. No se mostrará en meses donde solo existan turnos, estudios o medicaciones, ni por vacunas ya vencidas en meses anteriores.
4. **Regla de Vencimiento Futuro de Vacunas:**
   - Para evitar saturación visual y duplicaciones innecesarias, para cada vacuna/producto de una mascota solo se calculará y mostrará **un único vencimiento futuro** (el vencimiento más próximo en el tiempo).
5. **Formato de Horario:**
   - Todo horario asociado a un evento (como turnos veterinarios) debe formatearse estrictamente con hora y minutos: `HH:MM` (sin segundos).
6. **Filtros Dinámicos:**
   - **Filtro por Mascota:** Permite consultar los eventos de todas las mascotas del usuario (`Todas`) o filtrar exclusivamente por una mascota puntual (`idPet`).
   - **Filtro por Entidad:** Permite consultar todos los tipos de eventos (`Todos`) o filtrar por categoría específica: `APPOINTMENT` (Turnos), `VACCINE` (Vacunas), `MEDICATION` (Medicaciones) o `MEDICAL_TEST` (Estudios).
7. **Aislamiento de Usuario y Seguridad:**
   - Solo se devuelven eventos pertenecientes a mascotas activas del dueño autenticado (`request.user.owner_profile`). Mascotas eliminadas (`isDeleted = true`) o de otros tutores no se incluyen.

---

## Dependencias y Estimación

### Dependencias Identificadas y Resueltas
1. **Entidades sanitarias existentes:**
   - `Appointment` (TDD-0034)
   - `MedicalTest` (TDD-0010)
   - `VaccinePet` (TDD-0028)
   - `MedicationPet` (TDD-0021)
2. **Entidad `Pet` y autenticación `Owner` (TDD-0001, TDD-0004):** Validación de pertenencia.

### Estimación
- **Estimación total:** **3 Story Points** (Escala Fibonacci).
- **Desglose:**
  - Servicio agregador y endpoint `GET /api/v1/calendar/events/`: *1.5 SP*
  - Pantalla móvil `CalendarScreen`, filtros dobles y secciones (vencidas colapsadas, hoy, 60 días, por mes): *1.5 SP*

---

## Diseño Técnico (RFC)

### Arquitectura de la Solución
- El módulo no requiere la creación de una nueva tabla relacional en PostgreSQL. Se implementa una vista de consulta unificada (`CalendarEventsView` o servicio agregador `CalendarService`) que ejecuta queries optimizadas con `select_related` sobre las tablas existentes y construye una respuesta JSON homogénea.

### Contrato de API (Django REST Framework)

- **Endpoint:** `GET /api/v1/calendar/events/`
- **Autenticación requerida:** `Token <token>` (Tutor autenticado)
- **Parámetros de consulta (Query Params - Opcionales):**
  - `idPet`: Entero (ID de mascota para filtrar).
  - `entityType`: Cadena (`APPOINTMENT`, `VACCINE`, `MEDICATION`, `MEDICAL_TEST`).
  - `fromDate`: Cadena en formato ISO `YYYY-MM-DD` (límite inferior opcional).
  - `toDate`: Cadena en formato ISO `YYYY-MM-DD` (límite superior opcional).

#### Response Body (`200 OK`)

```json
[
  {
    "id": "vaccine-10-exp",
    "entityType": "VACCINE",
    "title": "Frontline antipulgas",
    "subtitle": "Beto · Vence el 22 sep 2026",
    "date": "2026-09-22",
    "time": null,
    "petId": 1,
    "petName": "Beto",
    "daysRemaining": -36,
    "isExpired": true,
    "hasVaccineExpirationInMonth": false,
    "sourceId": 10
  },
  {
    "id": "appointment-3",
    "entityType": "APPOINTMENT",
    "title": "Turno: Control anual Dr. Acosta",
    "subtitle": "Dr. Acosta · 10:00hs",
    "date": "2026-10-28",
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
    "subtitle": "Luna · Cada 8 hs",
    "date": "2026-11-05",
    "time": null,
    "petId": 2,
    "petName": "Luna",
    "daysRemaining": 8,
    "isExpired": false,
    "hasVaccineExpirationInMonth": false,
    "sourceId": 4
  },
  {
    "id": "vaccine-12-exp",
    "entityType": "VACCINE",
    "title": "Refuerzo antirrábica",
    "subtitle": "Luna · Próximo vencimiento",
    "date": "2026-11-20",
    "time": null,
    "petId": 2,
    "petName": "Luna",
    "daysRemaining": 23,
    "isExpired": false,
    "hasVaccineExpirationInMonth": true,
    "sourceId": 12
  },
  {
    "id": "medical-test-7",
    "entityType": "MEDICAL_TEST",
    "title": "Ecografía abdominal",
    "subtitle": "Beto · Pendiente de resultado",
    "date": "2026-12-01",
    "time": null,
    "petId": 1,
    "petName": "Beto",
    "daysRemaining": 34,
    "isExpired": false,
    "hasVaccineExpirationInMonth": false,
    "sourceId": 7
  }
]
```

---

## Casos de Prueba

| Escenario de Prueba | Validación / Regla de Negocio | Código HTTP |
| :--- | :--- | :---: |
| **Consulta general exitosa** | Usuario con mascotas y eventos sanitarios variados. Devuelve lista consolidada ordenada cronológicamente por `date` y `time`, con hora en formato `HH:MM`. | `200 OK` |
| **Filtro por mascota (`idPet`)** | Petición con parámetro `idPet` perteneciente al tutor. Devuelve únicamente los eventos asociados a esa mascota. | `200 OK` |
| **Filtro por mascota ajena o inexistente** | Petición con `idPet` inexistente o que pertenece a otro dueño. Rechaza por aislamiento de datos. | `404 Not Found` |
| **Filtro por entidad (`entityType`)** | Petición con parámetro `entityType` (ej. `VACCINE`, `APPOINTMENT`). Devuelve únicamente eventos de la categoría indicada. | `200 OK` |
| **Vacunas vencidas (`isExpired = true`)** | Registros con `expirationDate < today`. Se marcan con `isExpired: true` y días restantes negativos para poblar la sección colapsada. | `200 OK` |
| **Límite de vencimiento futuro de vacuna** | Mascota con múltiples aplicaciones o registros de una misma vacuna. Emite únicamente el vencimiento futuro más próximo en el tiempo (un solo vencimiento futuro por vacuna). | `200 OK` |
| **Evento del día actual (`date == today`)** | Turno, estudio o toma programada para hoy. Devuelve `daysRemaining: 0` y `isExpired: false` para ubicarse en la sección "Hoy". | `200 OK` |
| **Identificación de mes con vencimiento** | Mes futuro que contiene un vencimiento de vacuna. Marca `hasVaccineExpirationInMonth: true` para que el frontend active el badge de advertencia del mes. | `200 OK` |
| **Usuario sin mascotas o sin eventos** | Usuario recién registrado o sin registros sanitarios. Devuelve colección vacía `[]`. | `200 OK` |
| **Exclusión de registros dados de baja** | Registros con `isDeleted = true`. Se excluyen de la agregación y no figuran en la respuesta. | `200 OK` |

---

## Plan de Implementación

1. **Etapa 1 - Lógica de Agregación y Servicio (Backend):**
   - Crear el servicio o vista `CalendarEventsView` en `Backend/api/views/calendar.py`.
   - Implementar la consulta optimizada con `select_related` sobre:
     - `Appointment`: filtrar por tutor autenticado, `isDeleted=False`, formatear hora a `HH:MM`.
     - `MedicalTest`: filtrar por tutor autenticado, `isDeleted=False`.
     - `VaccinePet`: filtrar por tutor autenticado, `isDeleted=False`. Agrupar por mascota y vacuna para calcular y emitir únicamente el próximo vencimiento futuro (`expirationDate >= today`), además de clasificar las vencidas (`expirationDate < today`).
     - `MedicationPet`: filtrar por tutor autenticado, `isDeleted=False`. Proyectar las fechas de administración activa entre `startDate` y `endDate` según `frequencyHours` y `quantityDose`.
   - Implementar los filtros opcionales por `idPet` y `entityType`.
   - Ordenar la colección unificada de eventos cronológicamente por `date` y `time`.
   - Registrar la ruta `path('calendar/events/', CalendarEventsView.as_view(), name='calendar_events')` en `Backend/api/urls.py`.

2. **Etapa 2 - Servicio y Tipos en Frontend (Mobile):**
   - En `Frontend/src/types/calendar.ts`: definir la interfaz `CalendarEvent`, tipos de filtros de entidad y filtros de mascota.
   - En `Frontend/src/services/calendarService.ts`: implementar la función `fetchCalendarEvents(params?: CalendarFilterParams)`.

3. **Etapa 3 - Componentes de la Pantalla de Calendario (Frontend):**
   - Crear `CalendarFilterPills.tsx`: barra horizontal con chips de mascotas (*Todas*, *Luna*, *Beto*...) y chips de entidad (*Todos*, *Turnos*, *Vacunas*, *Medicaciones*, *Estudios*).
   - Crear `CalendarEventCard.tsx`: tarjeta de evento con ícono/color según tipo, hora `HH:MM`, profesional/subtítulo, mascota y badge de días restantes (`3d`, `11d`...).
   - Crear `ExpiredVaccinesAccordion.tsx`: sección colapsada por defecto ubicada al inicio que despliega las vacunas vencidas al ser pulsada.
   - Implementar las secciones:
     - *Vencidas* (acordeón colapsado).
     - *Hoy* (eventos con `date == today`).
     - *Próximos 60 días* (eventos futuros con cuenta regresiva).
     - *Por Mes* (agrupación mensual con etiqueta `⚠️ Vencimiento` si el mes contiene vencimientos futuros).

4. **Etapa 4 - Integración y Navegación:**
   - Conectar `CalendarScreen` en `Frontend/src/App.tsx` para reemplazar el placeholder *"Próximamente disponible"* de la pestaña `CALENDARIO` en `BottomNavBar`.


