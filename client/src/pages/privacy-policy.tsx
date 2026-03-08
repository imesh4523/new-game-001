import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import FallingAnimation from "@/components/falling-animation";

export default function PrivacyPolicyPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      <FallingAnimation />
      
      <header className="sticky top-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 safe-area-top">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/account')}
            className="text-white hover:bg-white/10"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-white text-lg font-semibold">Privacy Policy</h1>
        </div>
      </header>

      <main className="p-4 pb-20 max-w-4xl mx-auto">
        <Card className="bg-black/30 backdrop-blur-md border border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Information We Collect</h2>
              <p>We collect comprehensive information to ensure platform security and service quality, including:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Email address and account credentials</li>
                <li>Profile information including photos</li>
                <li>Transaction and betting history</li>
                <li>Referral and commission data</li>
                <li><strong>IP address, device information, browser type, and session data</strong></li>
                <li>Game participation records and activity logs</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Automated Tracking and Monitoring</h2>
              <p>
                Our platform employs advanced tracking systems to monitor all user activities. We automatically track and record:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Device fingerprinting</strong> - Unique device identifiers to prevent fraud</li>
                <li><strong>IP address tracking</strong> - All connection points and locations</li>
                <li><strong>Browser session data</strong> - Complete browsing and interaction history</li>
                <li><strong>Game participation records</strong> - Every bet, transaction, and game activity</li>
                <li><strong>Login patterns and timestamps</strong> - Account access monitoring</li>
              </ul>
              <p className="mt-3 text-yellow-400 font-semibold">
                Note: All user activities are continuously monitored and permanently recorded for security and compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process your transactions and manage your account</li>
                <li>Send you important notifications about your account</li>
                <li>Manage referral programs and commissions</li>
                <li>Ensure platform security and prevent fraud</li>
                <li><strong>Detect and prevent multiple account abuse</strong></li>
                <li><strong>Enforce our Terms of Service and platform rules</strong></li>
                <li><strong>Comply with legal obligations and government requests</strong></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information
                against unauthorized access, alteration, disclosure, or destruction. Your password is encrypted
                using industry-standard security practices. All tracked data is stored securely and accessed only
                by authorized personnel for legitimate platform operations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Information Sharing and Disclosure</h2>
              <p>
                We do not sell, trade, or rent your personal information to third parties for marketing purposes. 
                However, we may share your information in the following circumstances:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>With your explicit consent</li>
                <li>To protect our rights and prevent fraud</li>
                <li><strong className="text-red-400">To comply with legal obligations, including law enforcement and government requests</strong></li>
                <li><strong className="text-red-400">When required by government authorities investigating illegal activities</strong></li>
                <li><strong className="text-red-400">In response to valid legal processes such as court orders or subpoenas</strong></li>
              </ul>
              <p className="mt-3 text-red-400 font-semibold">
                Important: If any government authority requests user data related to illegal activities, 
                we are legally obligated to provide full cooperation and disclose all relevant user information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Geographic Restrictions</h2>
              <p>
                We reserve the right to restrict or block access from specific countries or regions at any time. 
                Access restrictions may be implemented based on:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Government regulations and legal requirements</li>
                <li>Official requests from governmental authorities</li>
                <li>Compliance with international sanctions and restrictions</li>
                <li>Platform security and operational considerations</li>
              </ul>
              <p className="mt-3">
                <strong>If we receive a valid request from any government authority regarding platform operations 
                or user activities, and we determine there are legitimate reasons for concern, we may immediately 
                block access from that country or region.</strong>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Your Rights</h2>
              <p>Subject to legal and operational requirements, you have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Access and update your personal information</li>
                <li>Request deletion of your account and data (subject to legal retention requirements)</li>
                <li>Opt-out of promotional communications</li>
                <li>Request a copy of your data (subject to security verification)</li>
              </ul>
              <p className="mt-3 text-yellow-400">
                Note: Certain data may be retained for legal compliance, fraud prevention, and dispute resolution 
                purposes even after account deletion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Cookies and Tracking Technologies</h2>
              <p>
                We use cookies and similar tracking technologies to maintain your session, remember your preferences,
                analyze platform usage, prevent fraud, and improve our services. By using our platform, you consent
                to our use of these tracking technologies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Data Retention</h2>
              <p>
                We retain your personal information and activity logs for as long as necessary to provide our services,
                comply with legal obligations, resolve disputes, and enforce our agreements. Even after account closure,
                certain data may be retained for legal and operational purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
                the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of the platform
                after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact our support team through
                the platform's official support channels.
              </p>
            </section>

            <p className="text-sm text-white/60 mt-8">
              Last Updated: October 23, 2025
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
