import { Platform } from "react-native";

export const API_BASE_URL =
  Platform.OS === "web"
    ? "/api"
    : `${process.env.EXPO_PUBLIC_DOMAIN ?? ""}/api`;
