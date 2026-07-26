import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export default function SignatureCanvas({ onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    
    ctx.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    onSave(canvas.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="border-2 border-slate-300 rounded-lg cursor-crosshair w-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={clearCanvas}
        className="mt-2 gap-2"
      >
        <RotateCcw className="w-4 h-4" />
        Clear
      </Button>
    </div>
  );
}