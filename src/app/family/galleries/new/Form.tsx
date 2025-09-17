'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { startGooglePhotosPick } from '@/utils/googlePhotosPicker';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID);

const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

export default function Form() {
    const [name, setName] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [eventMonth, setEventMonth] = useState('');
    const [eventYear, setEventYear] = useState('');
    const [busy, setBusy] = useState(false);
    const [importing, setImporting] = useState(false);
    const [waiting, setWaiting] = useState<{ uri: string } | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const fs = e.target.files;
        if (fs && fs.length) {
            const picked = Array.from(fs);
            setFiles((prev) => prev.concat(picked));
        }
        e.target.value = '';
    };

    useEffect(() => {
        const urls = files.map((file) => URL.createObjectURL(file));
        setPreviews(urls);
        return () => {
            urls.forEach((src) => URL.revokeObjectURL(src));
        };
    }, [files]);

    // Cleanup polling if the component unmounts
    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    const importFromGooglePhotos = async () => {
        if (!GOOGLE_ENABLED || !GOOGLE_CLIENT_ID || importing) return;
        setImporting(true);

        // Create an abortable poll controller
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const { start, finish } = startGooglePhotosPick({ clientId: GOOGLE_CLIENT_ID });

            // 1) Create session and get the pickerUri
            const { sessionId, pickerUri } = await start();
            setWaiting({ uri: pickerUri });

            // 2) Open the Photos app/tab (if popup blocked, user can click the link in the overlay)
            const opened = window.open(pickerUri, "_blank", "noopener,noreferrer");
            if (!opened) {
                // popup blocked — still fine, overlay shows the direct link
                // console.warn("Popup blocked; user can use the link shown in the overlay.");
            }

            // 3) Poll until user taps "Done" in Google Photos, then download
            const { files: importedFiles, failures } = await finish(sessionId, {
                signal: controller.signal,
                timeoutMs: 10 * 60 * 1000, // 10 minutes, you can adjust
                intervalMs: 1500,
            });

            if (importedFiles.length) setFiles((prev) => prev.concat(importedFiles));
            if (failures) alert(`${failures} photo${failures === 1 ? '' : 's'} failed to import.`);
        } catch (err) {
            // Distinguish user cancel vs real error
            if (err instanceof DOMException && err.name === 'AbortError') {
                // user canceled; no alert
            } else {
                console.error(err);
                alert(err instanceof Error ? err.message : String(err));
            }
        } finally {
            setWaiting(null);
            setImporting(false);
            abortRef.current = null;
        }
    };

    const submit: React.FormEventHandler = async (e) => {
        e.preventDefault();
        if (!eventMonth || !eventYear) {
            alert('Select the event month and year');
            return;
        }
        if (files.length === 0) {
            alert('Add at least one photo to the gallery');
            return;
        }
        setBusy(true);
        try {
            const form = new FormData();
            form.set('name', name);
            files.forEach((f) => form.append('files', f)); // server expects "files"
            form.set('eventMonth', eventMonth);
            form.set('eventYear', eventYear);

            const res = await fetch('/api/family/galleries', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Create failed');

            // reset
            setName('');
            setFiles([]);
            setEventMonth('');
            setEventYear('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            alert('Gallery created');
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3">
            <h1 className="retro-title">New Family Gallery</h1>
            <Card className="space-y-2">
                <form onSubmit={submit} className="grid gap-2">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />

                    <div className="grid gap-1">
                        <label className="retro-label" htmlFor="eventMonth">Event month</label>
                        <select
                            id="eventMonth"
                            className="retro-input"
                            value={eventMonth}
                            onChange={(e) => setEventMonth(e.target.value)}
                            required
                        >
                            <option value="" disabled hidden>Select month</option>
                            {MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        placeholder="Event year"
                        type="number"
                        min={1900}
                        max={3000}
                        value={eventYear}
                        onChange={(e) => setEventYear(e.target.value)}
                        required
                    />

                    <div className="grid gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            name="files"
                            multiple
                            accept="image/*"
                            onChange={onPickFiles}
                        />

                        {GOOGLE_ENABLED ? (
                            <Button type="button" onClick={importFromGooglePhotos} disabled={busy || importing}>
                                {importing ? 'Loading Google Photos…' : 'Import from Google Photos'}
                            </Button>
                        ) : (
                            <div className="text-xs text-[var(--subt)]">
                                Set <code>NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID</code> to enable Google Photos import.
                            </div>
                        )}
                    </div>

                    {files.length > 0 && (
                        <div className="text-xs text-[var(--subt)]">
                            Selected {files.length} photo{files.length === 1 ? '' : 's'}.
                        </div>
                    )}

                    {previews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {previews.map((src, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={src} alt="preview" className="w-24 h-24 object-cover" />
                            ))}
                        </div>
                    )}

                    <Button variant="primary" type="submit" disabled={busy || importing}>
                        {busy ? 'Saving…' : importing ? 'Importing…' : 'Save Gallery'}
                    </Button>
                </form>
            </Card>

            {/* Waiting overlay */}
            {waiting && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white text-black rounded-2xl p-4 w-[min(92vw,460px)] space-y-2 shadow-xl">
                        <div className="font-medium text-lg">Finish selection in Google Photos</div>
                        <p className="text-sm text-gray-700">
                            A picker has opened in a new tab. If you’re on desktop, open this link on your phone and pick photos,
                            then tap <b>Done</b>:
                        </p>
                        <a
                            href={waiting.uri}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all underline text-blue-700"
                        >
                            {waiting.uri}
                        </a>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    abortRef.current?.abort();
                                    setWaiting(null);
                                }}
                                className="retro-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => window.open(waiting.uri, "_blank", "noopener,noreferrer")}
                                className="retro-btn"
                            >
                                Open again
                            </button>
                        </div>
                        <p className="text-xs text-gray-500">
                            Keep this page open; your photos will appear here when you finish in Google Photos.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
