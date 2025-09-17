// src/utils/googlePhotosPicker.ts
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const PICKER_BASE = "https://photospicker.googleapis.com/v1";

type TokenResponse = { access_token?: string; error?: string; error_description?: string };
type TokenClient = { callback: (r: TokenResponse) => void; requestAccessToken: (o?: { prompt?: string }) => void };

declare global {
    interface Window {
        google?: {
            accounts?: {
                oauth2?: {
                    initTokenClient: (cfg: {
                        client_id: string; scope: string; callback: (r: TokenResponse) => void;
                    }) => TokenClient
                }
            }
        }
    }
}

export type GooglePhotosPickResult = { files: File[]; failures: number };

let gsiLoaded: Promise<void> | null = null;
async function ensureGsi() {
    if (!gsiLoaded) {
        gsiLoaded = new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = GSI_SCRIPT_SRC;
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
            document.head.appendChild(s);
        });
    }
    return gsiLoaded;
}

async function getAccessToken(clientId: string): Promise<string> {
    await ensureGsi();
    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2?.initTokenClient) throw new Error("Google Identity Services are unavailable.");

    const client = oauth2.initTokenClient({
        client_id: clientId, scope: SCOPE, callback: () => {},
    }) as TokenClient;

    return new Promise<string>((resolve, reject) => {
        client.callback = (r) => {
            if (!r || r.error) return reject(new Error(r?.error_description || r?.error || "Google auth failed"));
            if (!r.access_token) return reject(new Error("Missing Google access token"));
            resolve(r.access_token);
        };
        client.requestAccessToken({ prompt: "" });
    });
}

// Normalize session id regardless of { id } vs { name: "sessions/…" }
function parseSessionId(payload: any): string {
    const id: unknown = payload?.id;
    if (typeof id === "string" && id) return id;
    const name: unknown = payload?.name;
    if (typeof name === "string" && name) return name.replace(/^sessions\//, "");
    throw new Error("Picker API: missing session id in response");
}

async function createSession(token: string): Promise<{ sessionId: string; pickerUri: string }> {
    const res = await fetch(`${PICKER_BASE}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
    });
    if (!res.ok) throw new Error(`Failed to create Google Photos picking session (${res.status})`);
    const data = await res.json();
    return { sessionId: parseSessionId(data), pickerUri: String(data.pickerUri || "") };
}

async function pollUntilPicked(token: string, sessionId: string, timeoutMs = 180000, intervalMs = 1500) {
    const start = Date.now();
    // You can honor pollingConfig from sessions.get if you prefer
    while (Date.now() - start < timeoutMs) {
        const r = await fetch(`${PICKER_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) throw new Error(`Failed to poll Google Photos session (${r.status})`);
        const j = await r.json();
        if (j.mediaItemsSet) return;
        await new Promise((res) => setTimeout(res, intervalMs));
    }
    throw new Error("Timed out waiting for Google Photos selection");
}

// ---- FIXED: map the actual schema (PickedMediaItem.mediaFile.*) ----
type Picked = {
    id?: string;
    type?: "PHOTO" | "VIDEO" | string;
    mediaFile?: {
        baseUrl?: string;
        mimeType?: string;
        filename?: string;
        mediaFileMetadata?: { videoMetadata?: { processingStatus?: string } };
    };
};

async function listPickedItems(token: string, sessionId: string) {
    const r = await fetch(`${PICKER_BASE}/mediaItems?sessionId=${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`Failed to list picked media items (${r.status})`);
    const j = await r.json() as { mediaItems?: Picked[]; nextPageToken?: string };

    const items = (j.mediaItems ?? []).map((p) => {
        const mf = p.mediaFile || {};
        return {
            id: p.id,
            type: p.type,
            baseUrl: mf.baseUrl,
            filename: mf.filename,
            mimeType: mf.mimeType,
            videoReady: mf.mediaFileMetadata?.videoMetadata?.processingStatus === "READY",
        };
    });
    return items;
}

// ---- FIXED: use '=d' for photos and '=dv' for videos; require Authorization ----
async function downloadFiles(
    token: string,
    items: Array<{ baseUrl?: string; filename?: string; mimeType?: string; type?: string; videoReady?: boolean }>
): Promise<GooglePhotosPickResult> {
    const files: File[] = [];
    let failures = 0;

    for (const it of items) {
        if (!it.baseUrl) { failures++; continue; }

        const isVideo = it.type === "VIDEO" || (it.mimeType?.startsWith("video/") ?? false);
        if (isVideo && it.videoReady === false) { failures++; continue; }

        const suffix = isVideo ? "dv" : "d";
        const url = `${it.baseUrl}=${suffix}`; // per Picker/Library baseUrl rules

        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!resp.ok) { failures++; continue; }

        const blob = await resp.blob();
        const fname = it.filename && /\.[A-Za-z0-9]{2,8}$/.test(it.filename)
            ? it.filename
            : it.filename ? `${it.filename}.${isVideo ? "mp4" : "jpg"}` : (isVideo ? "video.mp4" : "photo.jpg");

        files.push(new File([blob], fname, { type: it.mimeType || blob.type || (isVideo ? "video/mp4" : "image/jpeg") }));
    }

    if (!files.length) throw new Error("No Google Photos were imported.");
    return { files, failures };
}

async function deleteSession(token: string, sessionId: string) {
    try {
        await fetch(`${PICKER_BASE}/sessions/${encodeURIComponent(sessionId)}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch { /* best-effort cleanup */ }
}

/** Public API: start() → {sessionId, pickerUri}, finish(sessionId) → downloads */
export function startGooglePhotosPick({ clientId }: { clientId: string }) {
    if (typeof window === "undefined") throw new Error("Must run in the browser");
    if (!clientId) throw new Error("Missing Google client id");

    let tokenPromise: Promise<string> | null = null;

    async function start() {
        if (!tokenPromise) tokenPromise = getAccessToken(clientId);
        const token = await tokenPromise;
        const { sessionId, pickerUri } = await createSession(token);
        return { sessionId, pickerUri };
    }

    async function finish(sessionId: string): Promise<GooglePhotosPickResult> {
        if (!tokenPromise) throw new Error("Token flow not started");
        const token = await tokenPromise;
        await pollUntilPicked(token, sessionId);
        const items = await listPickedItems(token, sessionId);
        const result = await downloadFiles(token, items);
        deleteSession(token, sessionId);
        return result;
    }

    return { start, finish };
}

/** Back-compat wrapper (used by your form) */
export async function pickGooglePhotos({ clientId }: { clientId: string }): Promise<GooglePhotosPickResult> {
    const { start, finish } = startGooglePhotosPick({ clientId });
    const { sessionId, pickerUri } = await start();
    window.open(pickerUri, "_blank", "noopener,noreferrer");
    return finish(sessionId);
}

export default pickGooglePhotos;
