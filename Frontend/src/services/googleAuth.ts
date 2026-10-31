import { useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { ResponseType } from 'expo-auth-session';
import Constants from 'expo-constants';
import axiosClient from '../api/axiosClient';
import { AuthContext } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_CLIENT_ID = '694639477649-fb70l9j1fk509voi1boib9c481t3k956.apps.googleusercontent.com';
const EXPO_PROXY_REDIRECT_URI = 'https://auth.expo.io/@anonymous/utn-grupo-02';

export const useGoogleAuth = (onError?: (msg: string) => void) => {
  const authContext = useContext(AuthContext);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || FALLBACK_CLIENT_ID;
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || webClientId;
  const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || webClientId;

  const redirectUri = Platform.OS === 'web' ? undefined : EXPO_PROXY_REDIRECT_URI;

  console.log('[useGoogleAuth] Hook render - Client IDs:', { webClientId, androidClientId, redirectUri });

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    webClientId,
    iosClientId,
    androidClientId,
    redirectUri,
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  useEffect(() => {
    console.log('[useGoogleAuth] request actualizado:', {
      hasRequest: !!request,
      redirectUri: request?.redirectUri,
      url: request?.url,
    });
  }, [request]);

  useEffect(() => {
    console.log('[useGoogleAuth] response recibido:', response);
    if (response?.type === 'success') {
      const idToken = response.params?.id_token || response.authentication?.idToken;
      console.log('[useGoogleAuth] idToken presente?', !!idToken);
      if (idToken) {
        authenticateWithBackend(idToken);
      } else {
        console.warn('[useGoogleAuth] No vino id_token ni authentication.idToken en response.params:', response.params);
        onError?.('No se pudo obtener el token de Google.');
      }
    } else if (response?.type === 'error') {
      console.error('[useGoogleAuth] response error:', response.error);
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
        console.log('[useGoogleAuth] Login en backend exitoso para owner:', owner?.id);
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
    console.log('[useGoogleAuth] signInWithGoogle invocado! hasRequest:', !!request);
    if (!request) {
      console.warn('[useGoogleAuth] Advertencia: request todavía es null.');
      onError?.('Conectando con Google, por favor probá en unos segundos.');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        console.log('[useGoogleAuth] Plataforma Web: usando promptAsync directo...');
        await promptAsync();
      } else {
        try {
          await WebBrowser.dismissBrowser();
        } catch (_) {}
        const devHost = Constants.expoConfig?.hostUri || '192.168.0.185:8081';
        let returnUrl = Constants.linkingUri;
        if (!returnUrl || returnUrl.startsWith('utngrupo02://')) {
          returnUrl = `exp://${devHost}`;
        }
        if (!returnUrl.endsWith('/--/expo-auth-session')) {
          returnUrl = `${returnUrl.replace(/\/--(\/.*)?$/, '')}/--/expo-auth-session`;
        }
        const startUrl = `${EXPO_PROXY_REDIRECT_URI}/start?authUrl=${encodeURIComponent(request.url!)}&returnUrl=${encodeURIComponent(returnUrl)}`;
        console.log('[useGoogleAuth] Proxy startUrl:', startUrl);
        console.log('[useGoogleAuth] ReturnUrl esperado:', returnUrl);
        
        setIsGoogleLoading(true);
        const res = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);
        console.log('[useGoogleAuth] WebBrowser resultado:', res);
        
        if (res.type === 'success' && res.url) {
          try {
            await WebBrowser.dismissBrowser();
          } catch (_) {}
          const parsed: any = request.parseReturnUrl(res.url);
          console.log('[useGoogleAuth] Resultado parseado del proxy:', parsed);
          const idToken = parsed.params?.id_token || parsed.authentication?.idToken;
          if (idToken) {
            await authenticateWithBackend(idToken);
          } else {
            console.warn('[useGoogleAuth] Proxy retorno sin id_token:', parsed);
            onError?.('No se pudo obtener el token de Google desde el proxy.');
          }
        }
      }
    } catch (err: any) {
      console.error('[useGoogleAuth] Excepción al ejecutar auth:', err);
      onError?.('No se pudo abrir la ventana de Google.');
    } finally {
      try {
        await WebBrowser.dismissBrowser();
      } catch (_) {}
      setIsGoogleLoading(false);
    }
  };

  return {
    signInWithGoogle,
    isGoogleLoading,
    isReady: !!request,
  };
};
