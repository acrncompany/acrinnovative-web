/**
 * The admin's "map" of editable content. Each entry describes ONE content type: where it lives in the API,
 * which fields its form has, and how its list looks. The generic list and form screens
 * (features/resource/*) build everything from these descriptions, so adding a field here adds it to the form.
 */

export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'bool' | 'select' | 'status'
  | 'image' | 'icon' | 'link' | 'email' | 'datetime' | 'color';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  rows?: number;
  hint?: string;
  placeholder?: string;
  options?: { value: string | number | boolean; label: string }[];
  /** Options loaded from another API list (the category pickers). */
  optionsFrom?: 'serviceCategories' | 'postCategories';
  /** Optional date: when emptied it is saved as "no date" (otherwise an empty value leaves the saved date alone). */
  clearable?: boolean;
  /** Show the field only when this returns true for the current form values. */
  showIf?: (values: any) => boolean;
  /** Heading shown above this field and the ones after it (used by the settings screen). */
  section?: string;
}

export interface ListDef {
  primary: (r: any) => string;
  secondary?: (r: any) => string;
  /** Relative upload path for a thumbnail, e.g. r.image?.path */
  thumb?: (r: any) => string | null | undefined;
  /** Font Awesome class shown as a glyph when there is no thumbnail. */
  icon?: (r: any) => string | null | undefined;
  /** Rows are grouped under a heading (e.g. services by category). */
  groupBy?: (r: any) => string;
  /** Show drag handles / up-down arrows and save the new order. */
  sortable?: boolean;
  /** Row has a Published/Draft status. */
  hasStatus?: boolean;
  /** Extra filter above the list. */
  filter?: 'status' | 'serviceCategory' | 'postCategory';
  emptyText: string;
}

export interface ResourceConfig {
  key: string;
  endpoint: string;
  title: string;
  singular: string;
  /** Router path of the list screen (relative to /admin). */
  basePath: string;
  /** Where "Back" goes (default: basePath). */
  backPath?: string;
  backLabel?: string;
  help?: string;
  fields: FieldDef[];
  /** Fixed values: sent as a list filter AND as defaults/forced values when saving (e.g. { group: 'WHY_CHOOSE' }). */
  fixed?: Record<string, string>;
  /** Defaults for new items. */
  defaults?: Record<string, any>;
  seo?: { kind: 'service' | 'post' | 'job'; titleKey: string; textKey: string };
  list: ListDef;
  /** Single record without a list (site settings). */
  singleton?: boolean;
  noDelete?: boolean;
  links?: { label: string; path: string; icon: string }[];
}

const STATUS_OPTIONS = [
  { value: 'PUBLISHED', label: 'Visible on the website' },
  { value: 'DRAFT', label: 'Hidden (draft)' },
];
const status = (hint?: string): FieldDef => ({ key: 'status', label: 'Visibility', type: 'status', options: STATUS_OPTIONS, hint });
const ICON_HINT = 'The small picture shown on the card.';

