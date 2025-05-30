'use client';

import { useEffect, useState } from 'react';

export function UserAgreementDisplay() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // This ensures the date is generated on the client after hydration
    // to avoid server-client mismatches.
    setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Last Updated: {lastUpdated || 'Loading date...'}
      </p>
      <h4 className="font-semibold text-base md:text-lg">Welcome to MotoVision!</h4>
      <p>
        By using our application and services (&quot;Service&quot;), you agree to these terms. Please read them carefully.
      </p>

      <ol className="list-decimal list-outside pl-5 space-y-3">
        <li>
          <strong>Service Description</strong>
          <p className="mt-1">MotoVision provides a motorcycle diagnostic system allowing users to monitor their vehicle&apos;s health, view diagnostic trouble codes (DTCs), and receive maintenance insights. Data is collected via an ESP32 device and stored securely in Firebase.</p>
        </li>
        <li>
          <strong>Data Usage & Privacy</strong>
          <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
            <li>We collect diagnostic data from your motorcycle (e.g., RPM, voltage, DTCs) and user account information.</li>
            <li>This data is used to provide you with the Service, improve our system, and offer features like predictive maintenance.</li>
            <li>We are committed to protecting your privacy. Your personal data will not be shared with third parties without your consent, except as required by law or to provide the Service (e.g., data storage with Firebase).</li>
            <li>For full details, please refer to our Privacy Policy (a separate document to be implemented in the future).</li>
          </ul>
        </li>
        <li>
          <strong>User Responsibilities</strong>
          <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
            <li>You are responsible for the secure installation and use of the ESP32 diagnostic device.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>MotoVision is an informational tool. It is not a substitute for professional mechanical advice or regular vehicle maintenance. Always consult a qualified mechanic for repairs or safety concerns.</li>
            <li>You agree not to use MotoVision for any unlawful purposes or in any way that could damage, disable, or impair the Service.</li>
          </ul>
        </li>
        <li>
          <strong>Accuracy of Information</strong>
          <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
            <li>While we strive for accuracy, diagnostic data and AI-generated insights are provided &quot;as is&quot; without warranties of any kind. MotoVision is not liable for any decisions made based on the information provided.</li>
            <li>The accuracy of data depends on the proper functioning of your motorcycle&apos;s sensors and the ESP32 device.</li>
          </ul>
        </li>
        <li>
          <strong>Intellectual Property</strong>
          <p className="mt-1">All content and software associated with MotoVision are the property of MotoVision or its licensors and are protected by intellectual property laws.</p>
        </li>
        <li>
          <strong>Limitation of Liability</strong>
          <p className="mt-1">To the fullest extent permitted by law, MotoVision shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from your use of or inability to use the Service.</p>
        </li>
        <li>
          <strong>Modifications to Terms</strong>
          <p className="mt-1">We reserve the right to modify these terms at any time. We will notify you of any changes by posting the new terms. Your continued use of the Service after any such change constitutes your acceptance of the new terms.</p>
        </li>
        <li>
          <strong>Termination</strong>
          <p className="mt-1">We may terminate or suspend your access to our Service immediately, without prior notice or liability, for any reason whatsoever, including if you breach the Terms.</p>
        </li>
        <li>
          <strong>Governing Law</strong>
          <p className="mt-1">These Terms shall be governed by the laws of Your Jurisdiction (please update as appropriate for your project, e.g., Delaware, USA).</p>
        </li>
        <li>
          <strong>Contact Us</strong>
          <p className="mt-1">If you have any questions about these Terms, please contact us at support@motovision.example.com.</p>
        </li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground italic">
        By signing in, creating an account, or continuing to use the MotoVision Service, you acknowledge that you have read, understood, and agree to be bound by this User Agreement.
      </p>
    </div>
  );
}
