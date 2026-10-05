import './global.css'
import PetMedicalTestsScreen from './screens/PetMedicalTestsScreen'

// PROVISORIO: muestra la pestaña Estudios de la mascota 1 hasta que haya navegación.
// Para volver a la pantalla de inicio: import HomeScreen from './screens/HomeScreen' y return <HomeScreen />
export default function App() {
  return <PetMedicalTestsScreen petId={1} />
}
