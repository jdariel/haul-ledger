import { useAppContext } from "@/context/AppContext";

export function useColorScheme(): "light" | "dark" {
  const { settings } = useAppContext();
  return settings.colorScheme === "dark" ? "dark" : "light";
}
