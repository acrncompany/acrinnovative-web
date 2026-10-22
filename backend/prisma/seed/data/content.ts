// Initial site content, copied from reference/acrinnovative-static (the live static site).
// Text markup conventions used in TEXT blocks:
//   [[highlighted words]]  -> rendered with the accent colour
//   a newline              -> rendered as <br>
// RICHTEXT blocks hold sanitised HTML.

export type BlockSeed = {
  pageKey: string;
  blockKey: string;
  label: string;
  type: 'TEXT' | 'TEXTAREA' | 'RICHTEXT' | 'IMAGE';
  value?: string;
  image?: { file: string; alt: string };
};

export const settings = {
  siteName: 'ACR Innovative Management Services',
  brandName: 'ACR Innovative',
  brandSub: 'Management Services',
  legalName: 'ACR Innovative Management Services Pvt. Ltd',
  tagline: 'Advisory that Goes Beyond Numbers.',
  contactEmail: 'acrandcompany@gmail.com',
  notificationEmail: 'acrandcompany@gmail.com',
  footerText: '© {year} ACR Innovative Management Services Pvt. Ltd. All rights reserved.',
  headerButtonLabel: 'Get in Touch',
  headerButtonUrl: '/contact',
  defaultMetaTitleSuffix: 'ACR Innovative Management Services',
  defaultMetaDescription:
    'Integrated financial, regulatory, and business consulting for startups, SMEs and enterprises. Calicut, Kerala & Dubai.',
  keywords:
    'ACR, management consulting, CA firm Kerala, business advisory, GST consultant Calicut, chartered accountant Kerala',
  author: 'ACR Innovative Management Services Pvt. Ltd',
  themeColor: '#C89B42',
  foundingYear: '2000',
  orgDescription:
    'Professional advisory firm delivering integrated financial, regulatory, and business consulting solutions.',
};

export const offices = [
  {
    name: 'India (Head Office)',
    shortName: 'India Office',
    addressLines: '59/7706, ACR Bhawan\nAnnie Hall Cross Road\nCalicut, Kerala — 673 001\nIndia',
    contactAddressLines: '59/7706, ACR Bhawan\nAnnie Hall Cross Road\nCalicut, Kerala 673001',
    streetAddress: '59/7706, ACR Bhawan, Annie Hall Cross Road',
    city: 'Calicut',
    region: 'Kerala',
    postalCode: '673001',
    countryCode: 'IN',
    country: 'India',
    phone: '+91 9447157549',
    phoneRaw: '+919447157549',
    isHeadOffice: true,
    sortOrder: 1,
  },
  {
    name: 'Dubai Office',
    shortName: 'Dubai Office',
    addressLines: '963, Al Qusais First\nDubai\nUnited Arab Emirates',
    contactAddressLines: '963, Al Qusais First\nDubai, UAE',
    streetAddress: '963, Al Qusais First',
    city: 'Dubai',
    region: null,
    postalCode: null,
    countryCode: 'AE',
    country: 'United Arab Emirates',
    phone: '+971 56 283 1312',
    phoneRaw: '+971562831312',
    isHeadOffice: false,
    sortOrder: 2,
  },
];

const nav = [
  ['Home', '/'],
  ['Services', '/services'],
  ['About Us', '/about'],
  ['How We Work', '/how-we-work'],
  ['Insights', '/insights'],
  ['Careers', '/careers'],
  ['Contact', '/contact'],
];
export const menuItems = (['HEADER', 'FOOTER'] as const).flatMap((location) =>
  nav.map(([label, url], i) => ({ location, label, url, sortOrder: i + 1 })),
);

// Home <title> is just the brand (no "Home"). Other pages fall back to "Page — Brand".
export const pages: { key: string; title: string; slug: string; metaTitle?: string }[] = [
  { key: 'home', title: 'Home', slug: '', metaTitle: settings.siteName },
  { key: 'services', title: 'Services', slug: 'services' },
  { key: 'about', title: 'About Us', slug: 'about' },
  { key: 'how-we-work', title: 'How We Work', slug: 'how-we-work' },
  { key: 'insights', title: 'Insights', slug: 'insights' },
  { key: 'careers', title: 'Careers', slug: 'careers' },
  { key: 'contact', title: 'Contact', slug: 'contact' },
];

