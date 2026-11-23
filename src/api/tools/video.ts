export interface VideoFile {
  name: string;
  modified: number;
  size: number;
  url: string;
}

interface VideoListResponse { ok: boolean; files: VideoFile[]; error?: string }
interface NotesResponse { ok: boolean; content?: string; error?: string }

const videoApi = '/video-api/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${videoApi}${url}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `请求失败（${response.status}）`);
  return data as T;
}

export function listVideos(folder: string) {
  return request<VideoListResponse>('/videos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder }),
  });
}

export function getNotes() { return request<NotesResponse>('/notes'); }

export function saveNotes(content: string) {
  return request<{ ok: boolean; error?: string }>('/notes/save', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
  });
}
