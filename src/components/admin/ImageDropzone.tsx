"use client";

/**
 * ImageDropzone — click-to-browse + drag-and-drop wrapper around a hidden
 * file input. Purely presentational; the caller decides sizing via
 * className and what to render inside (empty-state box, replace strip,
 * add-tile, ...).
 */
import { useRef, useState } from "react";

export default function ImageDropzone({
  multiple = false,
  disabled = false,
  onFiles,
  className = "",
  style,
  children,
}: {
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`cursor-pointer transition-colors ${disabled ? "opacity-60 cursor-not-allowed" : ""} ${className}`}
      style={{
        borderColor: dragOver ? "var(--primary)" : "var(--border)",
        backgroundColor: dragOver ? "color-mix(in oklch, var(--primary) 8%, transparent)" : "var(--surface)",
        ...style,
      }}
    >
      {children}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
    </div>
  );
}
