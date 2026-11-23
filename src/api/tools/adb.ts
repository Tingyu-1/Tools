export interface AdbDevice {
  serial: string;
  state: string;
  model: string;
  product?: string;
}

export interface AdbDevicesResponse {
  ok: boolean;
  devices: AdbDevice[];
  stderr?: string;
}

export interface AdbInfoResponse {
  ok: boolean;
  stdout?: string;
  error?: string;
}

export interface AdbSettings {
  adbPath: string;
  outputFolder: string;
  recordingFolder: string;
  logFolder: string;
  screenshotFolder: string;
  noteFile: string;
  recordingLimit: number;
  openLogFolder: boolean;
  confirmFastboot: boolean;
}

const adbApi = '/adb-api/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${adbApi}${url}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `请求失败（${response.status}）`);
  return data as T;
}

export function getAdbDevices() {
  return request<AdbDevicesResponse>('/devices');
}

export function getAdbSettings() {
  return request<{ ok: boolean; settings: AdbSettings }>('/adb-settings');
}

export function saveAdbSettings(settings: AdbSettings) {
  return request<{ ok: boolean; settings: AdbSettings }>('/adb-settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
}

export function selectAdbPath(kind: 'file' | 'folder') {
  return request<{ ok: boolean; path: string }>('/select-path', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) });
}

export function getAdbInfo(serial: string) {
  return request<AdbInfoResponse>('/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ serial }),
  });
}

export function adbAction(path: string, body: Record<string, unknown>) {
  return request<{ ok: boolean; stdout?: string; stderr?: string; error?: string; message?: string; url?: string; file?: string }>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function mediaAction(file: string, action: 'copy-file' | 'copy-path' | 'open-folder') {
  return adbAction('/media-action', { file, action });
}
