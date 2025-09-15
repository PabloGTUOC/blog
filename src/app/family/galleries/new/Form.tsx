'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Form() {
    const [name, setName] = useState('');
    const [files, setFiles] = useState<FileList | null>(null);
    const [previews, setPreviews] = useState<string[]>([]);
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
        setBusy(true);
        try {
            const form = new FormData();
            form.set('name', name);
            if (files) Array.from(files).forEach((f) => form.append('files', f));
            const res = await fetch('/api/family/galleries', { method: 'POST', body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || 'Create failed');
            setName('');
            setFiles(null);
            setPreviews([]);
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
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
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