export const heroSlides = [
  {
    heading: 'Advisory that Goes',
    accentText: 'Beyond Numbers.',
    lead: 'From Compliance to Clarity. From Data to Decisions.',
    body: 'Integrated financial, regulatory, and business consulting for startups, SMEs, and enterprises across India and the UAE.',
    image: { file: 'banner111.webp', alt: 'ACR Innovative Management Services — Advisory firm' },
    cta1Label: 'Explore Services', cta1Url: '/services',
    cta2Label: 'Get in Touch', cta2Url: '/contact',
  },
  {
    heading: '25+ Years of Trusted\nFinancial Expertise.',
    accentText: null,
    lead: 'Statutory audits, GST compliance, tax planning — handled by qualified CAs with deep sectoral knowledge.',
    body: 'Over 2,000 businesses across Kerala and the UAE rely on ACR for clarity, compliance, and confident decision-making.',
    image: { file: 'banner2.webp', alt: '25 years of trusted financial expertise' },
    cta1Label: 'About ACR', cta1Url: '/about',
    cta2Label: 'Our Services', cta2Url: '/services',
  },
  {
    heading: 'Where Indian Expertise\nMeets Global Standards.',
    accentText: null,
    lead: 'Integrated advisory for businesses operating across India and the UAE.',
    body: 'Regulatory compliance, business structuring, and financial governance — seamlessly coordinated across both jurisdictions.',
    image: { file: 'banner33.webp', alt: 'ACR — India and UAE advisory presence' },
    cta1Label: 'Talk to Our Experts', cta1Url: '/contact',
    cta2Label: 'How We Work', cta2Url: '/how-we-work',
  },
];

export const stats = [
  { group: 'HOME', label: 'Years of Experience', value: 25, suffix: '+', icon: { file: 'in-wave-icon-1.svg', alt: 'years of experience' } },
  { group: 'HOME', label: 'Clients Served', value: 2000, suffix: '+', icon: { file: 'in-wave-icon-2.svg', alt: 'clients served' } },
  { group: 'HOME', label: 'Industries Covered', value: null, suffix: '', textValue: 'All Sectors', icon: { file: 'in-wave-icon-3.svg', alt: 'industries covered' } },
  { group: 'HOME', label: 'Expert Professionals', value: 50, suffix: '+', icon: { file: 'in-wave-icon-4.svg', alt: 'expert professionals' } },
  {
    group: 'ABOUT', label: 'Years of Experience', value: 25, suffix: '+',
    description: 'Over two decades of professional advisory across taxation, compliance, audit, and business consulting in India and the UAE.',
  },
  {
    group: 'ABOUT', label: 'Clients Served', value: 2000, suffix: '+',
    description: 'Startups, SMEs, and enterprises across every major sector — from incorporation through transformation.',
  },
  {
    group: 'ABOUT', label: 'Expert Professionals', value: 50, suffix: '+',
    description: 'A multidisciplinary team of CAs, Company Secretaries, legal advisors, and business consultants working as one integrated unit.',
  },
];

