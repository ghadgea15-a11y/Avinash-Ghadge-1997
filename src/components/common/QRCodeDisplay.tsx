import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  darkColor?: string;
  lightColor?: string;
  title?: string;
  centerIconText?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 160,
  className = '',
  darkColor = '#000000',
  lightColor = '#ffffff',
  title,
  centerIconText
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setDataUrl('');
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(value, {
      width: size * 2, // High DPI rendering
      margin: 1,
      color: {
        dark: darkColor,
        light: lightColor
      },
      errorCorrectionLevel: 'M'
    })
      .then((url: string) => {
        if (isMounted) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error('[QRCodeDisplay] Error generating QR code:', err);
          setError('Failed to generate QR');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value, size, darkColor, lightColor]);

  if (error) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-rose-50 text-rose-500 text-xs p-2 text-center rounded-lg border border-rose-200 ${className}`}
      >
        {error}
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs rounded-lg animate-pulse ${className}`}
      >
        Generating...
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center justify-center bg-white p-1 rounded-lg ${className}`}>
      <img
        src={dataUrl}
        alt={title || `QR Code for ${value}`}
        style={{ width: size, height: size }}
        className="block object-contain"
      />
    </div>
  );
};
