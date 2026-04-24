import { useCallback, useState, useRef } from "react";
import { Upload, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  preview: string | null;
  onClear: () => void;
}

export default function ImageUpload({ onImageSelect, preview, onClear }: ImageUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) onImageSelect(file);
    },
    [onImageSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImageSelect(file);
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  if (preview) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border">
        <img src={preview} alt="Crop preview" className="w-full h-64 object-cover" />
        <button
          onClick={onClear}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:opacity-90 transition"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <Upload className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm font-medium">Drop your crop image here</p>
        <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        <input type="file" accept="image/*" onChange={handleChange} className="hidden" />
      </label>
      
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or use camera</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full py-6 border-dashed hover:border-primary hover:bg-primary/5 transition-all"
        onClick={handleCameraClick}
      >
        <Camera className="mr-2 h-5 w-5 text-primary" />
        Take a Live Photo
      </Button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
