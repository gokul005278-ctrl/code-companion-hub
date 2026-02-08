import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Search,
  Book,
  HelpCircle,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  Camera,
  Users,
  Calendar,
  CreditCard,
  FolderOpen,
  Settings,
  BarChart,
  Shield,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface GuideSection {
  title: string;
  icon: React.ElementType;
  description: string;
  topics: string[];
}

const faqData: FAQItem[] = [
  {
    question: 'How do I create a new booking?',
    answer: 'Navigate to Bookings page and click "Add Booking". Fill in client details, event type, date, and package. You can also assign team members and track payment status.',
  },
  {
    question: 'How can I share photos with clients for selection?',
    answer: 'Go to Media → Create a folder for the booking → Upload photos → Click "Share" to generate a secure link with password protection. Clients can view and select their favorites.',
  },
  {
    question: 'How do I track payments and generate invoices?',
    answer: 'Each booking shows payment status. Click on a booking to view details, then use the "Invoice" button to generate and download a PDF invoice with GST details.',
  },
  {
    question: 'Can I assign multiple team members to a booking?',
    answer: 'Yes! Open any booking and click "Manage" under the Team section. You can select photographers, videographers, and other team members. Conflicts are highlighted if they have overlapping events.',
  },
  {
    question: 'How do I track expenses for each booking?',
    answer: 'Go to Expenses page and click "Add Expense". You can link expenses to specific bookings, categorize them, and track overall profitability in Reports.',
  },
  {
    question: 'How does the lead capture widget work?',
    answer: 'Go to Settings → Widget tab. Configure your lead form, customize colors, and get an embed code. Place it on your website to capture leads directly into the system.',
  },
  {
    question: 'Can I create custom packages with add-ons?',
    answer: 'Yes! In Packages, you can create base packages with deliverables. Add-ons can be created separately and added to individual bookings with custom pricing.',
  },
  {
    question: 'How do I change my password?',
    answer: 'Go to Settings → Security tab. Enter your current password, then set a new password. You can also sign out from all devices for security.',
  },
  {
    question: 'How can I view my business analytics?',
    answer: 'The Reports page shows revenue trends, expense breakdowns, booking status distribution, team performance, and business insights. Use date filters for different periods.',
  },
  {
    question: 'What is the productivity score on the dashboard?',
    answer: 'The productivity score shows your task completion rate. It calculates how many booking tasks are completed vs total tasks, helping you track workflow efficiency.',
  },
];

const guideData: GuideSection[] = [
  {
    title: 'Bookings Management',
    icon: Calendar,
    description: 'Create, manage, and track event bookings from inquiry to delivery',
    topics: [
      'Creating new bookings with client and package details',
      'Tracking booking status through the workflow',
      'Assigning team members to events',
      'Managing tasks and checklists for each booking',
      'Post-completion tracking (album delivery, final payment)',
      'Generating professional invoices with GST',
    ],
  },
  {
    title: 'Client Management',
    icon: Users,
    description: 'Maintain your client database and communication history',
    topics: [
      'Adding and updating client information',
      'Viewing client booking history',
      'Special instructions and notes per client',
      'Converting leads to clients',
    ],
  },
  {
    title: 'Media & Galleries',
    icon: FolderOpen,
    description: 'Upload, organize, and share photos with clients',
    topics: [
      'Creating folders for each booking',
      'Bulk uploading photos and videos',
      'Generating secure client access links',
      'Password protection and expiry settings',
      'Client photo selection and feedback',
      'Download restrictions and watermarks',
    ],
  },
  {
    title: 'Packages & Pricing',
    icon: Camera,
    description: 'Configure service packages with deliverables and add-ons',
    topics: [
      'Creating packages with photos, videos, reels count',
      'Setting photography types (Candid, Traditional, Drone)',
      'Album configuration and delivery timelines',
      'Creating reusable add-ons with pricing',
      'Including/excluding items in packages',
    ],
  },
  {
    title: 'Financial Tracking',
    icon: CreditCard,
    description: 'Track payments, expenses, and profitability',
    topics: [
      'Recording advance and final payments',
      'Tracking pending balances per booking',
      'Categorizing and managing expenses',
      'Linking expenses to specific bookings',
      'Viewing profit margins and cash flow',
    ],
  },
  {
    title: 'Reports & Analytics',
    icon: BarChart,
    description: 'Gain insights into your business performance',
    topics: [
      'Revenue and expense trends over time',
      'Booking and client statistics',
      'Team performance metrics',
      'Package popularity analysis',
      'Business health insights and recommendations',
    ],
  },
  {
    title: 'Team Management',
    icon: Users,
    description: 'Manage your photographers, videographers, and crew',
    topics: [
      'Adding team members with roles',
      'Setting availability status',
      'In-house vs freelance classification',
      'Viewing team assignment history',
      'Conflict detection for overlapping events',
    ],
  },
  {
    title: 'Settings & Security',
    icon: Shield,
    description: 'Configure your account and studio preferences',
    topics: [
      'Updating profile and studio information',
      'Setting up GST and tax details',
      'Managing notification preferences',
      'Changing password securely',
      'Signing out from all devices',
    ],
  },
];

export default function HelpSupport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'guides' | 'faq' | 'contact'>('guides');

  const filteredFAQ = faqData.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGuides = guideData.filter(
    (guide) =>
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.topics.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <MainLayout title="Help & Support" subtitle="Everything you need to get started and troubleshoot">
      {/* Search */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search for help topics, guides, or FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 text-base"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-8">
        {[
          { key: 'guides', label: 'Feature Guides', icon: Book },
          { key: 'faq', label: 'FAQs', icon: HelpCircle },
          { key: 'contact', label: 'Contact Support', icon: MessageCircle },
        ].map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            onClick={() => setActiveTab(tab.key as any)}
            className="gap-2"
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'guides' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {filteredGuides.map((guide) => (
            <div key={guide.title} className="zoho-card p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10 flex-shrink-0">
                  <guide.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{guide.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{guide.description}</p>
                  <ul className="space-y-2">
                    {guide.topics.map((topic, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Zap className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
          {filteredGuides.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground">
              <Book className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No guides found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'faq' && (
        <div className="max-w-3xl mx-auto">
          {filteredFAQ.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-3">
              {filteredFAQ.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="zoho-card px-6 border-0"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <span className="text-left font-medium">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No FAQs found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'contact' && (
        <div className="max-w-2xl mx-auto">
          <div className="zoho-card p-8 text-center">
            <MessageCircle className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Need More Help?</h2>
            <p className="text-muted-foreground mb-8">
              Our support team is here to assist you. Reach out through any of these channels.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <a
                href="mailto:support@studioflow.app"
                className="p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors flex items-center gap-3"
              >
                <div className="p-3 rounded-lg bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@studioflow.app</p>
                </div>
              </a>

              <a
                href="tel:+919876543210"
                className="p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors flex items-center gap-3"
              >
                <div className="p-3 rounded-lg bg-success/10">
                  <Phone className="h-5 w-5 text-success" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">+91 98765 43210</p>
                </div>
              </a>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 text-left">
              <h4 className="font-medium mb-2">Support Hours</h4>
              <p className="text-sm text-muted-foreground">
                Monday - Saturday: 9:00 AM - 7:00 PM IST<br />
                Sunday: 10:00 AM - 2:00 PM IST
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="font-medium mb-4">Quick Links</h4>
              <div className="flex flex-wrap justify-center gap-3">
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Documentation
                  <ExternalLink className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Community Forum
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
