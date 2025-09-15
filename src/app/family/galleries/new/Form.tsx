'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

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
    const [files, setFiles] = useState<FileList | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
    const [eventMonth, setEventMonth] = useState('');
    const [eventYear, setEventYear] = useState('');
    const [busy, setBusy] = useState(false);

    const onPickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
        const fs = e.target.files;
        setFiles(fs);
        if (fs && fs.length) {
            const urls = Array.from(fs).map((f) => URL.createObjectURL(f));
            setPreviews(urls);
        } else {
            setPreviews([]);
        }
    };

    useEffect(() => {
        return () => {
            previews.forEach((src) => URL.revokeObjectURL(src));
        };
    }, [previews]);

    const submit: React.FormEventHandler = async (e) => {
        e.preventDefault();
        if (!eventMonth || !eventYear) {
            alert('Select the event month and year');
            return;
        }
        setBusy(true);
        try {
            const form = new FormData();
            form.set('name', name);
            if (files) Array.from(files).forEach((f) => form.append('files', f));
            form.set('eventMonth', eventMonth);
            form.set('eventYear', eventYear);
            const res = await fetch('/api/family/galleries', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Create failed');
            setName('');
            setFiles(null);
            setPreviews([]);
            setEventMonth('');
            setEventYear('');
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
                    <input type="file" multiple accept="image/*" onChange={onPickFiles} />
                    {previews.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {previews.map((src, i) => (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img key={i} src={src} alt="preview" className="w-24 h-24 object-cover" />
                            ))}
                        </div>
                    )}
                    <Button variant="primary" type="submit" disabled={busy}>
                        {busy ? 'Saving…' : 'Save Gallery'}
                    </Button>
                </form>
            </Card>
        </div>
    );
}

