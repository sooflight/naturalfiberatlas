import React, { useState, useCallback, useRef } from 'react';

interface IngestionDropZoneProps {
    onPaste: (text: string) => void;
    onFileDrop: (file: File) => void;
    supportedTypes: string[];
}

export function IngestionDropZone({ onPaste, onFileDrop, supportedTypes }: IngestionDropZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);
    
    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);
    
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;
        
        const file = files[0];
        if (!supportedTypes.includes(file.type) && !file.name.endsWith('.md') && !file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
            alert('Unsupported file type. Please use .txt, .md, or .csv files.');
            return;
        }
        
        onFileDrop(file);
    }, [onFileDrop, supportedTypes]);
    
    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        onFileDrop(files[0]);
    }, [onFileDrop]);
    
    const handlePasteSubmit = useCallback(() => {
        if (!pasteText.trim()) return;
        onPaste(pasteText);
    }, [pasteText, onPaste]);
    
    return (
        <div className="space-y-4">
            {/* Text paste area */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Paste text</label>
                <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste any text, markdown, or CSV content here..."
                    className="w-full h-32 bg-black/30 text-neutral-200 text-sm p-3 rounded-lg border border-white/[0.06] focus:border-blue-500/50 focus:outline-none resize-none placeholder:text-neutral-600"
                />
                <button
                    onClick={handlePasteSubmit}
                    disabled={!pasteText.trim()}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Process Text
                </button>
            </div>
            
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center">
                    <span className="px-3 bg-neutral-900 text-xs text-neutral-500">or</span>
                </div>
            </div>
            
            {/* File drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                    border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                    ${isDragging 
                        ? 'border-blue-500 bg-blue-500/5' 
                        : 'border-white/[0.12] hover:border-white/[0.2] hover:bg-white/[0.02]'
                    }
                `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.csv,text/plain,text/markdown,text/csv"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-neutral-300">
                        Drop a file here or <span className="text-blue-400">browse</span>
                    </p>
                    <p className="text-xs text-neutral-500">
                        Supports .txt, .md, .csv files
                    </p>
                </div>
            </div>
        </div>
    );
}
