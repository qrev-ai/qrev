"use client";

import { useState, useRef, useCallback } from "react";
import { Send, Upload, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface ChatInputProps {
  onSend: (message: string, csvData?: any[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [csvFile, setCsvFile] = useState<{ name: string; data: any[] } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text && !csvFile) return;

    onSend(text || "Here is the CSV data I uploaded.", csvFile?.data);
    setInput("");
    setCsvFile(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, csvFile, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvFile({ name: file.name, data: results.data as any[] });
      },
    });

    // Reset input
    e.target.value = "";
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  return (
    <div className="px-6 py-4 border-t border-border-subtle">
      <div className="max-w-3xl mx-auto">
        {/* CSV attachment preview */}
        {csvFile && (
          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-surface-2 rounded-lg border border-border-subtle">
            <FileText className="w-4 h-4 text-accent shrink-0" />
            <span className="text-sm text-text-secondary flex-1 truncate">
              {csvFile.name} ({csvFile.data.length} rows)
            </span>
            <button
              onClick={() => setCsvFile(null)}
              className="p-0.5 rounded hover:bg-surface-4 text-text-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex gap-3 items-end">
          {/* Upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-secondary disabled:opacity-50 transition-colors shrink-0"
            title="Upload CSV"
          >
            <Upload className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Message QAi..."
              rows={1}
              disabled={disabled}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-2 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50"
            />
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!input.trim() && !csvFile)}
            className="p-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-surface-0 transition-colors shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
