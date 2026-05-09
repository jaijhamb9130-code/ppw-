import { useState, useRef, useEffect } from 'react';
import { X, Camera, Image, Check, RefreshCcw } from 'lucide-react';

interface Props {
    type: 'image' | 'video';
    onFileSelect: (file: File) => void;
    onClose: () => void;
}

export default function MediaPicker({ type, onFileSelect, onClose }: Props) {
    const [step, setStep] = useState<'choice' | 'camera' | 'preview'>('choice');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stop camera when component unmounts or step changes from camera
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startCamera = async () => {
        if (type === 'video') {
            // For video, native capture is much more reliable across mobile browsers
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.capture = 'environment';
            input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    onFileSelect(file);
                    onClose();
                }
            };
            input.click();
            return;
        }

        setError(null);
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: cameraFacing },
                audio: false
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setStep('camera');
        } catch (err: any) {
            console.error('Camera access error:', err);
            setError('Could not access camera. Please check permissions.');
        }
    };

    const handleCapture = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(dataUrl);
            setStep('preview');
            // Stop camera stream after capture to save battery/resource
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    };

    const handleConfirm = () => {
        if (!capturedImage) return;
        // Convert dataURL to File
        fetch(capturedImage)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                onFileSelect(file);
                onClose();
            });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
            onClose();
        }
    };

    const flipCamera = () => {
        setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
        // Restart camera with new facing mode
        setTimeout(startCamera, 100);
    };

    return (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
            <style>{`
                @keyframes fadeInUp {
                    from { transform: translateY(8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            
            <div 
                className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
                style={{ animation: 'fadeInUp 0.2s ease-out' }}
            >
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">
                        {step === 'choice' && `Add ${type === 'image' ? 'Image' : 'Video'}`}
                        {step === 'camera' && `Take ${type === 'image' ? 'Photo' : 'Video'}`}
                        {step === 'preview' && 'Preview Capture'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'choice' && (
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={startCamera}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-indigo-50 border-2 border-indigo-100 rounded-2xl hover:bg-indigo-100 hover:border-indigo-200 transition-all group"
                            >
                                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                                    <Camera size={24} />
                                </div>
                                <span className="text-sm font-bold text-indigo-700">Camera</span>
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:bg-slate-100 hover:border-slate-200 transition-all group"
                            >
                                <div className="w-12 h-12 bg-slate-600 text-white rounded-full flex items-center justify-center shadow-lg group-active:scale-90 transition-transform">
                                    <Image size={24} />
                                </div>
                                <span className="text-sm font-bold text-slate-700">Gallery</span>
                            </button>
                            
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                accept={type === 'image' ? 'image/*' : 'video/*'} 
                                className="hidden" 
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {step === 'camera' && (
                        <div className="space-y-4">
                            <div className="relative bg-black rounded-2xl overflow-hidden aspect-[3/4] shadow-inner">
                                <video 
                                    ref={videoRef} 
                                    autoPlay 
                                    playsInline 
                                    className="w-full h-full object-cover"
                                />
                                {error && (
                                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                        <p className="text-white text-sm font-medium">{error}</p>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={flipCamera}
                                    className="absolute top-4 right-4 p-3 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-all"
                                >
                                    <RefreshCcw size={20} />
                                </button>
                            </div>

                            <div className="flex justify-center">
                                <button 
                                    onClick={handleCapture}
                                    className="w-16 h-16 rounded-full border-4 border-slate-200 p-1 hover:border-indigo-500 transition-all active:scale-90"
                                >
                                    <div className="w-full h-full bg-indigo-600 rounded-full" />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && capturedImage && (
                        <div className="space-y-6">
                            <div className="bg-slate-100 rounded-2xl overflow-hidden aspect-[3/4] shadow-inner">
                                <img src={capturedImage} className="w-full h-full object-cover" alt="Capture preview" />
                            </div>

                            <div className="flex gap-4">
                                <button 
                                    onClick={() => { setCapturedImage(null); startCamera(); }}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all active:scale-95"
                                >
                                    <X size={20} /> Retake
                                </button>
                                <button 
                                    onClick={handleConfirm}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                                >
                                    <Check size={20} /> Use Photo
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
