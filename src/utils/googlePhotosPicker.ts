const GAPI_SCRIPT_SRC = "https://apis.google.com/js/api.js";
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const PHOTOS_PICKER_SCRIPT_SRC = "https://photoslibrary.googleapis.com/v1/picker.js";
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

type GooglePhotosPickerDocumentFieldMap = {
    ID?: string;
    MEDIA_ITEM_ID?: string;
    DESCRIPTION?: string;
    FILENAME?: string;
    MIME_TYPE?: string;
    URL?: string;
    BASE_URL?: string;
};

type GooglePhotosPickerResponseFieldMap = {
    ACTION?: string;
    DOCUMENTS?: string;
};

type GooglePhotosPickerViewMap = {
    PHOTOS?: unknown;
    PHOTOS_LIBRARY?: unknown;
    MEDIA_ITEMS?: unknown;
};

type GooglePhotosPickerBuilder = {
    setDeveloperKey?: (key: string) => GooglePhotosPickerBuilder;
    setOAuthToken?: (token: string) => GooglePhotosPickerBuilder;
    setAccessToken?: (token: string) => GooglePhotosPickerBuilder;
    setTitle?: (title: string) => GooglePhotosPickerBuilder;
    setSize?: (size: { width: number; height: number }) => GooglePhotosPickerBuilder;
    setOrigin?: (origin: string) => GooglePhotosPickerBuilder;
    setLocale?: (locale: string) => GooglePhotosPickerBuilder;
    enableFeature?: (feature: unknown) => GooglePhotosPickerBuilder;
    addView?: (view: unknown) => GooglePhotosPickerBuilder;
    setCallback: (callback: (data: PickerResponse | Record<string, unknown>) => void) => GooglePhotosPickerBuilder;
    build: () => GooglePhotosPickerInstance;
};

type GooglePhotosPickerInstance = {
    show?: () => void;
    hide?: () => void;
    setVisible?: (visible: boolean) => void;
};