type F = { group: string; icon: string; title: string; subtitle?: string; body: string };
export const featureItems: F[] = [
  // Home: structured approach
  { group: 'HOME_PROCESS', icon: 'fas fa-search', title: 'Discover', body: 'Understand your goals, challenges, and regulatory environment' },
  { group: 'HOME_PROCESS', icon: 'fas fa-map', title: 'Strategise', body: 'Design a tailored, execution-ready roadmap aligned to your goals' },
  { group: 'HOME_PROCESS', icon: 'fas fa-rocket', title: 'Execute', body: 'Deliver results with expert oversight and full accountability' },
  // Home: why choose
  { group: 'WHY_CHOOSE', icon: 'fas fa-users', title: 'Multidisciplinary Expertise', body: 'CAs, Company Secretaries, legal professionals, and business consultants working as one integrated team — covering every aspect of your business needs.' },
  { group: 'WHY_CHOOSE', icon: 'fas fa-chart-bar', title: 'Technology-Enabled Finance', body: 'Real-time dashboards, KPI frameworks, and BI tools built for decision-makers — turning your financial data into competitive advantage.' },
  { group: 'WHY_CHOOSE', icon: 'fas fa-tasks', title: 'Execution-Focused Advisory', body: 'We go beyond compliance — driving implementation, process control, and organizational transformation with precision and accountability.' },
  { group: 'WHY_CHOOSE', icon: 'fas fa-globe', title: 'Dual-Country Presence', body: 'Serving clients in India and the UAE with local regulatory expertise, established presence, and consistent service quality in both markets.' },
  // Home: trust badges
  { group: 'HOME_TRUST', icon: 'fas fa-users', title: 'Multidisciplinary Team', body: '' },
  { group: 'HOME_TRUST', icon: 'fas fa-university', title: '25+ Years Experience', body: '' },
  { group: 'HOME_TRUST', icon: 'fas fa-globe', title: 'India & UAE Presence', body: '' },
  // About: mission / vision / values
  { group: 'ABOUT_PILLAR', icon: 'fas fa-compass', title: 'Our Mission', body: 'To deliver integrated, execution-focused advisory that helps businesses achieve compliance, financial clarity, and sustainable growth — across every stage of their journey.' },
  { group: 'ABOUT_PILLAR', icon: 'fas fa-eye', title: 'Our Vision', body: 'To be the most trusted advisory partner for Indian and UAE businesses — recognised for our depth of expertise, accountability in delivery, and commitment to client success.' },
  { group: 'ABOUT_PILLAR', icon: 'fas fa-handshake', title: 'Our Values', body: 'Integrity, precision, and partnership. We hold ourselves to the same standards we advise our clients to maintain — and we back our recommendations with ownership and follow-through.' },
  // About: disciplines
  { group: 'TEAM_DISCIPLINE', icon: 'fas fa-calculator', title: 'Chartered Accountants', body: 'Taxation, audit, and financial advisory specialists with deep statutory expertise.' },
  { group: 'TEAM_DISCIPLINE', icon: 'fas fa-gavel', title: 'Company Secretaries', body: 'Corporate compliance, ROC filings, and secretarial practice professionals.' },
  { group: 'TEAM_DISCIPLINE', icon: 'fas fa-balance-scale', title: 'Legal Professionals', body: 'Regulatory guidance, IP strategy, and contract advisory expertise.' },
  { group: 'TEAM_DISCIPLINE', icon: 'fas fa-chart-line', title: 'Business Consultants', body: 'Strategy, process design, and technology-enabled finance practitioners.' },
  // How we work
  { group: 'ENGAGEMENT_STEP', icon: 'fas fa-comments', title: 'Discovery Call', subtitle: 'Understanding Your Business', body: "We begin with a focused conversation — no forms, no commitment. We listen to where your business stands, what challenges you face, and what outcomes you're aiming for. This session sets the foundation for everything that follows." },
  { group: 'ENGAGEMENT_STEP', icon: 'fas fa-search', title: 'Diagnosis & Scoping', subtitle: 'In-Depth Assessment', body: 'Our team conducts a thorough review of your current financial, regulatory, and operational state. We identify gaps, risks, and opportunities — and define a clear scope of engagement tailored to your specific situation and goals.' },
  { group: 'ENGAGEMENT_STEP', icon: 'fas fa-map-marked-alt', title: 'Proposal & Alignment', subtitle: 'Structured Plan, Clear Terms', body: 'We present a structured proposal: services to be delivered, timelines, responsibilities, and expected outcomes. We align on scope before we begin, so there are no surprises — only clear accountability and shared expectations.' },
  { group: 'ENGAGEMENT_STEP', icon: 'fas fa-tools', title: 'Execution & Delivery', subtitle: 'Implementation with Precision', body: 'Our multidisciplinary team gets to work — handling filings, structuring frameworks, implementing controls, building reports, or executing whatever was agreed. We communicate proactively, deliver on time, and flag issues before they become problems.' },
  { group: 'ENGAGEMENT_STEP', icon: 'fas fa-sync-alt', title: 'Review & Ongoing Support', subtitle: 'Partnership Beyond Delivery', body: 'After delivery, we conduct a structured review to ensure outcomes match expectations. For ongoing engagements, we remain your standing advisory partner — available for questions, regulatory updates, and evolving business needs as your company grows.' },
  // Careers
  { group: 'CAREER_PERK', icon: 'fas fa-brain', title: 'Learn Continuously', body: 'Our work spans taxation, compliance, technology, and strategy. Every engagement is an opportunity to deepen your expertise across disciplines — not just one track.' },
  { group: 'CAREER_PERK', icon: 'fas fa-users', title: 'Strong Team Culture', body: 'We are a collaborative, high-accountability environment. You will work alongside experienced professionals who take quality seriously and support each other\'s growth.' },
  { group: 'CAREER_PERK', icon: 'fas fa-globe', title: 'Dual-Country Exposure', body: 'With offices in Calicut and Dubai, ACR offers exposure to both Indian and UAE regulatory frameworks — broadening your professional perspective and career opportunities.' },
  { group: 'CAREER_AREA', icon: 'fas fa-calculator', title: 'CA & Taxation', body: 'Audit, direct & indirect tax, statutory compliance' },
  { group: 'CAREER_AREA', icon: 'fas fa-gavel', title: 'Corporate & Legal', body: 'Company secretarial, ROC compliance, IP advisory' },
  { group: 'CAREER_AREA', icon: 'fas fa-chart-bar', title: 'Finance & Technology', body: 'FP&A, dashboards, business process automation' },
];

