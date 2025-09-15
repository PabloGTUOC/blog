const GAPI_SCRIPT_SRC = "https://apis.google.com/js/api.js";
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const DEFAULT_SCOPES = ["https://www.googleapis.com/auth/photoslibrary.readonly"];
const MEDIA_ITEMS_BATCH_GET = "https://photoslibrary.googleapis.com/v1/mediaItems:batchGet";
const MEDIA_BATCH_LIMIT = 50;

const MIME_EXTENSIONS: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
};

type GapiClient = {
    init?: (config: { apiKey: string }) => Promise<void>;
    setApiKey?: (key: string) => void;
};

type Gapi = {
    load: (
        library: string,
        options: {
            callback: () => void;
            onerror?: () => void;
            timeout?: number;
            ontimeout?: () => void;
        }
    ) => void;
    client?: GapiClient;
};

type GooglePickerFeatureMap = {
    MULTISELECT_ENABLED?: string;
};

type GooglePickerActionMap = {
    PICKED?: string;
    CANCEL?: string;
    EMPTY?: string;
};

type GooglePhotosView = {
    setType?: (type: unknown) => GooglePhotosView;
};

type GooglePickerBuilder = {
    setDeveloperKey: (key: string) => GooglePickerBuilder;
    setOAuthToken: (token: string) => GooglePickerBuilder;
    setCallback: (callback: (data: PickerResponse) => void) => GooglePickerBuilder;
    setOrigin?: (origin: string) => GooglePickerBuilder;
    enableFeature?: (feature: string) => GooglePickerBuilder;
    addView?: (view: unknown) => GooglePickerBuilder;
    build: () => GooglePickerInstance;
};

type GooglePickerInstance = {
    setVisible: (visible: boolean) => void;
};

type GooglePickerNamespace = {
    PickerBuilder: new () => GooglePickerBuilder;
    Feature?: GooglePickerFeatureMap;
    Action?: GooglePickerActionMap;
    ViewId?: Record<string, unknown>;
    PhotosView?: new () => GooglePhotosView;
};

type GoogleOauth2Namespace = {
    initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
    }) => TokenClient;
};

type GoogleAccountsNamespace = {
    oauth2?: GoogleOauth2Namespace;
};

type GoogleNamespace = {
    picker?: GooglePickerNamespace;
    accounts?: GoogleAccountsNamespace;
};

type PickerDocument = {
    id?: string;
    name?: string;
    mimeType?: string;
    url?: string;
    [key: string]: unknown;
};

type PickerResponse = {
    action?: string;
    docs?: PickerDocument[];
};

type TokenResponse = {
    access_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    error?: string;
    error_description?: string;
};

type TokenClient = {
    callback: (response: TokenResponse) => void;
    requestAccessToken: (options?: { prompt?: string }) => void;
};

type MediaItemMeta = {
    baseUrl: string;
    filename?: string;
    mimeType?: string;
};

type BatchGetResponse = {
    mediaItemResults?: Array<{
        mediaItem?: {
            id?: string;
            baseUrl?: string;
            mimeType?: string;
            filename?: string;
        };
        status?: {
            code?: number;
            message?: string;
        };
    }>;
};

declare global {
    interface Window {
        gapi?: Gapi;
        google?: GoogleNamespace;
    }
}

let gapiInitPromise: Promise<void> | null = null;
let gapiApiKey: string | null = null;
let gsiInitPromise: Promise<void> | null = null;
let tokenClient: TokenClient | null = null;
let tokenClientScope: string | null = null;
let tokenClientId: string | null = null;

export type GooglePhotosPickerOptions = {
    clientId: string;
    apiKey: string;
    scopes?: string[];
};

export type GooglePhotosPickResult = {
    files: File[];
    failures: number;
};

function ensureArray<T>(value: T[] | undefined): T[] {
    return Array.isArray(value) ? value : [];
}

async function loadScript(src: string): Promise<void> {
    if (typeof window === "undefined") throw new Error("Window is not available");
    const existing = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
        if (existing.dataset.loaded === "true") return;
        await new Promise<void>((resolve, reject) => {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error(`Failed to load script ${src}`)), { once: true });
        });
        return;
    }

    await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.defer = true;
        script.addEventListener("load", () => {
            script.dataset.loaded = "true";
            resolve();
        });
        script.addEventListener("error", () => {
            reject(new Error(`Failed to load script ${src}`));
        });
        document.head.appendChild(script);
    });
}

