import { useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';
import { saveGoogleAccessToken } from './googleCalendarService';

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_WEB_CLIENT_ID = '694639477649-fb70l9j1fk509voi1boib9c481t3k956.apps.googleusercontent.com';
const FALLBACK_ANDROID_CLIENT_ID = '694639477649-4k0caprehmrshd7hh11m6itb7qvf5r13.apps.googleusercontent.com';
const FALLBACK_IOS_CLIENT_ID = '694639477649-erjcfaeo587npshcou24q428fhrt5bts.apps.googleusercontent.com';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

// Carga segura y dinámica del SDK nativo para evitar crash en Expo Go o Web
let GoogleSignin: any = null;
let statusCodes: any = null;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isNativeAvailable = Platform.OS !== 'web' && !isExpoGo;

if (isNativeAvailable) {
  try {
    const googleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleModule.GoogleSignin;
    statusCodes = googleModule.statusCodes;
  } catch (err) {
    console.log('[googleAuth] GoogleSignin nativo no se pudo cargar:', err);
  }
}

export const useGoogleAuth = (onError?: (msg: string) => void) => {
  const authContext = useContext(AuthContext);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || FALLBACK_WEB_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || FALLBACK_IOS_CLIENT_ID;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || FALLBACK_ANDROID_CLIENT_ID;

  // Configuración de GoogleSignin nativo si está disponible (Android e iOS)
  useEffect(() => {
    if (isNativeAvailable && GoogleSignin) {
      try {
        GoogleSignin.configure({
          webClientId,
          ...(Platform.OS === 'ios' ? { iosClientId } : {}),
          scopes: ['openid', 'profile', 'email', CALENDAR_SCOPE],
          offlineAccess: true,
          forceCodeForRefreshToken: false,
        });
        console.log('[useGoogleAuth] GoogleSignin nativo configurado con éxito para', Platform.OS);
      } catch (err) {
        console.warn('[useGoogleAuth] Error configurando GoogleSignin nativo:', err);
      }
    }
  }, [webClientId, iosClientId]);

  // Hook de expo-auth-session como fallback (Web o Expo Go)
  const redirectUri = makeRedirectUri({
    scheme: 'utngrupo02',
    preferLocalhost: false,
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    webClientId,
    iosClientId,
    androidClientId,
    redirectUri,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email', CALENDAR_SCOPE],
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      const accessToken = response.params?.access_token || response.authentication?.accessToken;
      if (accessToken) {
        saveGoogleAccessToken(accessToken);
      }
      if (idToken) {
        authenticateWithBackend(idToken);
      } else {
        onError?.('No se pudo obtener el token de Google.');
      }
    } else if (response?.type === 'error') {
      console.error('[useGoogleAuth] Fallback response error:', response.error);
      onError?.('Ocurrió un error al autenticar con Google.');
    }
  }, [response]);

  const authenticateWithBackend = async (idToken: string) => {
    setIsGoogleLoading(true);
    try {
      console.log('[useGoogleAuth] Enviando idToken al backend...');
      const res = await axiosClient.post('/auth/google/', { idToken });
      if (res.status === 200) {
        const { token, owner } = res.data;
        console.log('[useGoogleAuth] Login exitoso en backend para owner:', owner?.idOwner || owner?.email);
        await authContext?.login(token, owner);
      }
    } catch (error: any) {
      console.error('[useGoogleAuth] Error en backend /auth/google/:', error?.response?.data || error?.message);
      const data = error.response?.data;
      const errorMsg = data?.detail || data?.error || 'No se pudo iniciar sesión con Google.';
      onError?.(errorMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    // 1. Camino Nativo (Standalone APK en Android / Build nativo en iOS) - Sin pantallas de Expo proxy
    if (isNativeAvailable && GoogleSignin) {
      setIsGoogleLoading(true);
      try {
        if (Platform.OS === 'android') {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        }
        const signInResult = await GoogleSignin.signIn();

        // En versiones 13+/17+, signInResult tiene estructura { type: 'success', data: { idToken, user } }
        let idToken = (signInResult as any)?.data?.idToken || (signInResult as any)?.idToken;

        try {
          const tokens = await GoogleSignin.getTokens();
          if (tokens?.idToken && !idToken) {
            idToken = tokens.idToken;
          }
          if (tokens?.accessToken) {
            await saveGoogleAccessToken(tokens.accessToken);
          }
        } catch (tokensErr) {
          console.warn('[useGoogleAuth] Error obteniendo tokens adicionales:', tokensErr);
        }

        if (idToken) {
          await authenticateWithBackend(idToken);
        } else {
          onError?.('No se pudo obtener la identidad de Google. Reintentá.');
        }
      } catch (err: any) {
        console.error('[useGoogleAuth] Error en GoogleSignin nativo:', err);
        if (statusCodes && err.code === statusCodes.SIGN_IN_CANCELLED) {
          // El usuario canceló la selección de cuenta
          console.log('[useGoogleAuth] El usuario canceló el inicio de sesión.');
        } else if (statusCodes && err.code === statusCodes.IN_PROGRESS) {
          onError?.('El inicio de sesión ya está en curso.');
        } else if (statusCodes && err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          onError?.('Google Play Services no está disponible o actualizado en tu dispositivo.');
        } else if (err.code === '10' || err.message?.includes('DEVELOPER_ERROR')) {
          onError?.('Error de configuración (SHA-1 / Client ID) en Google Cloud Console para este APK.');
        } else {
          onError?.('No se pudo conectar con Google. Por favor revisá tu conexión.');
        }
      } finally {
        setIsGoogleLoading(false);
      }
      return;
    }

    // 2. Camino Fallback (Web o Expo Go)
    if (!request) {
      onError?.('Conectando con Google, por favor probá en unos segundos.');
      return;
    }

    try {
      setIsGoogleLoading(true);
      await promptAsync();
    } catch (err: any) {
      console.error('[useGoogleAuth] Excepción en fallback promptAsync:', err);
      onError?.('No se pudo abrir la ventana de Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return {
    signInWithGoogle,
    isGoogleLoading,
    isReady: isNativeAvailable ? true : !!request,
  };
};