export const teamMembers = [
  {
    name: 'Riju Chandrasekhar, FCA',
    role: 'Founder & Managing Director',
    icon: 'fas fa-user-tie',
    bio:
      'A Fellow Chartered Accountant with over 30 years of experience spanning taxation, audit, financial advisory, and business consulting. Riju founded ACR with the conviction that professional advisory services should be both technically rigorous and practically impactful — serving clients not just at compliance milestones, but throughout every stage of their business journey.\n\n' +
      'Under his leadership, ACR has expanded from a Kerala-based CA practice into a multidisciplinary advisory firm with a dual-country presence, serving clients across India and the UAE.',
  },
];

export const serviceCategories = [
  { title: 'Business Foundation', slug: 'business-foundation' },
  { title: 'Financial & Taxation', slug: 'financial-taxation' },
  { title: 'Governance & Risk', slug: 'governance-risk' },
  { title: 'Technology & Growth', slug: 'technology-growth' },
];

// order here = order on /services (cards cycle through the 4 card backgrounds in this order)
export const services = [
  { cat: 'business-foundation', slug: 'business-setup-structuring', title: 'Business Setup & Structuring', icon: 'fas fa-building',
    summary: 'End-to-end incorporation, legal structuring, and entity setup. We help you choose the right structure for compliance, tax efficiency, and growth.',
    home: { order: 1, text: 'End-to-end support for incorporation, legal structuring, and regulatory setup.' } },
  { cat: 'business-foundation', slug: 'regulatory-registrations', title: 'Regulatory Registrations', icon: 'fas fa-clipboard-list',
    summary: 'GST, MSME, FSSAI, IEC, Shop & Establishment, and all sector-specific registrations handled efficiently and completely.' },
  { cat: 'business-foundation', slug: 'corporate-compliance', title: 'Corporate Compliance', icon: 'fas fa-check-circle',
    summary: 'ROC filings, annual returns, board resolutions, and ongoing secretarial compliance. We keep your company in good standing at all times.' },
  { cat: 'business-foundation', slug: 'intellectual-property-advisory', title: 'Intellectual Property Advisory', icon: 'fas fa-registered',
    summary: 'Trademark registration, copyright advisory, and IP protection strategy. Safeguard your brand and competitive advantage.' },
  { cat: 'financial-taxation', slug: 'taxation-gst', title: 'Taxation & GST', icon: 'fas fa-file-invoice-dollar',
    summary: 'Comprehensive tax planning, GST return filing, income tax advisory, and optimization strategies. Minimize liability, ensure full compliance.',
    home: { order: 3, text: 'Expert tax planning, GST compliance, and advisory that minimizes your burden.' } },
  { cat: 'financial-taxation', slug: 'audit-assurance', title: 'Audit & Assurance', icon: 'fas fa-shield-alt',
    summary: 'Statutory audits, internal audits, and independent assurance services. Trusted financial reporting for investors, lenders, and management.',
    home: { order: 2, text: 'Statutory and internal audits that deliver credibility, control, and confidence.' } },
  { cat: 'financial-taxation', slug: 'financial-planning-analysis', title: 'Financial Planning & Analysis (FP&A)', icon: 'fas fa-chart-pie',
    summary: 'Budgeting, forecasting, variance analysis, and management reporting. Turn your financial data into clear, strategic decisions.' },
  { cat: 'governance-risk', slug: 'internal-controls-governance', title: 'Internal Controls & Governance', icon: 'fas fa-sitemap',
    summary: 'Design and implementation of internal control frameworks, SOPs, and governance structures that protect your business and scale with it.' },
  { cat: 'governance-risk', slug: 'due-diligence', title: 'Due Diligence', icon: 'fas fa-search-dollar',
    summary: 'Financial and operational due diligence for mergers, acquisitions, and investments. Make high-stakes decisions with thorough, expert-led analysis.' },
  { cat: 'governance-risk', slug: 'government-incentives-subsidies', title: 'Government Incentives & Subsidies', icon: 'fas fa-hand-holding-usd',
    summary: 'Identify and access applicable central and state government schemes, subsidies, and grants. Capture every benefit your business is entitled to.' },
  { cat: 'technology-growth', slug: 'technology-enabled-finance', title: 'Technology-Enabled Finance', icon: 'fas fa-chart-line',
    summary: 'Custom dashboards, KPI tracking systems, and BI solutions for real-time visibility into your financial and operational performance.',
    home: { order: 4, text: 'Custom dashboards, KPI frameworks, and BI solutions for real-time visibility.' } },
  { cat: 'technology-growth', slug: 'business-process-automation', title: 'Business Process Automation', icon: 'fas fa-cogs',
    summary: 'Map, design, and implement automation workflows that reduce manual effort, eliminate errors, and create scalable operational foundations.',
    home: { order: 5, text: 'Automation solutions that reduce manual work and build scalable operations.' } },
  { cat: 'technology-growth', slug: 'cost-optimization-business-analysis', title: 'Cost Optimization & Business Analysis', icon: 'fas fa-funnel-dollar',
    summary: 'Detailed analysis of cost structures, margin leakages, and operational inefficiencies. Data-driven strategies to improve profitability and sustainability.' },
];

