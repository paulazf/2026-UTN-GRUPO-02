# Contexto del Proyecto: PetLife

*Este documento recopila las reglas, convenciones y arquitectura del proyecto para que todo el equipo (y los agentes de IA) mantengan la misma sintonía.*

## 1. Propósito y Alcance del Proyecto (MVP)
**PetLife** es una **App Mobile** diseñada para dueños de mascotas (enfocado en perros y gatos para el MVP). Su objetivo principal es centralizar y facilitar el seguimiento de la salud y el cuidado de los animales.

## 2. Stack Tecnológico y Arquitectura
**Frontend:**
- **Framework:** React Native + Expo (Expo Go)
- **Lenguaje:** TypeScript
- **Manejo de Estado Global:** React Context API (Nativo de React)
- **Estructura de Carpetas:** `[ESPACIO EN BLANCO - Pendiente de decisión del equipo]`
- **Librería UI / Estilos:** `[ESPACIO EN BLANCO - Pendiente de decisión del equipo]`
- **Enfoque:** App Mobile Nativa

**Backend:**
- **Framework:** Python 3 + Django 6
- **API:** Django REST Framework (DRF)
- **Estructura de Apps:** Arquitectura Monolítica (Una sola aplicación principal, ej. `api` o `core`, para todos los modelos y vistas)
- **Autenticación:** `[ESPACIO EN BLANCO - Pendiente de decisión del equipo]`
- **Base de Datos:** PostgreSQL

## 3. Flujo de Trabajo (Git Workflow)
Se utilizará un **Feature Branch Workflow** con las siguientes reglas estrictas:
- **Rama Productiva**: `main` (solo código estable y testeado).
- **Ramas de Desarrollo**: Todas las nuevas funcionalidades, tareas o bugs deben desarrollarse en ramas derivadas de `main` con la nomenclatura `feature/nombre-de-la-tarea` (o similares como `fix/xxx`).
- **Integración y Pull Requests**: No se hacen commits directos a `main`. Todo el código debe integrarse a través de un **Pull Request (PR)**.
- **Code Review y QA**: Los Pull Requests requieren obligatoriamente la aprobación de *reviewers* del equipo. **El testing será manual**.

## 4. Convenciones de Código y API
- **Nomenclatura JSON (Frontend vs Backend)**: El Backend (Django) devolverá y recibirá los datos en su formato nativo `snake_case`. El Frontend (React) será el responsable de mapear y convertir esos datos a `camelCase`.

## 5. Reglas de Codificación (Pair Programming con IA)
Para mantener un código limpio y estandarizado, el equipo y la IA deben respetar las siguientes directrices al codificar:
- **Idioma del Código**: Todos los nombres técnicos deben escribirse en **Inglés**.
- **Idioma de los Comentarios**: Los comentarios deben estar en **Español**.
- **Volumen de Comentarios**: Se comentará únicamente lo **mínimo e indispensable**.
- **Modelos de Django**: Obligatorio formato `UpperCamelCase`.
- **Control de Versiones (Git)**: La IA **tiene prohibido** ejecutar comandos de Git. El desarrollador humano será el único responsable de revisar los cambios y gestionar el repositorio.
- **Estrategia y Mensajes de Commit**: Cada feature se dividirá en partes lógicas y atómicas. La IA propondrá ideas de mensajes de commit usando: `type(scope): texto representativo en español`.
- **Diseño UI y Mockups**: Fidelidad estricta a los diseños de la carpeta `mockup/`.
- **Variables de Entorno y Seguridad**: Las configuraciones sensibles (como SECRET_KEY) y URLs base se manejarán mediante archivos `.env` locales (los cuales DEBEN estar ignorados en `.gitignore`). Se mantendrá siempre un archivo `.env.example` o similar actualizado como plantilla para el equipo.

## 6. Roadmap de Desarrollo por Módulos
`[ESPACIO EN BLANCO - Pendiente de asignación]`
