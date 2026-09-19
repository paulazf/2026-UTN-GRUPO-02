# 2026-UTN-GRUPO-02

¡Bienvenido al repositorio del proyecto! Este proyecto está dividido en dos partes principales:
- **Frontend**: Aplicación web desarrollada con React, TypeScript y Vite.
- **Backend**: API desarrollada con Python, Django y Django REST Framework.

A continuación, encontrarás los comandos que debes ejecutar para configurar y levantar ambas partes del proyecto en tu entorno local.

---

## 🚀 Cómo ejecutar el proyecto localmente

### 1. Clonar el repositorio
Si aún no lo has hecho, clona este repositorio en tu computadora y abre una terminal en la carpeta principal del proyecto (`2026-UTN-GRUPO-02`).

### 2. Levantar el Backend (Django)

Abre una terminal y sigue estos pasos:

1. **Navega a la carpeta del Backend**:
   ```bash
   cd Backend
   ```

2. **Crea un entorno virtual** (recomendado para aislar las dependencias):
   ```bash
   python -m venv venv
   ```

3. **Activa el entorno virtual**:
   - En **Windows**:
     ```bash
     venv\Scripts\activate
     ```
   - En **macOS / Linux**:
     ```bash
     source venv/bin/activate
     ```

4. **Instala las dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Aplica las migraciones de la base de datos**:
   ```bash
   python manage.py migrate
   ```

6. **Inicia el servidor de desarrollo**:
   ```bash
   python manage.py runserver
   ```
   El backend estará corriendo por defecto en `http://127.0.0.1:8000/`.

---

### 3. Levantar el Frontend (React + Vite)

Abre una **nueva terminal** (manteniendo la del Backend corriendo) y sigue estos pasos:

1. **Navega a la carpeta del Frontend**:
   ```bash
   cd Frontend
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   El frontend estará corriendo por defecto en `http://localhost:5173/` (o el puerto que te indique la terminal).

---

## 🛠️ Herramientas y tecnologías utilizadas
- **Frontend**: React 19, TypeScript, Vite, ESLint.
- **Backend**: Python, Django 6, Django REST Framework, SQLite (por defecto).