const REGISTRY: ResourceConfig[] = [
  // ------------------------------------------------------------------ services
  {
    key: 'services', endpoint: '/services', title: 'Services', singular: 'service', basePath: '/services',
    help: 'Each service has its own page on the website. Drag to change the order within a group.',
    seo: { kind: 'service', titleKey: 'title', textKey: 'summary' },
    links: [{ label: 'Service groups', path: '/services/categories', icon: 'folder' }],
    defaults: { status: 'PUBLISHED', showOnHome: false, icon: 'fas fa-building' },
    fields: [
      { key: 'categoryId', label: 'Group', type: 'select', required: true, optionsFrom: 'serviceCategories', hint: 'Services are listed on the Services page under these headings.' },
      { key: 'title', label: 'Service name', type: 'text', required: true, max: 200 },
      { key: 'icon', label: 'Icon', type: 'icon', hint: ICON_HINT },
      { key: 'summary', label: 'Short description', type: 'textarea', required: true, max: 2000, rows: 3, hint: 'Shown on the service cards.' },
      { key: 'body', label: 'Full description', type: 'richtext', hint: 'Shown on this service’s own page.' },
      { key: 'showOnHome', label: 'Show on the home page', type: 'bool', hint: 'Home page shows its chosen services in a row of cards.' },
      { key: 'homeSummary', label: 'Shorter text for the home page', type: 'textarea', max: 2000, rows: 2, showIf: (v) => !!v.showOnHome, hint: 'Optional. If empty, the short description is used.' },
      { key: 'homeSortOrder', label: 'Position on the home page', type: 'number', showIf: (v) => !!v.showOnHome, hint: '1 appears first.' },
      status(),
    ],
    list: {
      primary: (r) => r.title, secondary: (r) => r.summary, icon: (r) => r.icon, groupBy: (r) => r.category?.title ?? 'Other',
      sortable: true, hasStatus: true, filter: 'serviceCategory', emptyText: 'No services yet. Click “Add service” to create the first one.',
    },
  },
  {
    key: 'serviceCategories', endpoint: '/service-categories', title: 'Service groups', singular: 'group', basePath: '/services/categories',
    backPath: '/services', backLabel: 'Services',
    help: 'The headings on the Services page (for example “Financial & Taxation”).',
    fields: [
      { key: 'title', label: 'Group name', type: 'text', required: true, max: 150 },
      { key: 'slug', label: 'Web address part', type: 'text', max: 160, hint: 'Leave empty to create it from the name.' },
    ],
    list: { primary: (r) => r.title, sortable: true, emptyText: 'No groups yet.' },
  },

  // ------------------------------------------------------------------ insights
  {
    key: 'posts', endpoint: '/posts', title: 'Insights', singular: 'article', basePath: '/insights',
    help: 'Articles shown on the Insights page. Drafts are hidden from visitors.',
    seo: { kind: 'post', titleKey: 'title', textKey: 'excerpt' },
    links: [{ label: 'Article categories', path: '/insights/categories', icon: 'label' }],
    defaults: { status: 'DRAFT', showOnHome: false, authorName: 'ACR Team' },
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, max: 250 },
      { key: 'categoryId', label: 'Category', type: 'select', required: true, optionsFrom: 'postCategories' },
      { key: 'coverId', label: 'Cover image', type: 'image', hint: 'Shown on the article and in the Insights list.' },
      { key: 'excerpt', label: 'Short summary', type: 'textarea', required: true, max: 5000, rows: 4, hint: 'Shown in the Insights list. Leave a blank line between paragraphs.' },
      { key: 'body', label: 'Article', type: 'richtext' },
      { key: 'authorName', label: 'Author', type: 'text', required: true, max: 150 },
      status('Only “Visible” articles appear on the website.'),
      { key: 'publishedAt', label: 'Publish date', type: 'datetime', hint: 'Leave empty to use today. A future date schedules the article: it appears on that day.' },
      { key: 'showOnHome', label: 'Show on the home page', type: 'bool', hint: 'The 3 newest such articles appear on the home page.' },
      { key: 'homeSummary', label: 'Shorter text for the home page', type: 'textarea', max: 2000, rows: 2, showIf: (v) => !!v.showOnHome, hint: 'Optional.' },
    ],
    list: {
      primary: (r) => r.title, secondary: (r) => `${r.category?.name ?? ''} · ${r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'not published yet'}`,
      thumb: (r) => r.cover?.path, hasStatus: true, filter: 'status', emptyText: 'No articles yet. Click “Add article” to write the first one.',
    },
  },
  {
    key: 'postCategories', endpoint: '/post-categories', title: 'Article categories', singular: 'category', basePath: '/insights/categories',
    backPath: '/insights', backLabel: 'Insights',
    fields: [
      { key: 'name', label: 'Category name', type: 'text', required: true, max: 100 },
      { key: 'slug', label: 'Web address part', type: 'text', max: 120, hint: 'Leave empty to create it from the name.' },
    ],
    list: { primary: (r) => r.name, sortable: true, emptyText: 'No categories yet.' },
  },

  // ------------------------------------------------------------------ careers
  {
    key: 'jobs', endpoint: '/jobs', title: 'Job openings', singular: 'job', basePath: '/careers',
    help: 'Published jobs appear on the Careers page with an application form. Applications arrive in the Inbox.',
    seo: { kind: 'job', titleKey: 'title', textKey: 'description' },
    defaults: { status: 'DRAFT', employmentType: 'Full-time' },
    fields: [
      { key: 'title', label: 'Job title', type: 'text', required: true, max: 200 },
      { key: 'location', label: 'Location', type: 'text', required: true, max: 150, placeholder: 'Calicut, Kerala' },
      { key: 'employmentType', label: 'Type', type: 'text', required: true, max: 80, placeholder: 'Full-time' },
      { key: 'department', label: 'Department', type: 'text', max: 120 },
      { key: 'description', label: 'Job description', type: 'richtext' },
      status(),
      { key: 'closingDate', label: 'Closing date', type: 'datetime', clearable: true, hint: 'Optional. After this date the job disappears from the website.' },
    ],
    list: { primary: (r) => r.title, secondary: (r) => `${r.location} · ${r.employmentType}`, sortable: true, hasStatus: true, filter: 'status', emptyText: 'No job openings. Visitors can still send an open application from the Careers page.' },
  },

  // ------------------------------------------------------------------ home page lists
  {
    key: 'slides', endpoint: '/hero-slides', title: 'Home page slideshow', singular: 'slide', basePath: '/lists/slides', backPath: '/home-sections', backLabel: 'Home page',
    help: 'The big pictures at the top of the home page. The first slide holds the main page heading.',
    defaults: { status: 'PUBLISHED' },
    fields: [
      { key: 'imageId', label: 'Background picture', type: 'image', hint: 'Wide pictures (about 1920 × 700) work best.' },
      { key: 'heading', label: 'Heading', type: 'textarea', required: true, max: 300, rows: 2, hint: 'Press Enter to start a new line.' },
      { key: 'accentText', label: 'Highlighted second line', type: 'text', max: 200, hint: 'Optional. Shown in gold under the heading.' },
      { key: 'lead', label: 'Large sub-heading', type: 'text', required: true, max: 500 },
      { key: 'body', label: 'Description', type: 'textarea', required: true, max: 1000, rows: 3 },
      { key: 'cta1Label', label: 'First button text', type: 'text', max: 100, section: 'Buttons' },
      { key: 'cta1Url', label: 'First button link', type: 'link', max: 300, placeholder: '/services' },
      { key: 'cta2Label', label: 'Second button text', type: 'text', max: 100 },
      { key: 'cta2Url', label: 'Second button link', type: 'link', max: 300, placeholder: '/contact' },
      status(),
    ],
    list: { primary: (r) => String(r.heading).replace(/\n/g, ' '), secondary: (r) => r.lead, thumb: (r) => r.image?.path, sortable: true, hasStatus: true, emptyText: 'No slides.' },
  },
  statsConfig('home-stats', 'HOME', 'Home page numbers', '/lists/home-stats', '/home-sections', 'Home page', 'The four numbers in the gold bar under the slideshow.'),
  featureConfig('process', 'HOME_PROCESS', 'Our approach (3 steps)', '/lists/process', '/home-sections', 'Home page', 'The three boxes “Discover / Strategise / Execute”.'),
  featureConfig('why', 'WHY_CHOOSE', 'Why choose us', '/lists/why', '/home-sections', 'Home page', 'The four boxes under “Why leading businesses choose ACR”.'),
  featureConfig('trust', 'HOME_TRUST', 'Trust badges', '/lists/trust', '/home-sections', 'Home page', 'The three short labels under the services row.', false),

  // ------------------------------------------------------------------ other pages' lists
  featureConfig('pillars', 'ABOUT_PILLAR', 'Mission, vision & values', '/lists/pillars', '/pages/about', 'About page', 'The three columns on the About page.'),
  featureConfig('disciplines', 'TEAM_DISCIPLINE', 'Our team’s disciplines', '/lists/disciplines', '/pages/about', 'About page', 'The four small cards next to the founder on the About page.'),
  statsConfig('about-stats', 'ABOUT', 'About page numbers', '/lists/about-stats', '/pages/about', 'About page', 'The “track record” numbers on the About page.'),
  {
    key: 'team', endpoint: '/team-members', title: 'Leadership team', singular: 'team member', basePath: '/lists/team', backPath: '/pages/about', backLabel: 'About page',
    help: 'People shown in the “Leadership & Team” box on the About page.',
    defaults: { status: 'PUBLISHED', icon: 'fas fa-user-tie' },
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true, max: 150 },
      { key: 'role', label: 'Role', type: 'text', required: true, max: 200 },
      { key: 'photoId', label: 'Photo', type: 'image', hint: 'Optional. Without a photo the icon below is shown.' },
      { key: 'icon', label: 'Icon (used when there is no photo)', type: 'icon' },
      { key: 'bio', label: 'About this person', type: 'textarea', required: true, max: 5000, rows: 8, hint: 'Leave a blank line between paragraphs.' },
      status(),
    ],
    list: { primary: (r) => r.name, secondary: (r) => r.role, thumb: (r) => r.photo?.path, icon: (r) => r.icon, sortable: true, hasStatus: true, emptyText: 'No team members.' },
  },
  featureConfig('steps', 'ENGAGEMENT_STEP', 'How we work: the steps', '/lists/steps', '/pages/how-we-work', 'How We Work page', 'The numbered steps. The order here is the step number (01, 02, ...).', true, true),
  featureConfig('perks', 'CAREER_PERK', 'Why join us', '/lists/perks', '/pages/careers', 'Careers page', 'The three boxes at the top of the Careers page.'),
  featureConfig('areas', 'CAREER_AREA', 'Areas we hire in', '/lists/areas', '/pages/careers', 'Careers page', 'The small cards listing the kinds of people we hire.'),

  // ------------------------------------------------------------------ settings area
  {
    key: 'offices', endpoint: '/offices', title: 'Offices', singular: 'office', basePath: '/settings/offices', backPath: '/settings', backLabel: 'Settings',
    help: 'Shown in the website footer, on the Contact page and in Google’s business information.',
    defaults: { isHeadOffice: false },
    fields: [
      { key: 'name', label: 'Name in the footer', type: 'text', required: true, max: 200, placeholder: 'India (Head Office)' },
      { key: 'shortName', label: 'Name on the Contact page', type: 'text', required: true, max: 100, placeholder: 'India Office' },
      { key: 'addressLines', label: 'Address (footer)', type: 'textarea', required: true, max: 1000, rows: 4, hint: 'One line per row.' },
      { key: 'contactAddressLines', label: 'Address (Contact page)', type: 'textarea', max: 1000, rows: 3, hint: 'Optional. If empty, the footer address is used.' },
      { key: 'phone', label: 'Phone (as shown)', type: 'text', required: true, max: 50, placeholder: '+91 9447157549' },
      { key: 'phoneRaw', label: 'Phone (digits only)', type: 'text', required: true, max: 20, placeholder: '+919447157549', hint: 'Used for tap-to-call and Google. Digits with an optional + at the start.' },
      { key: 'email', label: 'Email for this office', type: 'email', max: 200 },
      { key: 'isHeadOffice', label: 'Head office', type: 'bool' },
      { key: 'streetAddress', label: 'Street address (for Google)', type: 'text', required: true, max: 300, section: 'For Google (business information)' },
      { key: 'city', label: 'City', type: 'text', required: true, max: 100 },
      { key: 'region', label: 'State / region', type: 'text', max: 100 },
      { key: 'postalCode', label: 'Postal code', type: 'text', max: 20 },
      { key: 'country', label: 'Country', type: 'text', required: true, max: 100 },
      { key: 'countryCode', label: 'Country code', type: 'text', required: true, max: 2, placeholder: 'IN', hint: 'Two capital letters.' },
    ],
    list: { primary: (r) => r.name, secondary: (r) => `${r.city} · ${r.phone}`, sortable: true, emptyText: 'No offices.' },
  },
  {
    key: 'social', endpoint: '/social-links', title: 'Social media links', singular: 'link', basePath: '/settings/social', backPath: '/settings', backLabel: 'Settings',
    help: 'Icons shown in the website footer.',
    defaults: { visible: true, platform: 'linkedin' },
    fields: [
      { key: 'platform', label: 'Network', type: 'select', required: true, options: ['facebook', 'instagram', 'linkedin', 'twitter', 'youtube', 'whatsapp'].map((p) => ({ value: p, label: p[0].toUpperCase() + p.slice(1) })) },
      { key: 'url', label: 'Page address', type: 'text', required: true, max: 500, placeholder: 'https://www.linkedin.com/company/…', hint: 'Must start with https://' },
      { key: 'visible', label: 'Show on website', type: 'bool' },
    ],
    list: { primary: (r) => r.platform, secondary: (r) => r.url, sortable: true, emptyText: 'No social links yet.' },
  },
  menuConfig('menu-header', 'HEADER', 'Top menu', '/settings/menu-header'),
  menuConfig('menu-footer', 'FOOTER', 'Footer menu', '/settings/menu-footer'),
  {
    key: 'settings', endpoint: '/settings', title: 'Website details', singular: 'settings', basePath: '/settings/general', backPath: '/settings', backLabel: 'Settings', singleton: true,
    fields: [
      { key: 'siteName', label: 'Full business name', type: 'text', required: true, max: 200, section: 'Business name' },
      { key: 'legalName', label: 'Legal name', type: 'text', required: true, max: 250, hint: 'Used in the copyright line and for Google.' },
      { key: 'brandName', label: 'Name in the page header', type: 'text', required: true, max: 200 },
      { key: 'brandSub', label: 'Small text under it', type: 'text', required: true, max: 200 },
      { key: 'tagline', label: 'Tagline', type: 'text', required: true, max: 300 },
      { key: 'foundingYear', label: 'Year founded', type: 'text', max: 10 },
      { key: 'orgDescription', label: 'Short business description', type: 'textarea', max: 500, rows: 3, hint: 'Used by Google to understand your business.' },
      { key: 'logoId', label: 'Logo (page header)', type: 'image', section: 'Logos & icons' },
      { key: 'footerLogoId', label: 'Logo (page footer)', type: 'image' },
      { key: 'faviconId', label: 'Browser icon (favicon)', type: 'image', hint: 'The tiny icon on browser tabs and phone home screens. A square picture works best (your logo). All the sizes are made automatically.' },
      { key: 'contactEmail', label: 'Public email address', type: 'email', required: true, max: 200, section: 'Contact & footer', hint: 'Shown on the website.' },
      { key: 'notificationEmail', label: 'Send form alerts to', type: 'email', required: true, max: 200, hint: 'New messages and job applications are emailed here.' },
      { key: 'headerButtonLabel', label: 'Header button text', type: 'text', required: true, max: 100 },
      { key: 'headerButtonUrl', label: 'Header button link', type: 'link', required: true, max: 300 },
      { key: 'footerText', label: 'Copyright line', type: 'text', required: true, max: 1000, hint: '{year} is replaced by the current year automatically.' },
      { key: 'defaultMetaTitleSuffix', label: 'Name added to page titles', type: 'text', required: true, max: 200, section: 'Google & sharing defaults', hint: 'Page titles look like “About Us — This name”.' },
      { key: 'defaultMetaDescription', label: 'Default description', type: 'textarea', required: true, max: 400, rows: 3, hint: 'Used for pages without their own description (aim for under 160 characters).' },
      { key: 'defaultOgImageId', label: 'Default sharing picture', type: 'image', hint: 'Shown when a page is shared on WhatsApp, LinkedIn, Facebook…' },
      { key: 'keywords', label: 'Keywords', type: 'text', max: 500 },
      { key: 'author', label: 'Site author', type: 'text', required: true, max: 200 },
      { key: 'themeColor', label: 'Browser colour', type: 'color', hint: 'Colours the address bar on phones.' },
    ],
    list: { primary: () => '', emptyText: '' },
  },
];

