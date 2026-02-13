import { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { X, Upload, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
    onCropComplete: (croppedImage: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
    circularCrop?: boolean;
}

export default function ImageCropper({
    onCropComplete,
    onCancel,
    aspectRatio = 1,
    circularCrop = true,
}: ImageCropperProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = useCallback((location: { x: number; y: number }) => {
        setCrop(location);
    }, []);

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom);
    }, []);

    const onCropAreaChange = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size must be less than 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setImageSrc(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const createCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const image = new Image();
            image.src = imageSrc;
            await new Promise((resolve) => {
                image.onload = resolve;
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Set canvas size to cropped area
            canvas.width = croppedAreaPixels.width;
            canvas.height = croppedAreaPixels.height;

            // Draw cropped image
            ctx.drawImage(
                image,
                croppedAreaPixels.x,
                croppedAreaPixels.y,
                croppedAreaPixels.width,
                croppedAreaPixels.height,
                0,
                0,
                croppedAreaPixels.width,
                croppedAreaPixels.height
            );

            // Convert to base64 (compress to ~500KB max)
            let quality = 0.9;
            let base64 = canvas.toDataURL('image/jpeg', quality);

            // Reduce quality if too large
            while (base64.length > 500 * 1024 && quality > 0.1) {
                quality -= 0.1;
                base64 = canvas.toDataURL('image/jpeg', quality);
            }

            onCropComplete(base64);
        } catch (error) {
            console.error('Error cropping image:', error);
            alert('Failed to crop image');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">Crop Image</h3>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {!imageSrc ? (
                        <div className="p-8">
                            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                    <p className="mb-2 text-sm text-gray-500">
                                        <span className="font-semibold">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">PNG, JPG, WebP (max 2MB)</p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>
                    ) : (
                        <div className="relative h-96 bg-gray-100">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={aspectRatio}
                                cropShape={circularCrop ? 'round' : 'rect'}
                                showGrid={!circularCrop}
                                onCropChange={onCropChange}
                                onZoomChange={onZoomChange}
                                onCropComplete={onCropAreaChange}
                            />
                        </div>
                    )}
                </div>

                {/* Controls */}
                {imageSrc && (
                    <div className="p-4 border-t space-y-4">
                        <div className="flex items-center gap-3">
                            <ZoomOut className="w-5 h-5 text-gray-400" />
                            <input
                                type="range"
                                min={1}
                                max={3}
                                step={0.1}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="flex-1"
                            />
                            <ZoomIn className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setImageSrc(null)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Change Image
                            </button>
                            <button
                                onClick={createCroppedImage}
                                disabled={isProcessing}
                                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? 'Processing...' : 'Crop & Save'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
