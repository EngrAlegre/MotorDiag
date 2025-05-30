
'use client';

import { Header } from '@/components/Header';
import { PrivacyPolicyDisplay } from '@/components/PrivacyPolicyDisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Privacy Policy</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login"> 
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)] w-full pr-3">
              <PrivacyPolicyDisplay />
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