function featureConfig(
  key: string, group: string, title: string, basePath: string, backPath: string, backLabel: string, help: string,
  withBody = true, withSubtitle = false,
): ResourceConfig {
  return {
    key, endpoint: '/feature-items', title, singular: 'item', basePath, backPath, backLabel, help,
    fixed: { group }, defaults: { status: 'PUBLISHED' },
    fields: [
      { key: 'icon', label: 'Icon', type: 'icon' },
      { key: 'title', label: 'Title', type: 'text', required: true, max: 200 },
      ...(withSubtitle ? [{ key: 'subtitle', label: 'Sub-heading', type: 'text', max: 200 } as FieldDef] : []),
      ...(withBody ? [{ key: 'body', label: 'Text', type: 'textarea', required: true, max: 2000, rows: 4 } as FieldDef] : []),
      status(),
    ],
    list: { primary: (r) => r.title, secondary: (r) => r.body, icon: (r) => r.icon, sortable: true, hasStatus: true, emptyText: 'Nothing here yet.' },
  };
}

function statsConfig(key: string, group: string, title: string, basePath: string, backPath: string, backLabel: string, help: string): ResourceConfig {
  const home = group === 'HOME';
  return {
    key, endpoint: '/stats', title, singular: 'number', basePath, backPath, backLabel, help, fixed: { group },
    defaults: { status: 'PUBLISHED', suffix: '+' },
    fields: [
      { key: 'label', label: 'Label', type: 'text', required: true, max: 150, placeholder: 'Years of Experience' },
      { key: 'value', label: 'Number', type: 'number', clearable: true, hint: 'The number counts up when visitors see it. Leave empty if you use a word below.' },
      { key: 'suffix', label: 'After the number', type: 'text', max: 10, placeholder: '+' },
      { key: 'textValue', label: 'Or a word instead of a number', type: 'text', max: 100, placeholder: 'All Sectors' },
      ...(home ? [{ key: 'iconId', label: 'Icon picture', type: 'image' } as FieldDef] : [{ key: 'description', label: 'Description', type: 'textarea', max: 1000, rows: 3 } as FieldDef]),
      status(),
    ],
    list: {
      primary: (r) => `${r.textValue ?? (r.value ?? '') + (r.suffix ?? '')}  ${r.label}`, secondary: (r) => r.description ?? '',
      thumb: (r) => r.icon?.path, sortable: true, hasStatus: true, emptyText: 'No numbers yet.',
    },
  };
}

