import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import FallingAnimation from "@/components/falling-animation";

export default function TermsOfServicePage() {
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
          <h1 className="text-white text-lg font-semibold">Terms of Service</h1>
        </div>
      </header>

      <main className="p-4 pb-20 max-w-4xl mx-auto">
        <Card className="bg-black/30 backdrop-blur-md border border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="text-white/80 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Agreement to Terms</h2>
              <p>
                By accessing and using this platform, you agree to be bound by these Terms of Service and all
                applicable laws and regulations. If you do not agree with any of these terms, you are prohibited
                from using this platform. Your continued use constitutes acceptance of all terms and conditions
                outlined herein.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Account Responsibilities</h2>
              <p>You are responsible for:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Ensuring your account information is accurate and up-to-date</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li><strong>Maintaining only ONE account per person/device</strong></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Multiple Account Policy and Enforcement</h2>
              <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
                <p className="font-semibold text-red-400 mb-2">STRICT ENFORCEMENT:</p>
                <p className="mb-3">
                  Our system automatically tracks and monitors all user activities including IP addresses, device identifiers, 
                  browser fingerprints, and session data. Creating or operating multiple accounts from the same device or 
                  attempting to circumvent our detection systems will result in immediate action.
                </p>
                <p className="font-semibold mb-2">Consequences for Multiple Accounts:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>First Offense:</strong> Temporary account suspension pending investigation</li>
                  <li><strong>Confirmed Violation:</strong> Permanent ban from the platform</li>
                  <li><strong>All associated accounts will be suspended or permanently banned</strong></li>
                  <li><strong>Unban requests are NOT automatically granted</strong></li>
                </ul>
                <p className="mt-3 font-semibold text-yellow-400">
                  Unban Process: Users seeking account reinstatement must submit a formal appeal with complete personal 
                  details and valid identification. Our team will review each case individually. If the user fails to 
                  provide satisfactory verification or if the violation is deemed severe, the ban will remain PERMANENT 
                  with full access denial.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">User Responsibility for Gaming Activities</h2>
              <div className="bg-yellow-900/30 border border-yellow-500/50 p-4 rounded-lg">
                <p className="font-semibold text-yellow-400 mb-2">IMPORTANT DISCLAIMER:</p>
                <p className="mb-3">
                  <strong>All wins and losses incurred during gaming activities are the sole responsibility of the user.</strong>
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>You acknowledge that gaming involves risk and potential financial loss</li>
                  <li>All betting decisions are made independently by the user</li>
                  <li>Our team bears NO RESPONSIBILITY for any losses incurred</li>
                  <li>We do not guarantee wins or provide financial advice</li>
                  <li>You are responsible for managing your own bankroll and betting limits</li>
                  <li><strong>By using this platform, you accept full responsibility for all gaming outcomes</strong></li>
                </ul>
                <p className="mt-3 text-red-400 font-semibold">
                  The platform and its team will not be held liable for any financial losses, regardless of circumstances.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Betting and Gaming Rules</h2>
              <p>When participating in games and betting activities:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>You must be of legal age in your jurisdiction</li>
                <li>All bets are final once confirmed and cannot be reversed</li>
                <li>Game results are determined by our verified random number generation system</li>
                <li>We reserve the right to void bets in case of technical errors or suspicious activity</li>
                <li>VIP level determines maximum bet limits and other privileges</li>
                <li>Manipulation attempts or exploitation of system vulnerabilities will result in immediate account termination</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Deposits and Withdrawals</h2>
              <p>Regarding financial transactions:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Deposits are subject to minimum and maximum limits</li>
                <li>Withdrawal requests are processed according to our verification procedures</li>
                <li>We reserve the right to request additional verification for large transactions</li>
                <li>Suspicious transactions may be frozen pending investigation</li>
                <li>Transaction fees may apply as specified in our fee schedule</li>
                <li>Withdrawals from banned or suspended accounts will be withheld pending review</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Referral Program</h2>
              <p>Our referral program operates under the following terms:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Commission rates are based on your VIP level</li>
                <li>Commissions are earned from referred users' legitimate betting activities</li>
                <li>We reserve the right to suspend referral accounts showing suspicious activity</li>
                <li>Self-referrals or referral fraud will result in permanent ban</li>
                <li>Commission withdrawal follows the same rules as regular withdrawals</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Prohibited Activities</h2>
              <p>The following activities are strictly prohibited and will result in immediate account termination:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Creating or using multiple accounts from the same device</strong></li>
                <li>Using multiple accounts to abuse promotions or bonuses</li>
                <li>Attempting to manipulate or exploit system vulnerabilities</li>
                <li>Engaging in any form of fraud or money laundering</li>
                <li>Using automated systems, bots, or scripts for betting</li>
                <li>Sharing or selling your account credentials</li>
                <li>Colluding with other users to manipulate outcomes</li>
                <li>Using VPNs or proxies to circumvent geographic restrictions</li>
                <li>Providing false information during registration or verification</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Legal Compliance and Government Cooperation</h2>
              <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
                <p className="font-semibold text-red-400 mb-2">MANDATORY DISCLOSURE:</p>
                <p className="mb-3">
                  We are committed to operating in full compliance with all applicable laws and regulations. 
                  <strong> If any government authority or law enforcement agency requests user data or information 
                  related to illegal activities, we are legally obligated to provide full cooperation.</strong>
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>We will disclose all requested user information to government authorities</li>
                  <li>This includes but is not limited to: account details, transaction history, IP addresses, 
                      device information, and activity logs</li>
                  <li>Users will NOT be notified prior to information disclosure if prohibited by law</li>
                  <li>We maintain the right to cooperate with investigations without user consent</li>
                </ul>
                <p className="mt-3 text-yellow-400 font-semibold">
                  By using this platform, you acknowledge and accept that your information may be shared with 
                  government authorities when legally required.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Geographic Restrictions and Country Blocking</h2>
              <p>
                We reserve the right to restrict or block access from any country or region at our sole discretion. 
                Access may be blocked based on:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Government regulations and legal requirements</li>
                <li>Official requests or inquiries from governmental authorities</li>
                <li>Compliance with international sanctions and restrictions</li>
                <li>Platform security and risk management considerations</li>
              </ul>
              <p className="mt-3 font-semibold text-yellow-400">
                Important: If we receive any request from a government authority that raises legitimate concerns 
                regarding platform operations, user activities, or compliance matters, we may immediately implement 
                geographic blocking for that country or region without prior notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Limitation of Liability</h2>
              <p>
                We are not liable for any direct, indirect, incidental, special, consequential, or punitive damages 
                arising from your use of this platform. We do not guarantee uninterrupted or error-free service and 
                reserve the right to modify or discontinue services at any time without notice.
              </p>
              <p className="mt-2 font-semibold">
                You expressly agree that your use of this platform is at your sole risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Account Termination</h2>
              <p>We reserve the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Suspend or terminate accounts that violate these terms</li>
                <li>Permanently ban users engaged in fraudulent activities</li>
                <li>Withhold funds from accounts under investigation</li>
                <li>Close accounts at our discretion with or without notice</li>
                <li>Deny reinstatement requests for permanently banned accounts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Service at any time. Changes will be effective
                immediately upon posting. Your continued use of the platform after changes constitutes acceptance
                of the modified terms. It is your responsibility to review these terms periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Governing Law and Dispute Resolution</h2>
              <p>
                These Terms of Service shall be governed by and construed in accordance with applicable laws.
                Any disputes arising from these terms shall be resolved through appropriate legal channels as 
                determined by the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Severability</h2>
              <p>
                If any provision of these Terms is found to be unenforceable or invalid, that provision will be 
                limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain 
                in full force and effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">Contact Information</h2>
              <p>
                For questions or concerns about these Terms of Service, please contact our support team through
                the platform's official support channels.
              </p>
            </section>

            <div className="bg-blue-900/30 border border-blue-500/50 p-4 rounded-lg mt-6">
              <p className="font-semibold text-blue-400 mb-2">ACKNOWLEDGMENT:</p>
              <p>
                By using this platform, you acknowledge that you have read, understood, and agree to be bound by 
                these Terms of Service. You further acknowledge your understanding of the account policies, 
                liability limitations, and cooperation requirements with government authorities as outlined above.
              </p>
            </div>

            <p className="text-sm text-white/60 mt-8">
              Last Updated: October 23, 2025
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
