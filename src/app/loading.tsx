import { MotoVisionLogo } from '@/components/MotoVisionLogo';

export default function Loading() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <MotoVisionLogo className="h-16 w-16 mb-4 animate-pulse" />
      <div className="text-2xl font-semibold">Loading MotoVision Dashboard...</div>
      <p className="text-muted-foreground mt-2">Preparing your ride's insights.</p>
    </div>
  );
}
