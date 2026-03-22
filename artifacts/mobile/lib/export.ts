import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_BASE_URL } from "@/constants/api";
import { getAuthToken } from "@/hooks/useApi";

async function downloadAndShare(
  path: string,
  filename: string,
  mimeType: string,
  uti: string
): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  const result = await FileSystem.downloadAsync(fileUri, `${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) {
    throw new Error(`Export failed (${result.status})`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("File sharing is not available on this device");
  }

  await Sharing.shareAsync(fileUri, {
    mimeType,
    dialogTitle: "Save or share your export",
    UTI: uti,
  });
}

export async function exportCSV(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await downloadAndShare(
    "/export/csv",
    `haul-ledger-${today}.csv`,
    "text/csv",
    "public.comma-separated-values-text"
  );
}

export async function exportJSON(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  await downloadAndShare(
    "/export/json",
    `haul-ledger-backup-${today}.json`,
    "application/json",
    "public.json"
  );
}