async function ensureGapi(apiKey: string): Promise<void> {
    await loadScript(GAPI_SCRIPT_SRC);
    if (!gapiInitPromise) {
        gapiApiKey = apiKey;
        gapiInitPromise = new Promise<void>((resolve, reject) => {
            const onError = () => reject(new Error("Failed to load Google API client."));
            const gapi = window.gapi;
            if (!gapi?.load) {
                reject(new Error("Google API loader is unavailable."));
                return;
            }
            gapi.load("client:picker", {
                callback: async () => {
                    try {
                        const client = gapi.client;
                        if (client?.init) {
                            await client.init({ apiKey });
                        } else if (client?.setApiKey) {
                            client.setApiKey(apiKey);
                        }
                        resolve();
                    } catch (err) {
                        reject(err instanceof Error ? err : new Error(String(err)));
                    }
                },
                onerror: onError,
                timeout: 5000,
                ontimeout: () => reject(new Error("Google API client load timed out.")),
            });
        });
    }
    await gapiInitPromise;
    const gapiAfter = window.gapi;
    if (gapiApiKey !== apiKey && gapiAfter?.client?.setApiKey) {
        gapiAfter.client.setApiKey(apiKey);
        gapiApiKey = apiKey;
    }
}

async function ensureGsi(): Promise<void> {
    if (!gsiInitPromise) {
        gsiInitPromise = loadScript(GSI_SCRIPT_SRC);
    }
    await gsiInitPromise;
}

async function getAccessToken(clientId: string, scopes: string[]): Promise<string> {
    await ensureGsi();
    const scopeString = scopes.join(" ");
    const googleNs = window.google;
    const oauth2 = googleNs?.accounts?.oauth2;
    if (!oauth2?.initTokenClient) {
        throw new Error("Google Identity Services are unavailable.");
    }

    if (!tokenClient || tokenClientScope !== scopeString || tokenClientId !== clientId) {
        tokenClient = oauth2.initTokenClient({
            client_id: clientId,
            scope: scopeString,
            callback: () => {},
        }) as TokenClient;
        tokenClientScope = scopeString;
        tokenClientId = clientId;
    }

    return new Promise<string>((resolve, reject) => {
        if (!tokenClient) {
            reject(new Error("Google token client was not initialized."));
            return;
        }
        tokenClient.callback = (response: TokenResponse) => {
            if (!response || response.error) {
                reject(new Error(response?.error_description || response?.error || "Failed to authorize with Google."));
                return;
            }
            const token = response.access_token;
            if (!token) {
                reject(new Error("Google access token is missing."));
                return;
            }
            resolve(token);
        };
        try {
            tokenClient.requestAccessToken({ prompt: "" });
        } catch (err) {
            reject(err instanceof Error ? err : new Error(String(err)));
        }
    });
}

function getPhotosView(google: GoogleNamespace | undefined): unknown {
    const picker = google?.picker;
    if (!picker) return null;
    if (picker.ViewId?.PHOTOS) return picker.ViewId.PHOTOS;
    if (picker.ViewId?.PHOTOS_LIBRARY) return picker.ViewId.PHOTOS_LIBRARY;
    if (picker.PhotosView) {
        return new picker.PhotosView();
    }
    return null;
}

async function openPicker(google: GoogleNamespace | undefined, apiKey: string, token: string): Promise<PickerResponse> {
    const pickerNamespace = google?.picker;
    if (!pickerNamespace?.PickerBuilder) {
        throw new Error("Google Picker is not available.");
    }

    const view = getPhotosView(google);

    return new Promise<PickerResponse>((resolve) => {
        let pickerInstance: GooglePickerInstance | null = null;
        const builder = new pickerNamespace.PickerBuilder();
        builder.setDeveloperKey(apiKey);
        builder.setOAuthToken(token);
        builder.setCallback((data: PickerResponse) => {
            if (!data) return;
            const action = data.action;
            const actions = pickerNamespace.Action || {};
            const picked = actions.PICKED || "picked";
            const cancelled = actions.CANCEL || "cancel";
            const empty = actions.EMPTY || "empty";
            if (action === picked || action === cancelled || action === empty) {
                resolve(data);
                if (pickerInstance) pickerInstance.setVisible(false);
            }
        });

        if (builder.setOrigin && typeof window !== "undefined" && window.location) {
            builder.setOrigin(window.location.origin);
        }
        if (view && builder.addView) {
            builder.addView(view);
        }
        if (pickerNamespace.Feature?.MULTISELECT_ENABLED && builder.enableFeature) {
            builder.enableFeature(pickerNamespace.Feature.MULTISELECT_ENABLED);
        }

        pickerInstance = builder.build();
        pickerInstance.setVisible(true);
    });
}

