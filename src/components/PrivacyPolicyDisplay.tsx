
'use client';

import { useEffect, useState } from 'react';

export function PrivacyPolicyDisplay() {
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="space-y-3 text-sm">
      <p className="text-xs text-muted-foreground">
        Last Updated: {lastUpdated || 'Loading date...'}
      </p>
      <h4 className="font-semibold text-base md:text-lg">MotoVision Privacy Policy</h4>
      <p>
        Your privacy is important to us. This Privacy Policy explains how MotoVision (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, discloses, and safeguards your information when you use our application and services (&quot;Service&quot;).
      </p>

      <ol className="list-decimal list-outside pl-5 space-y-3">
        <li>
          <strong>Information We Collect</strong>
          <p className="mt-1">We may collect information about you in a variety of ways. The information we may collect via the Service includes:</p>
          <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
            <li>
              <strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and motorcycle details (VIN, make, model, year, WiFi credentials) that you voluntarily give to us when you register with the Service or when you choose to participate in various activities related to the Service.
            </li>
            <li>
              <strong>Diagnostic Data:</strong> Information your ESP32 device collects from your motorcycle, such as engine RPM, battery voltage, coolant temperature, oil level, fuel level, vehicle speed, throttle position, and Diagnostic Trouble Codes (DTCs). This data is associated with your registered motorcycle(s).
            </li>
            <li>
              <strong>Derivative Data:</strong> Information our servers automatically collect when you access the Service, such as your IP address, browser type, operating system, access times, and the pages you have viewed directly before and after accessing the Service.
            </li>
             <li>
              <strong>Firebase ID Tokens:</strong> For device provisioning, we temporarily handle Firebase ID tokens to facilitate secure communication between your ESP32 device and our Firebase backend.
            </li>
          </ul>
        </li>
        <li>
          <strong>Use of Your Information</strong>
          <p className="mt-1">Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:</p>
          <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
            <li>Create and manage your account.</li>
            <li>Provide and manage the diagnostic services for your motorcycle(s).</li>
            <li>Display historical diagnostic data and generate predictive maintenance tips.</li>
            <li>Email you regarding your account or order.</li>
            <li>Improve the efficiency and operation of the Service.</li>
            <li>Monitor and analyze usage and trends to improve your experience with the Service.</li>
            <li>Notify you of updates to the Service.</li>
            <li>Request feedback and contact you about your use of the Service.</li>
            <li>Resolve disputes and troubleshoot problems.</li>
            <li>Respond to product and customer service requests.</li>
            <li>Send you notifications (if you have opted in).</li>
          </ul>
        </li>
        <li>
          <strong>Disclosure of Your Information</strong>
          <p className="mt-1">We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
          <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
            <li>
              <strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.
            </li>
            <li>
              <strong>Third-Party Service Providers:</strong> We use Firebase (Google) for backend services, including database storage, authentication, and cloud messaging. Your data is stored on Firebase servers and is subject to their privacy policies.
            </li>
            <li>
              <strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.
            </li>
          </ul>
        </li>
        <li>
          <strong>Security of Your Information</strong>
          <p className="mt-1">We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
        </li>
        <li>
          <strong>Policy for Children</strong>
          <p className="mt-1">We do not knowingly solicit information from or market to children under the age of 13. If you become aware of any data we have collected from children under age 13, please contact us using the contact information provided below.</p>
        </li>
        <li>
          <strong>Controls for Do-Not-Track Features</strong>
          <p className="mt-1">Most web browsers and some mobile operating systems include a Do-Not-Track (&quot;DNT&quot;) feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online.</p>
        </li>
        <li>
          <strong>Changes to This Privacy Policy</strong>
          <p className="mt-1">We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last Updated&quot; date. You are advised to review this Privacy Policy periodically for any changes.</p>
        </li>
        <li>
          <strong>Contact Us</strong>
          <p className="mt-1">If you have questions or comments about this Privacy Policy, please contact us at: privacy@motovision.example.com</p>
        </li>
      </ol>
      <p className="mt-4 text-xs text-muted-foreground italic">
        By using the MotoVision Service, you acknowledge that you have read, understood, and agree to this Privacy Policy.
      </p>
    </div>
  );
}
