import { SangTXStaticPage, SectionHeading, Para, List, Emphasis } from './SangTXStaticPage';
import { motion, useReducedMotion } from 'framer-motion';

export function SangTXLegalContactPage() {
  const shouldReduce = useReducedMotion();

  return (
    <SangTXStaticPage
      title="Legal Contact"
      description="Contact information for legal inquiries regarding SangTX"
    >
      <Para>
        <Emphasis>Last Updated: September 2026</Emphasis>
      </Para>

      <Para>
        For legal inquiries, disputes, policy questions, or formal notices regarding SangTX, please contact us using the information below.
      </Para>

      <SectionHeading>Primary Contact</SectionHeading>

      <motion.div
        initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(96, 165, 250, 0.05) 100%)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          borderRadius: 8,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <Para style={{ marginBottom: 16 }}>
          <Emphasis style={{ fontSize: 16, color: '#60a5fa' }}>SangTX Legal Team</Emphasis>
        </Para>
        <Para>
          <Emphasis>Email:</Emphasis>{' '}
          <a href="mailto:legal@swiftgrowthdigital.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>
            legal@swiftgrowthdigital.com
          </a>
        </Para>
        <Para>
          <Emphasis>Website:</Emphasis>{' '}
          <a href="https://sangtx.com" style={{ color: '#60a5fa', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
            https://sangtx.com
          </a>
        </Para>
      </motion.div>

      <SectionHeading>Organization Information</SectionHeading>

      <Para>
        SangTX is operated by:
      </Para>

      <motion.div
        initial={shouldReduce ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(96, 165, 250, 0.05) 100%)',
          border: '1px solid rgba(96, 165, 250, 0.3)',
          borderRadius: 8,
          padding: 24,
          marginBottom: 32,
        }}
      >
        <Para>
          <Emphasis>SwiftGrowthDigital</Emphasis>
        </Para>
        <Para style={{ color: '#94a3b8', fontSize: 14, marginBottom: 0 }}>
          A digital marketing and software development company providing SaaS platforms for local news publishers.
        </Para>
      </motion.div>

      <SectionHeading>Contact Methods</SectionHeading>

      <Para><Emphasis>Email (Preferred)</Emphasis></Para>

      <Para>
        Send all legal inquiries, policy questions, disputes, or formal notices to:
      </Para>

      <Para style={{ fontSize: 14, fontFamily: 'monospace', background: 'rgba(148, 163, 184, 0.1)', padding: 12, borderRadius: 4, marginBottom: 24 }}>
        legal@swiftgrowthdigital.com
      </Para>

      <List items={[
        'Describe your inquiry clearly',
        'Include relevant account details or transaction information',
        'Provide supporting documentation or evidence',
        'Specify the policy or issue you are referencing',
        'Include your contact information and preferred method of reply',
      ]} />

      <Para>
        <Emphasis>Response Time:</Emphasis> We aim to respond to legal inquiries within 5-7 business days. Complex matters may require additional time.
      </Para>

      <SectionHeading>Types of Inquiries</SectionHeading>

      <Para><Emphasis>This contact is appropriate for:</Emphasis></Para>

      <List items={[
        'Policy questions or clarifications',
        'Requests for data access or deletion',
        'Payment disputes or refund requests',
        'Intellectual property or copyright claims',
        'Privacy or security concerns',
        'Account termination or suspension appeals',
        'Formal legal notices or cease & desist letters',
        'Grievances or complaints',
        'Terms of Service interpretation',
        'Accessibility requests (ADA compliance)',
      ]} />

      <Para><Emphasis>For other inquiries, use:</Emphasis></Para>

      <List items={[
        'General customer support: support@swiftgrowthdigital.com',
        'Technical issues: support@swiftgrowthdigital.com',
        'Business partnerships: contact@swiftgrowthdigital.com',
        'Emergency security issues: urgent inquiries should also use legal@swiftgrowthdigital.com with "URGENT SECURITY" in subject line',
      ]} />

      <SectionHeading>Formal Legal Documents</SectionHeading>

      <Para>
        For formal legal notices (cease & desist, subpoena response, etc.), include:
      </Para>

      <List items={[
        'Your full name and entity name (if applicable)',
        'Your address and contact information',
        'Clear description of the legal matter',
        'Reference to specific SangTX terms or policies',
        'Supporting documentation or evidence',
        'Requested resolution or relief',
        'Date and signature (for formal notices)',
      ]} />

      <SectionHeading>Data Access and Privacy Requests</SectionHeading>

      <Para>
        To exercise privacy rights under applicable law (access, correction, deletion, portability):
      </Para>

      <List items={[
        'Email legal@swiftgrowthdigital.com with "PRIVACY REQUEST" in the subject',
        'Specify the right you are exercising (access, correction, deletion, portability, opt-out)',
        'Include your full name and account information',
        'Verify your identity as requested',
        'We will respond within 30-45 days (timeframe depends on applicable law)',
      ]} />

      <SectionHeading>Dispute Resolution</SectionHeading>

      <Para>
        <Emphasis>Grievance Process:</Emphasis>
      </Para>

      <List items={[
        '1. Submit written grievance to legal@swiftgrowthdigital.com',
        '2. Include specific complaint, evidence, and requested resolution',
        '3. SangTX acknowledges receipt within 2 business days',
        '4. Investigation conducted within 7-10 business days',
        '5. Written response provided with findings and resolution',
        '6. If unresolved, escalate to management review',
      ]} />

      <Para>
        <Emphasis>Further Escalation:</Emphasis> If you are not satisfied with our response, you may pursue remedies available under applicable law in your jurisdiction.
      </Para>

      <SectionHeading>Important Notes</SectionHeading>

      <Para>
        Please note:
      </Para>

      <List items={[
        'Include "LEGAL INQUIRY" or "PRIVACY REQUEST" in email subject lines for proper routing',
        'Do not include credit card numbers, passwords, or sensitive credentials in emails',
        'For account-related emergencies, mark emails as "URGENT"',
        'We do not accept legal service by email alone; formal service of legal documents may require other methods',
        'All communications may be monitored and retained for legal compliance',
      ]} />

      <SectionHeading>Governing Law and Jurisdiction</SectionHeading>

      <Para>
        Legal matters related to SangTX are governed by the laws of <Emphasis>India</Emphasis>. Any legal disputes are subject to the exclusive jurisdiction of courts in <Emphasis>Patna, Bihar, India</Emphasis>.
      </Para>

      <SectionHeading>Accessibility</SectionHeading>

      <Para>
        If you require accommodations to access SangTX policies or communicate with our legal team, please indicate this in your email. We will make reasonable efforts to accommodate your needs.
      </Para>

      <Para style={{ fontSize: 12, color: '#94a3b8', marginTop: 32 }}>
        <Emphasis>Last Updated: September 2026</Emphasis>
        <br />
        This contact information may be updated periodically. Check https://sangtx.com/legal-contact for the most current information.
      </Para>
    </SangTXStaticPage>
  );
}