function menuConfig(key: string, location: string, title: string, basePath: string): ResourceConfig {
  return {
    key, endpoint: '/menu-items', title, singular: 'menu item', basePath, backPath: '/settings', backLabel: 'Settings',
    help: 'Drag to change the order.', fixed: { location }, defaults: { visible: true },
    fields: [
      { key: 'label', label: 'Text', type: 'text', required: true, max: 100 },
      { key: 'url', label: 'Link', type: 'link', required: true, max: 300, placeholder: '/services', hint: 'For pages on this website use /about, /services, … For other sites use https://' },
      { key: 'visible', label: 'Show in menu', type: 'bool' },
    ],
    list: { primary: (r) => r.label, secondary: (r) => r.url, sortable: true, emptyText: 'No menu items.' },
  };
}

export const RESOURCES: Record<string, ResourceConfig> = Object.fromEntries(REGISTRY.map((r) => [r.key, r]));
export const resourceKeys = REGISTRY.map((r) => r.key);

/** Links from each fixed page's editor to the lists that belong to that page. */
export const PAGE_LISTS: Record<string, { label: string; path: string; icon: string }[]> = {
  home: [
    { label: 'Slideshow', path: '/lists/slides', icon: 'slideshow' },
    { label: 'Numbers bar', path: '/lists/home-stats', icon: 'pin' },
    { label: 'Our approach', path: '/lists/process', icon: 'timeline' },
    { label: 'Why choose us', path: '/lists/why', icon: 'thumb_up' },
    { label: 'Trust badges', path: '/lists/trust', icon: 'verified' },
    { label: 'Services on the home page', path: '/services', icon: 'handyman' },
  ],
  about: [
    { label: 'Mission, vision & values', path: '/lists/pillars', icon: 'flag' },
    { label: 'Leadership team', path: '/lists/team', icon: 'groups' },
    { label: 'Team disciplines', path: '/lists/disciplines', icon: 'school' },
    { label: 'Numbers', path: '/lists/about-stats', icon: 'pin' },
  ],
  'how-we-work': [{ label: 'The steps', path: '/lists/steps', icon: 'format_list_numbered' }],
  careers: [
    { label: 'Job openings', path: '/careers', icon: 'work' },
    { label: 'Why join us', path: '/lists/perks', icon: 'favorite' },
    { label: 'Areas we hire in', path: '/lists/areas', icon: 'category' },
  ],
  services: [{ label: 'Manage services', path: '/services', icon: 'handyman' }],
  insights: [{ label: 'Manage articles', path: '/insights', icon: 'article' }],
  contact: [{ label: 'Offices & phone numbers', path: '/settings/offices', icon: 'location_on' }],
};
