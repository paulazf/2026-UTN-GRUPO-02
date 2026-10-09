import React, { createContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

interface OwnerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface AuthContextProps {
  isLoading: boolean;
  userToken: string | null;
  userData: OwnerData | null;
  login: (token: string, owner: OwnerData) => Promise<void>;
  logout: () => Promise<void>;
  updateUserData: (newData: Partial<OwnerData>) => void;
  updateToken: (newToken: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<OwnerData | null>(null);

  // Al iniciar la app, recupera la sesión si existe
  const checkStoredAuth = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('userToken');
      const storedUser = await SecureStore.getItemAsync('userData');
      
      if (storedToken && storedUser) {
        setUserToken(storedToken);
        setUserData(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Error leyendo sesión', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkStoredAuth();
  }, []);

  const login = async (token: string, owner: OwnerData) => {
    setIsLoading(true);
    try {
      await SecureStore.setItemAsync('userToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(owner));
      setUserToken(token);
      setUserData(owner);
    } catch (e) {
      console.error('Error guardando sesión', e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await SecureStore.deleteItemAsync('userToken');
      await SecureStore.deleteItemAsync('userData');
      setUserToken(null);
      setUserData(null);
    } catch (e) {
      console.error('Error borrando sesión', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserData = (newData: Partial<OwnerData>) => {
    setUserData((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...newData };
      SecureStore.setItemAsync('userData', JSON.stringify(updated)).catch(console.error);
      return updated;
    });
  };

  const updateToken = async (newToken: string) => {
    try {
      await SecureStore.setItemAsync('userToken', newToken);
      setUserToken(newToken);
    } catch (e) {
      console.error('Error actualizando token', e);
    }
  };

  return (
    <AuthContext.Provider value={{ isLoading, userToken, userData, login, logout, updateUserData, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
};
