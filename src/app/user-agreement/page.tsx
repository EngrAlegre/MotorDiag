
'use client';

import { Header } from '@/components/Header';
import { UserAgreementDisplay } from '@/components/UserAgreementDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation'; // Import useRouter
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function UserAgreementPage() {
  const router = useRouter(); // Instantiate router

  const handleGoBack = () => {
    router.back(); // Navigate to previous page
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">User Agreement</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleGoBack}> {/* Changed to onClick */}
                <ChevronLeft className="mr-2 h-4 w-4" />
                Go Back {/* Changed text */}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)] w-full pr-3">
              <UserAgreementDisplay />
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

