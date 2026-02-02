import React, { useEffect, useRef, useState } from 'react';

// Component to remove white background from images using Canvas 2D; falls back to original on CORS/error
export const TransparentImage = ({ src, alt, className, style }: { src: string, alt: string, className?: string, style?: React.CSSProperties }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [processedUrl, setProcessedUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!src) return;
        setProcessedUrl(null);

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                setProcessedUrl(src);
                return;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                setProcessedUrl(src);
                return;
            }
            try {
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const whiteThreshold = 0.92;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i] / 255;
                    const g = data[i + 1] / 255;
                    const b = data[i + 2] / 255;
                    const avg = (r + g + b) / 3;
                    if (avg >= whiteThreshold) data[i + 3] = 0;
                }
                ctx.putImageData(imageData, 0, 0);
                setProcessedUrl(canvas.toDataURL('image/png'));
            } catch {
                setProcessedUrl(src);
            }
        };

        img.onerror = () => setProcessedUrl(src);

        img.src = src;
    }, [src]);

    // Canvas must be in DOM for ref to be set (hidden)
    return (
        <>
            <canvas ref={canvasRef} className="hidden" aria-hidden />
            {!processedUrl ? (
                <div className={`w-full h-full bg-gray-800 flex items-center justify-center rounded-lg text-xs text-gray-500 ${className}`} style={style}>
                    加载中...
                </div>
            ) : (
                <img
                    src={processedUrl}
                    alt={alt}
                    className={className}
                    style={{ ...style, imageRendering: 'pixelated' }}
                />
            )}
        </>
    );
};
