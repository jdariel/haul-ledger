import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface AppSettings {
  mileageGoal: number;
  apiBaseUrl: string;
  colorScheme: "dark" | "light" | "system";
  biometricLock: boolean;
  notificationsEnabled: boolean;
}

interface AppContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}

const defaultSettings: AppSettings = {
  mileageGoal: 2500,
  apiBaseUrl: "",
  colorScheme: "light",
  biometricLock: false,
  notificationsEnabled: true,
};

const AppContext = createContext<AppContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem("app_settings");
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
    }
  };

  const updateSettings = async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    try {
      await AsyncStorage.setItem("app_settings", JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to save settings", e);
    }
  };

  return (
    <AppContext.Provider value={{ settings, updateSettings }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
