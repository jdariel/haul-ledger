import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { API_BASE_URL } from "@/constants/api";
import { setAuthToken, setOn401Handler } from "@/hooks/useApi";

const TOKEN_KEY = "auth_token";

// SecureStore is not supported on Expo web — fall back to AsyncStorage
async function storeToken(token: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function loadToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function clearToken() {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setOn401Handler(async () => {
      await clearToken();
      setAuthToken(null);
      setToken(null);
      setUser(null);
      router.replace("/(auth)/login");
    });
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const stored = await loadToken();
      if (stored) {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        });
        if (res.ok) {
          const u = await res.json();
          setAuthToken(stored);
          setToken(stored);
          setUser(u);
        } else {
          await clearToken();
          setAuthToken(null);
        }
      }
    } catch {
      // Network error — allow offline start with cached session
      const stored = await loadToken().catch(() => null);
      if (stored) {
        setToken(stored);
        setAuthToken(stored);
        // User data not available offline; set minimal user
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    await storeToken(data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    router.replace("/(tabs)");
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    await storeToken(data.token);
    setAuthToken(data.token);
    setToken(data.token);
    setUser(data.user);
    router.replace("/(tabs)");
  };

  const logout = async () => {
    await clearToken();
    setAuthToken(null);
    setToken(null);
    setUser(null);
    router.replace("/(auth)/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
