'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { pickGooglePhotos } from '@/utils/googlePhotosPicker';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_CLIENT_ID;
const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PHOTOS_API_KEY;
const GOOGLE_ENABLED = Boolean(GOOGLE_CLIENT_ID && GOOGLE_API_KEY);

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
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const fs = e.target.files;
        if (fs && fs.length) {
            setFiles((prev) => [...prev, ...Array.from(fs)]);
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

    const importFromGooglePhotos = async () => {
        if (!GOOGLE_ENABLED || !GOOGLE_CLIENT_ID || !GOOGLE_API_KEY || importing) return;
        try {
            setImporting(true);
            const { files: importedFiles, failures } = await pickGooglePhotos({
                clientId: GOOGLE_CLIENT_ID,
                apiKey: GOOGLE_API_KEY,
            });
            if (importedFiles.length) {
                setFiles((prev) => [...prev, ...importedFiles]);
            }
            if (failures > 0) {
                alert(`${failures} Google Photo${failures === 1 ? '' : 's'} could not be imported.`);
            }
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setImporting(false);
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
            files.forEach((f) => form.append('files', f));
            form.set('eventMonth', eventMonth);
            form.set('eventYear', eventYear);
            const res = await fetch('/api/family/galleries', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Create failed');
            setName('');
            setFiles([]);
            setEventMonth('');
            setEventYear('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
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
                            <option value="" disabled hidden>
                                Select month
                            </option>
                            {MONTHS.map((m) => (
                                <option key={m.value} value={m.value}>
                                    {m.label}
                                </option>
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
                        <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={onPickFiles} />
                        {GOOGLE_ENABLED ? (
                            <Button type="button" onClick={importFromGooglePhotos} disabled={busy || importing}>
                                {importing ? 'Loading Google Photos…' : 'Import from Google Photos'}
                            </Button>
                        ) : (
                            <div className="text-xs text-[var(--subt)]">
                                Configure Google Photos credentials to enable importing from Google Photos.
                            </div>
                        )}
                    </div>
                    {files.length > 0 && (
                        <div className="text-xs text-[var(--subt)]">Selected {files.length} photo{files.length === 1 ? '' : 's'}.</div>
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
        </div>
    );
}

