import type { SVGProps } from 'react';

export function MotoVisionLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M50 10 L90 30 L90 70 L50 90 L10 70 L10 30 L50 10 Z" stroke="hsl(var(--accent))" strokeWidth="6"/>
      <path d="M50 20 L75 35 L75 65 L50 80 L25 65 L25 35 L50 20 Z" fill="hsl(var(--primary))" stroke="hsl(var(--accent))" strokeWidth="4"/>
      <circle cx="50" cy="50" r="8" fill="hsl(var(--accent))"/>
    </svg>
  );
}