function ensureFileName(name: string | undefined, mimeType?: string): string {
    const base = (name || "").trim();
    if (base && /\.[A-Za-z0-9]{2,8}$/.test(base)) {
        return base;
    }
    const ext = mimeType ? MIME_EXTENSIONS[mimeType.toLowerCase()] : undefined;
    if (ext) {
        return base ? `${base}.${ext}` : `photo.${ext}`;
    }
    return base || "photo.jpg";
}

function toDownloadUrl(baseUrl: string): string {
    if (baseUrl.endsWith("=d")) return baseUrl;
    if (baseUrl.includes("download=1")) return baseUrl;
    if (baseUrl.includes("?")) {
        return `${baseUrl}&download=1`;
    }
    return `${baseUrl}=d`;
}

async function fetchMetadata(ids: string[], token: string): Promise<Map<string, MediaItemMeta>> {
    const results = new Map<string, MediaItemMeta>();
    const headers = { Authorization: `Bearer ${token}` };
    for (let i = 0; i < ids.length; i += MEDIA_BATCH_LIMIT) {
        const chunk = ids.slice(i, i + MEDIA_BATCH_LIMIT);
        const params = new URLSearchParams();
        chunk.forEach((id) => params.append("mediaItemIds", id));
        const resp = await fetch(`${MEDIA_ITEMS_BATCH_GET}?${params.toString()}`, { headers });
        if (!resp.ok) {
            throw new Error("Failed to fetch Google Photos metadata.");
        }
        const data = (await resp.json()) as BatchGetResponse;
        for (const item of ensureArray(data.mediaItemResults)) {
            const mediaItem = item.mediaItem;
            const statusCode = item.status?.code ?? 0;
            if (!mediaItem?.id || !mediaItem.baseUrl || (statusCode && statusCode !== 0)) {
                continue;
            }
            results.set(mediaItem.id, {
                baseUrl: mediaItem.baseUrl,
                filename: mediaItem.filename,
                mimeType: mediaItem.mimeType,
            });
        }
    }
    return results;
}

async function downloadPhoto(
    doc: PickerDocument,
    metaMap: Map<string, MediaItemMeta>,
    token: string
): Promise<File> {
    const id = doc.id;
    if (!id) throw new Error("Missing photo identifier.");
    const metadata = metaMap.get(id);
    const sourceUrl = metadata?.baseUrl || doc.url;
    if (!sourceUrl) throw new Error("Google Photo is missing a download URL.");
    const downloadUrl = toDownloadUrl(sourceUrl);
    const resp = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
        throw new Error(`Failed to download photo ${doc.name || id}.`);
    }
    const blob = await resp.blob();
    const mimeType = metadata?.mimeType || doc.mimeType || blob.type;
    const filename = ensureFileName(metadata?.filename || doc.name || id, mimeType);
    return new File([blob], filename, { type: mimeType || blob.type || "image/jpeg" });
}

export async function pickGooglePhotos({ clientId, apiKey, scopes }: GooglePhotosPickerOptions): Promise<GooglePhotosPickResult> {
    if (!clientId || !apiKey) {
        throw new Error("Google Photos configuration is incomplete.");
    }
    if (typeof window === "undefined") {
        throw new Error("Google Photos picker can only run in the browser.");
    }

    const scopeList = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES;
    await ensureGapi(apiKey);
    const token = await getAccessToken(clientId, scopeList);
    const google = window.google;
    const pickerResponse = await openPicker(google, apiKey, token);
    const action = pickerResponse.action;
    const docs = ensureArray(pickerResponse.docs).filter((doc) => typeof doc.id === "string");

    const pickerActions = google?.picker?.Action;
    const pickedValue = pickerActions?.PICKED || "picked";
    if (!docs.length || action !== pickedValue) {
        return { files: [], failures: 0 };
    }

    const metaMap = await fetchMetadata(docs.map((doc) => doc.id as string), token);
    const downloads = await Promise.allSettled(docs.map((doc) => downloadPhoto(doc, metaMap, token)));
    const files: File[] = [];
    let failures = 0;
    for (const result of downloads) {
        if (result.status === "fulfilled") {
            files.push(result.value);
        } else {
            failures += 1;
            console.warn(result.reason);
        }
    }

    if (!files.length) {
        throw new Error("Unable to import the selected Google Photos.");
    }

    return { files, failures };
}

export const GOOGLE_PHOTOS_SCOPES = DEFAULT_SCOPES;

export default pickGooglePhotos;