type GooglePhotosPickerNamespace = {
    PickerBuilder?: new () => GooglePhotosPickerBuilder;
    Feature?: GooglePickerFeatureMap;
    Action?: GooglePickerActionMap & { ERROR?: string };
    ResponseField?: GooglePhotosPickerResponseFieldMap;
    DocumentField?: GooglePhotosPickerDocumentFieldMap;
    View?: GooglePhotosPickerViewMap;
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
    photos?: { picker?: GooglePhotosPickerNamespace };
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
let googlePhotosPickerPromise: Promise<void> | null = null;
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

async function ensureGooglePhotosPicker(apiKey: string): Promise<void> {
    if (!googlePhotosPickerPromise) {
        const url = new URL(PHOTOS_PICKER_SCRIPT_SRC);
        if (apiKey) {
            url.searchParams.set("key", apiKey);
        }
        googlePhotosPickerPromise = loadScript(url.toString()).catch((err) => {
            googlePhotosPickerPromise = null;
            throw err;
        });
    }
    await googlePhotosPickerPromise;
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

function getPhotosPickerView(photosPicker: GooglePhotosPickerNamespace | undefined): unknown {
    if (!photosPicker?.View) return null;
    const { View } = photosPicker;
    if (View.PHOTOS) return View.PHOTOS;
    if (View.PHOTOS_LIBRARY) return View.PHOTOS_LIBRARY;
    if (View.MEDIA_ITEMS) return View.MEDIA_ITEMS;
    return null;
}

function normalizePhotosPickerDocument(
    doc: Record<string, unknown>,
    photosPicker: GooglePhotosPickerNamespace | undefined
): PickerDocument {
    const fields = photosPicker?.DocumentField;
    const idKey = fields?.ID || fields?.MEDIA_ITEM_ID || "id";
    const nameKey = fields?.FILENAME || fields?.DESCRIPTION || "name";
    const mimeKey = fields?.MIME_TYPE || "mimeType";
    const urlKey = fields?.URL || fields?.BASE_URL || "url";

    const idValue = doc[idKey];
    const nameValue = doc[nameKey];
    const mimeValue = doc[mimeKey];
    const urlValue = doc[urlKey];

    const normalized: PickerDocument = {
        ...doc,
    } as PickerDocument;

    if (typeof idValue === "string") {
        normalized.id = idValue;
    }
    if (typeof nameValue === "string") {
        normalized.name = nameValue;
    }
    if (typeof mimeValue === "string") {
        normalized.mimeType = mimeValue;
    }
    if (typeof urlValue === "string") {
        normalized.url = urlValue;
    }

    return normalized;
}

function normalizePhotosPickerResponse(
    data: Record<string, unknown>,
    photosPicker: GooglePhotosPickerNamespace | undefined
): PickerResponse {
    const responseFields = photosPicker?.ResponseField;
    const actionKey = responseFields?.ACTION || "action";
    const docsKey = responseFields?.DOCUMENTS || "docs";
    const actionValue = data[actionKey];
    const rawDocs = ensureArray(data[docsKey] as PickerDocument[] | undefined);
    const docs = rawDocs.map((doc) => normalizePhotosPickerDocument(doc as Record<string, unknown>, photosPicker));

    return {
        action: typeof actionValue === "string" ? actionValue : undefined,
        docs,
    };
}

async function openPhotosPicker(
    photosPicker: GooglePhotosPickerNamespace,
    apiKey: string,
    token: string
): Promise<PickerResponse> {
    const PickerBuilder = photosPicker.PickerBuilder;
    if (!PickerBuilder) {
        throw new Error("Google Photos Picker is not available.");
    }

    const view = getPhotosPickerView(photosPicker);

    return new Promise<PickerResponse>((resolve) => {
        let pickerInstance: GooglePhotosPickerInstance | null = null;
        const builder = new PickerBuilder();
        if (builder.setDeveloperKey) builder.setDeveloperKey(apiKey);
        if (builder.setOAuthToken) builder.setOAuthToken(token);
        if (builder.setAccessToken) builder.setAccessToken(token);
        if (builder.setOrigin && typeof window !== "undefined" && window.location) {
            builder.setOrigin(window.location.origin);
        }
        if (builder.setLocale && typeof navigator !== "undefined") {
            builder.setLocale(navigator.language || "en");
        }
        if (builder.enableFeature && photosPicker.Feature?.MULTISELECT_ENABLED) {
            builder.enableFeature(photosPicker.Feature.MULTISELECT_ENABLED);
        }
        if (view && builder.addView) {
            if (typeof view === "function") {
                try {
                    builder.addView(new (view as new () => unknown)());
                } catch {
                    builder.addView(view);
                }
            } else {
                builder.addView(view);
            }
        }

        builder.setCallback((raw: PickerResponse | Record<string, unknown>) => {
            if (!raw) return;
            const normalized = normalizePhotosPickerResponse(raw as Record<string, unknown>, photosPicker);
            const actions = photosPicker.Action || {};
            const picked = actions.PICKED || "picked";
            const cancelled = actions.CANCEL || "cancel";
            const empty = actions.EMPTY || "empty";
            const action = normalized.action;
            if (action === picked || action === cancelled || action === empty) {
                resolve(normalized);
                if (pickerInstance?.hide) {
                    pickerInstance.hide();
                } else if (pickerInstance?.setVisible) {
                    pickerInstance.setVisible(false);
                }
            }
        });

        pickerInstance = builder.build();
        if (pickerInstance.show) {
            pickerInstance.show();
        } else if (pickerInstance.setVisible) {
            pickerInstance.setVisible(true);
        }
    });
}

async function openLegacyPicker(google: GoogleNamespace | undefined, apiKey: string, token: string): Promise<PickerResponse> {
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

async function openPicker(google: GoogleNamespace | undefined, apiKey: string, token: string): Promise<PickerResponse> {
    const photosPicker = google?.photos?.picker;
    if (photosPicker?.PickerBuilder) {
        return openPhotosPicker(photosPicker, apiKey, token);
    }
    return openLegacyPicker(google, apiKey, token);
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
    const uniqueIds = Array.from(new Set(ids));
    for (let i = 0; i < uniqueIds.length; i += MEDIA_BATCH_LIMIT) {
        const chunk = uniqueIds.slice(i, i + MEDIA_BATCH_LIMIT);
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
    const id = getDocumentId(doc);
    if (!id) throw new Error("Missing photo identifier.");
    const metadata = metaMap.get(id);
    const rawBaseUrl = typeof doc.baseUrl === "string" ? doc.baseUrl : undefined;
    const sourceUrl = rawBaseUrl || metadata?.baseUrl || doc.url;
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

function getDocumentId(doc: PickerDocument): string | undefined {
    if (typeof doc.id === "string") return doc.id;
    const mediaItemId = doc.mediaItemId;
    if (typeof mediaItemId === "string") return mediaItemId;
    const altId = doc.mediaItemResourceName || doc.resourceName || doc.url;
    if (typeof altId === "string" && /^items\//.test(altId)) {
        return altId.replace(/^items\//, "");
    }
    return undefined;
}

export async function pickGooglePhotos({ clientId, apiKey, scopes }: GooglePhotosPickerOptions): Promise<GooglePhotosPickResult> {
    if (!clientId || !apiKey) {
        throw new Error("Google Photos configuration is incomplete.");
    }
    if (typeof window === "undefined") {
        throw new Error("Google Photos picker can only run in the browser.");
    }

    const scopeList = scopes && scopes.length > 0 ? scopes : DEFAULT_SCOPES;
    await ensureGooglePhotosPicker(apiKey);
    const google = window.google;
    if (!google?.photos?.picker) {
        await ensureGapi(apiKey);
    }
    const token = await getAccessToken(clientId, scopeList);
    const pickerResponse = await openPicker(google, apiKey, token);
    const action = pickerResponse.action;
    const docs = ensureArray(pickerResponse.docs).filter((doc) => typeof doc.id === "string");

    const pickerActions = google?.photos?.picker?.Action || google?.picker?.Action;
    const pickedValue = pickerActions?.PICKED || "picked";
    if (!docs.length || action !== pickedValue) {
        return { files: [], failures: 0 };
    }

    const metaIds = docs
        .map((doc) => getDocumentId(doc))
        .filter((value): value is string => typeof value === "string" && value.length > 0);
    const metaMap = metaIds.length > 0 ? await fetchMetadata(metaIds, token) : new Map();
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
