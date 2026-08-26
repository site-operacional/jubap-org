import { TentTree } from 'lucide-react';
import { useBranding } from '../context/BrandingContext';

export default function Logo({ size = 36, iconSize = 18, className = '' }) {
  const branding = useBranding();
  const logoUrl = branding?.logoUrl;

  return (
    <div
      className={`rounded-lg bg-forest-800 flex items-center justify-center overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
      ) : (
        <TentTree size={iconSize} className="text-forest-200" />
      )}
    </div>
  );
}