export const postCategories = [
  { name: 'Taxation', slug: 'taxation' },
  { name: 'Technology', slug: 'technology' },
  { name: 'FP&A', slug: 'fpa' },
];

export const posts = [
  {
    cat: 'taxation', slug: 'gst-compliance-in-2025-what-every-business-must-know',
    title: 'GST Compliance in 2025: What Every Business Must Know',
    p1: 'The GST landscape continues to evolve — from mandatory e-invoicing thresholds to tighter reconciliation requirements under GSTR-2B. Businesses that treat GST as a routine filing exercise are increasingly exposed to notices, interest demands, and penalties.',
    p2: 'In this article, we cover the most significant regulatory updates of 2025, the common compliance gaps we see in practice, and a practical checklist for ensuring your business remains fully compliant.',
    home: 'Key regulatory updates, filing obligations, and risk mitigation strategies every Indian business must be prepared for.',
    author: 'ACR Tax Advisory Team', date: '2025-03-01',
    cover: { file: 'in-acr-insight-1.webp', alt: 'GST Compliance 2025' },
  },
  {
    cat: 'technology', slug: 'how-smes-can-leverage-business-process-automation-to-scale',
    title: 'How SMEs Can Leverage Business Process Automation to Scale',
    p1: 'Most SMEs lose 20–30% of productive capacity to manual, repetitive tasks — data entry, approval workflows, reconciliation, report generation. The cost is not just time; it is errors, delayed decisions, and talent wasted on work that software can handle.',
    p2: 'This article explores where automation creates the most impact for growing businesses and how to build a roadmap that scales with your organisation.',
    home: 'Reduce manual overhead, eliminate errors, and build a scalable operational foundation for sustainable growth.',
    author: 'ACR Technology Practice', date: '2025-02-01',
    cover: { file: 'in-acr-insight-2.webp', alt: 'Business Process Automation for SMEs' },
  },
  {
    cat: 'fpa', slug: 'the-case-for-fpa-why-data-driven-finance-is-the-future',
    title: 'The Case for FP&A: Why Data-Driven Finance is the Future',
    p1: 'Most business owners receive financial reports weeks after the period ends — by which point the data is historical and the opportunity to course-correct has passed. Financial Planning & Analysis changes this entirely.',
    p2: 'We explain what FP&A means in practice for SMEs and why management reporting is the most underutilised tool in most businesses today.',
    home: 'Real-time dashboards and KPI frameworks enable leadership teams to make faster, smarter, more confident decisions.',
    author: 'ACR FP&A Team', date: '2025-01-01',
    cover: { file: 'in-acr-insight-3.webp', alt: 'FPA and data-driven finance' },
  },
];

