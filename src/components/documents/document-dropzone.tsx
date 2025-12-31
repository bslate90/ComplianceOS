'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DocumentDropzoneProps {
    onFileAccepted: (file: File) => void;
    isProcessing?: boolean;
    accept?: Record<string, string[]>;
}

export function DocumentDropzone({
    onFileAccepted,
    isProcessing = false,
    accept = {
        'application/pdf': ['.pdf'],
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
    },
}: DocumentDropzoneProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setFileName(file.name);

        // Create preview for images
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            // PDF icon for PDF files
            setPreview(null);
        }

        onFileAccepted(file);
    }, [onFileAccepted]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        multiple: false,
        disabled: isProcessing,
    });

    const handleClear = () => {
        setPreview(null);
        setFileName(null);
    };

    return (
        <Card
            {...getRootProps()}
            className={cn(
                'border-2 border-dashed transition-all duration-200 cursor-pointer',
                isDragActive
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800',
                isProcessing && 'opacity-50 cursor-wait'
            )}
        >
            <CardContent className="flex flex-col items-center justify-center py-12">
                <input {...getInputProps()} />

                {isProcessing ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                        <p className="text-emerald-400 font-medium">Processing document...</p>
                        <p className="text-sm text-slate-400">Running OCR (100% local, no data sent)</p>
                    </div>
                ) : preview || fileName ? (
                    <div className="flex flex-col items-center gap-4">
                        {preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="Preview" className="max-w-[200px] max-h-[200px] rounded-lg shadow-lg" />
                        ) : (
                            <div className="w-20 h-24 bg-red-500/10 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                        <p className="text-white font-medium">{fileName}</p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleClear();
                            }}
                            className="text-slate-400"
                        >
                            Choose different file
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-lg font-medium text-white">
                                {isDragActive ? 'Drop the file here' : 'Drag & drop a nutrition label'}
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                PDF, PNG, or JPG (max 10MB)
                            </p>
                        </div>
                        <Button type="button" variant="outline" className="mt-2">
                            Browse Files
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
