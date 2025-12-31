'use client';

import { useState, useCallback } from 'react';
import Tesseract from 'tesseract.js';
import { DocumentDropzone } from './document-dropzone';
import { USDAComparison } from './usda-comparison';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { parseNutritionFromText, normalizeToServing } from '@/lib/ocr/nutrition-parser';
import type { ExtractedNutritionData } from '@/lib/types/supplier.types';

interface NutritionScannerProps {
    onScanComplete: (data: ExtractedNutritionData, file: File) => void;
    onCancel?: () => void;
}

type ScannerStep = 'upload' | 'compare' | 'review';

// Lazy load PDF.js only when needed
async function getPdfJs() {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    return pdfjsLib;
}

export function NutritionScanner({ onScanComplete, onCancel }: NutritionScannerProps) {
    const [step, setStep] = useState<ScannerStep>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [extractedData, setExtractedData] = useState<ExtractedNutritionData | null>(null);
    const [currentFile, setCurrentFile] = useState<File | null>(null);
    const [editedData, setEditedData] = useState<ExtractedNutritionData | null>(null);
    const [compareToUSDA, setCompareToUSDA] = useState(true);

    const processImageWithOCR = useCallback(async (imageData: string): Promise<string> => {
        setStatusMessage('Running OCR on image...');
        const result = await Tesseract.recognize(imageData, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    setProgress(Math.round(m.progress * 100));
                }
            },
        });
        console.log('OCR Result:', result.data.text);
        return result.data.text;
    }, []);

    // Extract embedded text from PDF (works for digital PDFs)
    const extractPdfText = useCallback(async (file: File): Promise<string> => {
        setStatusMessage('Extracting text from PDF...');
        const pdfjsLib = await getPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const numPages = Math.min(pdf.numPages, 5);

        for (let i = 1; i <= numPages; i++) {
            setStatusMessage(`Reading page ${i} of ${numPages}...`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // Extract text items and join (filter for items with str property)
            const pageText = textContent.items
                .map((item) => ('str' in item ? item.str : ''))
                .filter(Boolean)
                .join(' ');

            fullText += pageText + '\n';
        }

        console.log('PDF Extracted Text:', fullText.substring(0, 500));
        return fullText;
    }, []);

    // OCR a PDF by rendering pages to canvas (for scanned PDFs)
    const ocrPdf = useCallback(async (file: File): Promise<string> => {
        setStatusMessage('Scanning PDF with OCR...');
        const pdfjsLib = await getPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        const numPages = Math.min(pdf.numPages, 3);

        for (let i = 1; i <= numPages; i++) {
            setStatusMessage(`OCR scanning page ${i} of ${numPages}...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d')!;
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // @ts-expect-error - PDF.js types are incomplete
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            const imageData = canvas.toDataURL('image/png');
            const pageText = await processImageWithOCR(imageData);
            fullText += pageText + '\n';
        }

        return fullText;
    }, [processImageWithOCR]);

    const handleFileAccepted = useCallback(async (file: File) => {
        setIsProcessing(true);
        setProgress(0);
        setStatusMessage('Starting...');
        setCurrentFile(file);
        setExtractedData(null);
        setEditedData(null);

        try {
            let rawText = '';

            if (file.type === 'application/pdf') {
                // First try to extract embedded text
                const embeddedText = await extractPdfText(file);

                // Check if we got meaningful text (more than just whitespace)
                const cleanText = embeddedText.replace(/\s+/g, ' ').trim();

                if (cleanText.length > 50) {
                    console.log('Using embedded PDF text');
                    rawText = embeddedText;
                } else {
                    // PDF is likely scanned - use OCR
                    console.log('PDF appears to be scanned, using OCR');
                    rawText = await ocrPdf(file);
                }
            } else {
                // Image file - use OCR
                const imageUrl = URL.createObjectURL(file);
                rawText = await processImageWithOCR(imageUrl);
                URL.revokeObjectURL(imageUrl);
            }

            console.log('Final Raw Text:', rawText);
            setStatusMessage('Parsing nutrition data...');

            const parsed = parseNutritionFromText(rawText);
            console.log('Parsed Data:', parsed);

            const normalized = normalizeToServing(parsed, 100);
            console.log('Normalized Data:', normalized);

            setExtractedData(normalized);
            setEditedData(normalized);

            setStep(compareToUSDA ? 'compare' : 'review');
        } catch (error) {
            console.error('OCR Error:', error);
            setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    }, [processImageWithOCR, extractPdfText, ocrPdf, compareToUSDA]);

    const handleUSDASelect = (usdaData: ExtractedNutritionData, _fdcId: number) => {
        setEditedData({
            ...usdaData,
            name: editedData?.name || usdaData.name,
            raw_text: extractedData?.raw_text,
        });
        setStep('review');
    };

    const handleSkipComparison = () => {
        setStep('review');
    };

    const handleFieldChange = (field: keyof ExtractedNutritionData, value: string) => {
        if (!editedData) return;

        const numValue = value === '' ? undefined : parseFloat(value);
        setEditedData({
            ...editedData,
            [field]: field === 'name' || field === 'brand' || field === 'raw_text' ? value : numValue,
        });
    };

    const handleConfirm = () => {
        if (editedData && currentFile) {
            onScanComplete(editedData, currentFile);
        }
    };

    const handleReset = () => {
        setStep('upload');
        setExtractedData(null);
        setEditedData(null);
        setCurrentFile(null);
        setStatusMessage('');
    };

    const nutritionFields = [
        { key: 'calories', label: 'Calories', unit: '' },
        { key: 'total_fat_g', label: 'Total Fat', unit: 'g' },
        { key: 'saturated_fat_g', label: 'Saturated Fat', unit: 'g' },
        { key: 'trans_fat_g', label: 'Trans Fat', unit: 'g' },
        { key: 'cholesterol_mg', label: 'Cholesterol', unit: 'mg' },
        { key: 'sodium_mg', label: 'Sodium', unit: 'mg' },
        { key: 'total_carbohydrates_g', label: 'Total Carbs', unit: 'g' },
        { key: 'dietary_fiber_g', label: 'Dietary Fiber', unit: 'g' },
        { key: 'total_sugars_g', label: 'Total Sugars', unit: 'g' },
        { key: 'added_sugars_g', label: 'Added Sugars', unit: 'g' },
        { key: 'protein_g', label: 'Protein', unit: 'g' },
        { key: 'vitamin_d_mcg', label: 'Vitamin D', unit: 'mcg' },
        { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
        { key: 'iron_mg', label: 'Iron', unit: 'mg' },
        { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
    ];

    // USDA Comparison Step
    if (step === 'compare' && extractedData) {
        return (
            <USDAComparison
                extractedData={extractedData}
                onSelect={handleUSDASelect}
                onSkip={handleSkipComparison}
            />
        );
    }

    // Review Step
    if (step === 'review' && extractedData && editedData) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-white">Review Extracted Data</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            Verify and edit the values before creating an ingredient
                        </p>
                    </div>
                    <Badge
                        variant="outline"
                        className={extractedData.confidence && extractedData.confidence > 50
                            ? 'text-emerald-400 border-emerald-500/30'
                            : 'text-amber-400 border-amber-500/30'
                        }
                    >
                        {extractedData.confidence}% confidence
                    </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-slate-200">Ingredient Name *</Label>
                        <Input
                            value={editedData.name || ''}
                            onChange={(e) => handleFieldChange('name', e.target.value)}
                            placeholder="Enter ingredient name"
                            className="bg-slate-700/50 border-slate-600 text-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-200">Brand</Label>
                        <Input
                            value={editedData.brand || ''}
                            onChange={(e) => handleFieldChange('brand', e.target.value)}
                            placeholder="Optional brand name"
                            className="bg-slate-700/50 border-slate-600 text-white"
                        />
                    </div>
                </div>

                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg">Nutrition Facts (per 100g)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {nutritionFields.map((field) => (
                                <div key={field.key} className="space-y-1">
                                    <Label className="text-slate-400 text-xs">{field.label}</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            step="any"
                                            value={editedData[field.key as keyof ExtractedNutritionData] ?? ''}
                                            onChange={(e) => handleFieldChange(field.key as keyof ExtractedNutritionData, e.target.value)}
                                            className="bg-slate-700/50 border-slate-600 text-white pr-10"
                                        />
                                        {field.unit && (
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                                                {field.unit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="flex gap-3">
                    <Button
                        onClick={handleConfirm}
                        disabled={!editedData.name}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Create Ingredient
                    </Button>
                    {compareToUSDA && (
                        <Button
                            variant="outline"
                            onClick={() => setStep('compare')}
                            className="border-blue-600 text-blue-400 hover:bg-blue-500/10"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Compare to USDA
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={handleReset}
                        className="border-slate-600 text-slate-300"
                    >
                        Scan Another
                    </Button>
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel} className="text-slate-400">
                            Cancel
                        </Button>
                    )}
                </div>

                <details className="text-sm">
                    <summary className="text-slate-500 cursor-pointer hover:text-slate-400">
                        View raw extracted text
                    </summary>
                    <pre className="mt-2 p-4 bg-slate-900 rounded-lg text-slate-400 text-xs overflow-auto max-h-48">
                        {extractedData.raw_text || 'No text extracted'}
                    </pre>
                </details>
            </div>
        );
    }

    // Upload Step
    return (
        <div className="space-y-4">
            <DocumentDropzone
                onFileAccepted={handleFileAccepted}
                isProcessing={isProcessing}
            />

            {/* USDA Comparison Option */}
            <div className="flex items-center space-x-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
                <Checkbox
                    id="usda-compare"
                    checked={compareToUSDA}
                    onCheckedChange={(checked) => setCompareToUSDA(checked === true)}
                    className="border-slate-600 data-[state=checked]:bg-blue-600"
                />
                <div className="flex-1">
                    <label
                        htmlFor="usda-compare"
                        className="text-sm font-medium text-slate-200 cursor-pointer"
                    >
                        Compare to USDA Database
                    </label>
                    <p className="text-xs text-slate-400">
                        Find similar ingredients and validate nutrition values
                    </p>
                </div>
                <Badge variant="outline" className="text-blue-400 border-blue-500/30">
                    Recommended
                </Badge>
            </div>

            {isProcessing && (
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-400">{statusMessage || 'Processing...'}</span>
                        {progress > 0 && <span className="text-emerald-400">{progress}%</span>}
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-300"
                            style={{ width: `${progress || 10}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