const b = (pageKey: string, blockKey: string, label: string, value: string, type: BlockSeed['type'] = 'TEXT'): BlockSeed =>
  ({ pageKey, blockKey, label, type, value });

export const blocks: BlockSeed[] = [
  // ---- home
  b('home', 'services_title', 'Core services: title', 'Our [[Core Services]]'),
  b('home', 'services_lead', 'Core services: subtitle', 'Integrated advisory solutions across every stage of your business.'),
  b('home', 'services_note_label', 'Services note: label', 'All Services'),
  b('home', 'services_note_text', 'Services note: text', 'ACR offers 13+ integrated advisory services across business, finance, tax, and technology.'),
  b('home', 'services_note_link', 'Services note: link text', 'View all services →'),
  b('home', 'services_note_url', 'Services note: link URL', '/services'),
  { pageKey: 'home', blockKey: 'about_image', label: 'About blurb: image', type: 'IMAGE', image: { file: 'in-acr-home-about.webp', alt: 'ACR advisory office' } },
  b('home', 'about_title', 'About blurb: title', '25 Years of [[Advisory Excellence]]'),
  b('home', 'about_p1', 'About blurb: paragraph 1', 'ACR Innovative Management Services is a multidisciplinary advisory firm headquartered in Calicut, Kerala, with an office in Dubai. Founded by <strong>Riju Chandrasekhar, FCA</strong> — with over 30 years of finance industry experience — ACR brings together Chartered Accountants, Company Secretaries, legal professionals, and business consultants.', 'RICHTEXT'),
  b('home', 'about_p2', 'About blurb: paragraph 2', 'We partner with startups, SMEs, and enterprises to simplify complexity, ensure compliance, and unlock measurable business value across India and the UAE.', 'RICHTEXT'),
  b('home', 'about_button', 'About blurb: button text', 'About ACR'),
  b('home', 'about_button_url', 'About blurb: button URL', '/about'),
  b('home', 'process_title', 'Process: title', 'A Structured Approach to Every Engagement'),
  b('home', 'process_lead', 'Process: subtitle', 'Our proven process ensures every client gets clarity, strategy, and measurable results.'),
  b('home', 'process_button', 'Process: button text', 'See Our Full Process'),
  b('home', 'process_button_url', 'Process: button URL', '/how-we-work'),
  b('home', 'why_title', 'Why choose us: title', 'Why Leading Businesses [[Choose ACR]]'),
  b('home', 'insights_title', 'Insights preview: title', 'Insights & [[Perspectives]]'),
  b('home', 'insights_lead', 'Insights preview: subtitle', 'Expert views on finance, compliance, technology, and business growth.'),
  b('home', 'insights_button', 'Insights preview: button text', 'View All Insights'),
  b('home', 'cta_title', 'Call to action: title', 'Ready to Build a Structured, [[Insight-Driven]] Business?'),
  b('home', 'cta_lead', 'Call to action: subtitle', 'Talk to our experts today. No commitment, just clarity.'),
  b('home', 'cta_button', 'Call to action: button text', 'Schedule a Consultation'),
  b('home', 'cta_button_url', 'Call to action: button URL', '/contact'),
  // ---- services
  b('services', 'hero_title', 'Page title (h1)', 'Comprehensive Advisory Services for [[Every Stage]] of Your Business'),
  b('services', 'hero_lead', 'Intro text', 'From incorporation to transformation — integrated financial, regulatory, and operational solutions.'),
  b('services', 'cta_lead', 'Bottom call to action: text', "Not sure where to start? Let's find the right solution for your business."),
  b('services', 'cta_button', 'Bottom call to action: button text', 'Talk to Our Experts'),
  b('services', 'cta_button_url', 'Bottom call to action: button URL', '/contact'),
  // ---- about
  b('about', 'hero_title', 'Page title (h1)', 'Advisory That Goes [[Beyond Numbers]]'),
  b('about', 'hero_lead', 'Intro: lead paragraph', 'ACR Innovative Management Services was founded on a simple belief: businesses deserve more than compliance. They deserve clarity, strategy, and a partner who stays accountable through execution.'),
  b('about', 'hero_p1', 'Intro: paragraph 2', 'Founded by Riju Chandrasekhar, FCA — with over 30 years of experience across finance, taxation, and business advisory — ACR has grown into a multidisciplinary firm serving startups, SMEs, and enterprises across India and the UAE. Our team of Chartered Accountants, Company Secretaries, legal professionals, and business consultants works as one integrated unit.'),
  b('about', 'hero_p2', 'Intro: paragraph 3', 'Headquartered in Calicut, Kerala, with an established presence in Dubai, we combine deep local regulatory knowledge with international service standards.'),
  { pageKey: 'about', blockKey: 'hero_image', label: 'Intro image', type: 'IMAGE', image: { file: 'in-acr-about.webp', alt: 'ACR Innovative — professional advisory office' } },
  b('about', 'team_title', 'Team section: title', 'Leadership & [[Team]]'),
  b('about', 'team_lead', 'Team section: subtitle', 'Built on deep expertise, guided by experience.'),
  b('about', 'track_kicker', 'Track record: small heading', 'Our track record'),
  b('about', 'track_title', 'Track record: title', 'Numbers That \nReflect Our [[Commitment]]'),
  b('about', 'track_button', 'Track record: button text', 'Work With Us'),
  b('about', 'track_button_url', 'Track record: button URL', '/contact'),
  // ---- how we work
  b('how-we-work', 'hero_title', 'Page title (h1)', 'Our [[Engagement Process]]'),
  b('how-we-work', 'hero_lead', 'Intro text', 'We follow a structured, five-step approach designed to deliver clarity at every stage — from the first conversation to ongoing partnership.'),
  b('how-we-work', 'cta_lead', 'Bottom call to action: text', "Ready to get started? Let's begin with a conversation."),
  b('how-we-work', 'cta_button', 'Bottom call to action: button text', 'Schedule a Discovery Call'),
  b('how-we-work', 'cta_button_url', 'Bottom call to action: button URL', '/contact'),
  // ---- insights
  b('insights', 'hero_title', 'Page title (h1)', 'Insights & [[Perspectives]]'),
  b('insights', 'hero_lead', 'Intro text', 'Expert commentary on finance, compliance, technology, and business growth — written by the ACR team.'),
  b('insights', 'cta_lead', 'Bottom call to action: text', "Have a topic you'd like us to cover? We're always writing about what matters to our clients."),
  b('insights', 'cta_button', 'Bottom call to action: button text', 'Get in Touch'),
  b('insights', 'cta_button_url', 'Bottom call to action: button URL', '/contact'),
  // ---- careers
  { pageKey: 'careers', blockKey: 'hero_image', label: 'Top image', type: 'IMAGE', image: { file: 'in-acr-careers.webp', alt: 'ACR team workspace' } },
  b('careers', 'hero_title', 'Page title (h1)', 'Join Our [[Team]]'),
  b('careers', 'hero_lead', 'Intro: lead paragraph', 'At ACR, we believe the best advisory comes from a team that genuinely cares — about the work, about each other, and about the clients we serve.'),
  b('careers', 'hero_p1', 'Intro: paragraph 2', 'We are a multidisciplinary firm where Chartered Accountants, Company Secretaries, legal professionals, and business consultants work together as one integrated team. If you are someone who takes ownership, thinks beyond your role, and wants to build something meaningful — we would love to hear from you.'),
  b('careers', 'apply_title', 'How to apply: title', 'How to Apply'),
  b('careers', 'apply_heading', 'How to apply: heading', 'Send Us Your CV'),
  b('careers', 'apply_p1', 'How to apply: paragraph 1', 'We welcome applications from talented professionals at any time — in audit, taxation, compliance, finance, technology, or general consulting. Apply for a listed role below, or send an open application.', 'RICHTEXT'),
  b('careers', 'apply_p2', 'How to apply: paragraph 2', 'You can also email your CV to <a href="mailto:acrandcompany@gmail.com" class="uk-link-text uk-text-primary"><strong>acrandcompany@gmail.com</strong></a> with the subject line: <strong>Job Application — [Your Name]</strong>', 'RICHTEXT'),
  b('careers', 'apply_note', 'How to apply: small print', 'We review all applications carefully and will reach out if your profile matches a current or upcoming requirement. We appreciate your interest in ACR.'),
  b('careers', 'jobs_title', 'Open roles: title', 'Current Openings'),
  b('careers', 'form_title', 'Application form: title', 'Open Application'),
  b('careers', 'form_button', 'Application form: button text', 'Submit Application'),
  b('careers', 'consent_text', 'Consent line under the application form', "We'll use your details and CV only to process your application and to contact you about it. We do not share them with anyone else."),
  b('careers', 'form_success', 'Application sent confirmation', 'Thank you! Your application has been received. We will contact you if your profile matches a current or upcoming requirement.'),
  // ---- contact
  b('contact', 'hero_title', 'Page title (h1)', 'Get in Touch'),
  b('contact', 'hero_lead', 'Intro text', "Whether you have a specific requirement or simply want to explore how ACR can help, we're here. Fill in the form and we'll respond within one business day."),
  b('contact', 'email_title', 'Email heading', 'Email Us'),
  b('contact', 'form_button', 'Form button text', 'Send Message'),
  b('contact', 'consent_text', 'Consent line under the form', "We'll use your details only to respond to your enquiry. We do not share them with anyone else."),
  b('contact', 'form_success', 'Message sent confirmation', 'Thank you! Your message has been sent. We will respond within one business day.'),
  // ---- 404
  b('404', 'title', 'Heading', 'Oops!'),
  b('404', 'text', 'Text', "The page you're looking for doesn't exist, or was loaded incorrectly."),
  b('404', 'link', 'Link text', 'Back to homepage'),
];
