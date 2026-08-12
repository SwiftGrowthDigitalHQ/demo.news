/**
 * SangTX Demo Tenant
 * 
 * This module provides a complete, production-quality demo tenant
 * that behaves exactly like a real customer installation.
 * 
 * ARCHITECTURE:
 * - Single source of truth for ALL demo data
 * - Public website and admin use the SAME data
 * - Production-quality content with proper relationships
 * - Read-only enforcement at the data layer
 * 
 * The demo tenant is conceptually:
 * tenant_id = "DEMO"
 */

import type {
  PublicArticle,
  PublicCategory,
  BreakingHeadline,
  SiteSettings,
  AdvertisementPlacement,
} from './cms';

// ═══════════════════════════════════════════════════════════════════════════
// DEMO TENANT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_TENANT_ID = 'demo';
export const DEMO_TENANT_NAME = 'Disha News';
export const DEMO_TENANT_TAGLINE = 'Sample Publication — Powered by SangTX';
export const DEMO_TENANT_DESCRIPTION = 'A fictional demo publication showcasing the complete SangTX platform capabilities.';

// ═══════════════════════════════════════════════════════════════════════════
// DEMO CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_CATEGORIES: PublicCategory[] = [
  {
    id: 'demo-cat-01',
    name: 'India',
    slug: 'india',
    description: 'National news, policy updates, and stories from across India',
    sort_order: 1,
    is_featured: true,
    seo_title: 'India News - Disha News',
    seo_description: 'Latest news and updates from India covering politics, economy, and society',
  },
  {
    id: 'demo-cat-02',
    name: 'Politics',
    slug: 'politics',
    description: 'Political developments, elections, and governance coverage',
    sort_order: 2,
    is_featured: true,
    seo_title: 'Politics News - Disha News',
    seo_description: 'Political news, analysis, and updates from state and national politics',
  },
  {
    id: 'demo-cat-03',
    name: 'Bihar',
    slug: 'bihar',
    description: 'Local news and stories from Bihar',
    sort_order: 3,
    is_featured: true,
    seo_title: 'Bihar News - Disha News',
    seo_description: 'Latest news from Bihar covering local issues, development, and culture',
  },
  {
    id: 'demo-cat-04',
    name: 'Business',
    slug: 'business',
    description: 'Business news, market updates, and economic analysis',
    sort_order: 4,
    is_featured: true,
    seo_title: 'Business News - Disha News',
    seo_description: 'Business news, startups, markets, and economic developments',
  },
  {
    id: 'demo-cat-05',
    name: 'Technology',
    slug: 'technology',
    description: 'Tech innovations, startups, and digital transformation stories',
    sort_order: 5,
    is_featured: true,
    seo_title: 'Technology News - Disha News',
    seo_description: 'Latest technology news, innovations, and digital developments',
  },
  {
    id: 'demo-cat-06',
    name: 'Education',
    slug: 'education',
    description: 'Education policy, schools, universities, and learning initiatives',
    sort_order: 6,
    is_featured: true,
    seo_title: 'Education News - Disha News',
    seo_description: 'Education news covering schools, colleges, and learning initiatives',
  },
  {
    id: 'demo-cat-07',
    name: 'Sports',
    slug: 'sports',
    description: 'Sports news, tournaments, and athlete profiles',
    sort_order: 7,
    is_featured: true,
    seo_title: 'Sports News - Disha News',
    seo_description: 'Sports coverage including cricket, football, and regional athletics',
  },
  {
    id: 'demo-cat-08',
    name: 'Entertainment',
    slug: 'entertainment',
    description: 'Arts, culture, cinema, and entertainment coverage',
    sort_order: 8,
    is_featured: false,
    seo_title: 'Entertainment News - Disha News',
    seo_description: 'Entertainment news covering cinema, culture, and arts',
  },
  {
    id: 'demo-cat-09',
    name: 'Health',
    slug: 'health',
    description: 'Health updates, medical breakthroughs, and wellness tips',
    sort_order: 9,
    is_featured: false,
    seo_title: 'Health News - Disha News',
    seo_description: 'Health news, medical updates, and wellness coverage',
  },
  {
    id: 'demo-cat-10',
    name: 'Opinion',
    slug: 'opinion',
    description: 'Editorial pieces, analysis, and expert commentary',
    sort_order: 10,
    is_featured: false,
    seo_title: 'Opinion & Analysis - Disha News',
    seo_description: 'Editorial analysis and expert commentary on current affairs',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEMO REPORTERS
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_REPORTERS = [
  {
    id: 'demo-reporter-01',
    full_name: 'Ananya Verma',
    slug: 'ananya-verma',
    role: 'Senior Editor',
    bio: 'Ananya covers politics and governance with over 12 years of journalism experience.',
    email: 'ananya@example.demo',
  },
  {
    id: 'demo-reporter-02',
    full_name: 'Rohit Kumar',
    slug: 'rohit-kumar',
    role: 'Reporter',
    bio: 'Rohit specializes in education and social issues reporting.',
    email: 'rohit@example.demo',
  },
  {
    id: 'demo-reporter-03',
    full_name: 'Meera Sinha',
    slug: 'meera-sinha',
    role: 'Business Correspondent',
    bio: 'Meera focuses on business, startups, and economic development.',
    email: 'meera@example.demo',
  },
  {
    id: 'demo-reporter-04',
    full_name: 'Kunal Raj',
    slug: 'kunal-raj',
    role: 'Sports Editor',
    bio: 'Kunal covers sports with emphasis on local athletics and cricket.',
    email: 'kunal@example.demo',
  },
  {
    id: 'demo-reporter-05',
    full_name: 'Priya Sharma',
    slug: 'priya-sharma',
    role: 'Technology Reporter',
    bio: 'Priya reports on technology innovations and digital transformation.',
    email: 'priya@example.demo',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEMO ARTICLES (50+ articles with proper relationships)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate topic-relevant demo images using Unsplash
 * 
 * Unsplash provides free, high-quality stock photos via a stable CDN.
 * Images are properly licensed for demo/commercial use.
 * 
 * Format: https://images.unsplash.com/photo-{id}?w={width}&h={height}&fit=crop&q=80
 */
const DEMO_IMAGES = {
  // Technology & Innovation
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=800&fit=crop&q=80', // tech abstract
    'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=1200&h=800&fit=crop&q=80', // laptop code
    'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=800&fit=crop&q=80', // coding screen
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=800&fit=crop&q=80', // tech workspace
  ],
  
  // Politics & Government
  politics: [
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=800&fit=crop&q=80', // government building
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&h=800&fit=crop&q=80', // meeting/conference
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=800&fit=crop&q=80', // civic building
    'https://images.unsplash.com/photo-1554224311-beee415c201f?w=1200&h=800&fit=crop&q=80', // parliament style
  ],
  
  // Community & Local
  community: [
    'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=1200&h=800&fit=crop&q=80', // community gathering
    'https://images.unsplash.com/photo-1528605105345-5344ea20e269?w=1200&h=800&fit=crop&q=80', // people meeting
    'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1200&h=800&fit=crop&q=80', // community group
    'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=1200&h=800&fit=crop&q=80', // local scene
  ],
  
  // Education
  education: [
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200&h=800&fit=crop&q=80', // students studying
    'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=800&fit=crop&q=80', // university
    'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1200&h=800&fit=crop&q=80', // classroom
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1200&h=800&fit=crop&q=80', // books/learning
  ],
  
  // Business & Economy
  business: [
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=800&fit=crop&q=80', // business meeting
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&h=800&fit=crop&q=80', // analytics/charts
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=800&fit=crop&q=80', // office buildings
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&h=800&fit=crop&q=80', // professionals
  ],
  
  // Sports
  sports: [
    'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=800&fit=crop&q=80', // stadium
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&h=800&fit=crop&q=80', // sports action
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&h=800&fit=crop&q=80', // cricket
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&h=800&fit=crop&q=80', // athletic field
  ],
  
  // Health & Wellness
  health: [
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&h=800&fit=crop&q=80', // medical/health
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1200&h=800&fit=crop&q=80', // healthcare
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&h=800&fit=crop&q=80', // wellness
    'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1200&h=800&fit=crop&q=80', // health service
  ],
  
  // Entertainment & Culture
  entertainment: [
    'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=1200&h=800&fit=crop&q=80', // theater/stage
    'https://images.unsplash.com/photo-1514306191717-452ec28c7814?w=1200&h=800&fit=crop&q=80', // performance
    'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?w=1200&h=800&fit=crop&q=80', // cultural event
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&h=800&fit=crop&q=80', // cinema
  ],
  
  // Environment & Nature
  environment: [
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&h=800&fit=crop&q=80', // nature/green
    'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=1200&h=800&fit=crop&q=80', // landscape
    'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1200&h=800&fit=crop&q=80', // environmental
    'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=800&fit=crop&q=80', // agriculture/rural
  ],
  
  // Urban & Infrastructure
  urban: [
    'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&h=800&fit=crop&q=80', // cityscape
    'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&h=800&fit=crop&q=80', // urban scene
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop&q=80', // city development
    'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?w=1200&h=800&fit=crop&q=80', // infrastructure
  ],
};

/**
 * Get appropriate image for article based on category and content
 */
function getDemoImageForArticle(categoryId: string, articleIndex: number, tags: string[]): string {
  // Map category IDs to image themes
  const categoryImageMap: Record<string, keyof typeof DEMO_IMAGES> = {
    'demo-cat-01': 'community', // India
    'demo-cat-02': 'politics',  // Politics
    'demo-cat-03': 'urban',     // Bihar
    'demo-cat-04': 'business',  // Business
    'demo-cat-05': 'technology', // Technology
    'demo-cat-06': 'education',  // Education
    'demo-cat-07': 'sports',     // Sports
    'demo-cat-08': 'entertainment', // Entertainment
    'demo-cat-09': 'health',     // Health
    'demo-cat-10': 'community',  // Opinion
  };
  
  // Check tags for more specific matching
  const tagLower = tags.map(t => t.toLowerCase()).join(' ');
  if (tagLower.includes('tech') || tagLower.includes('digital') || tagLower.includes('innovation')) {
    const images = DEMO_IMAGES.technology;
    return images[articleIndex % images.length];
  }
  if (tagLower.includes('environment') || tagLower.includes('agriculture') || tagLower.includes('green')) {
    const images = DEMO_IMAGES.environment;
    return images[articleIndex % images.length];
  }
  if (tagLower.includes('health') || tagLower.includes('medical') || tagLower.includes('wellness')) {
    const images = DEMO_IMAGES.health;
    return images[articleIndex % images.length];
  }
  
  // Use category-based image
  const theme = categoryImageMap[categoryId] || 'community';
  const images = DEMO_IMAGES[theme];
  return images[articleIndex % images.length];
}

function createBaseArticle(
  id: string,
  title: string,
  excerpt: string,
  content: string[],
  categoryId: string,
  authorId: string,
  tags: string[],
  featured: boolean,
  trending: boolean,
  breaking: boolean,
  views: number,
  hoursAgo: number,
  mediaType: 'article' | 'video' | 'photo' = 'article',
  videoUrl: string | null = null
): PublicArticle {
  const category = DEMO_CATEGORIES.find(c => c.id === categoryId)!;
  const author = DEMO_REPORTERS.find(r => r.id === authorId)!;
  const publishDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  const articleNumber = parseInt(id.split('-')[2], 10);

  return {
    id,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    title,
    excerpt,
    content,
    category_id: categoryId,
    category_name: category.name,
    category_slug: category.slug,
    author_name: author.full_name,
    author_role: author.role,
    publish_at: publishDate,
    read_time: `${Math.ceil(content.join(' ').split(' ').length / 200)} min read`,
    featured_image: getDemoImageForArticle(categoryId, articleNumber, tags),
    media_type: mediaType,
    video_url: videoUrl,
    seo_title: `${title} - Disha News`,
    seo_description: excerpt,
    featured,
    trending,
    breaking,
    views_count: views,
    tags,
  };
}

export const DEMO_ARTICLES: PublicArticle[] = [
  // Breaking News (4 articles)
  createBaseArticle(
    'demo-article-001',
    'Community Innovation Labs Connect Young Makers with Local Challenges',
    'A fictional nationwide initiative shows how shared labs can turn classroom ideas into practical public-service prototypes across multiple cities.',
    [
      'This original demo article showcases a fictional innovation program designed to illustrate how SangTX-powered publications can present complex community stories.',
      'The Community Innovation Lab initiative, entirely fictional, brings together students, local governments, and technical mentors in a collaborative space. Participants tackle real neighborhood challenges through prototyping and design thinking.',
      'Early results from the demo scenario include a solar-powered water monitoring system, a multilingual public transit app, and a community composting tracker. Each project addresses a specific local need identified through civic engagement sessions.',
      'Program coordinators in this sample story emphasize the importance of accessible technical education and youth participation in governance. The labs operate on a membership model, with equipment donations from local businesses and volunteer mentors.',
      'This demo content is designed to show editorial depth, proper paragraph structure, and how news platforms can cover innovation and civic engagement topics effectively.',
    ],
    'demo-cat-01', // India
    'demo-reporter-01', // Ananya Verma
    ['Innovation', 'Community', 'Youth'],
    true, // featured
    true, // trending
    true, // breaking
    12500,
    2
  ),

  createBaseArticle(
    'demo-article-002',
    'Town Hall Series Opens New Chapter for Civic Conversations',
    'Residents, students, and ward teams exchange ideas in a clearly labelled sample public dialogue initiative.',
    [
      'This fictional news report demonstrates how local governance stories can be presented with clarity and context.',
      'The Town Hall Initiative brings together community members in a series of monthly dialogues. Topics range from sanitation infrastructure to digital literacy programs, with each session structured around resident-led questions.',
      'Sample participants include neighborhood association leaders, university students studying public policy, and municipal officials who present updates on ongoing projects. The sessions are recorded and shared online for broader access.',
      'Organizers hope to expand the model to more districts, creating a replicable framework for civic engagement. Feedback forms show high interest in follow-up sessions on specific infrastructure challenges.',
      'This demo article illustrates balanced reporting, multiple perspectives, and proper attribution—key elements for credible local journalism.',
    ],
    'demo-cat-02', // Politics
    'demo-reporter-01', // Ananya Verma
    ['Governance', 'Community', 'Dialogue'],
    false,
    true,
    true,
    9800,
    5
  ),

  createBaseArticle(
    'demo-article-003',
    'Riverfront Reading Rooms Bring Evening Learning Closer to Neighborhoods',
    'The demo story follows a community library model built around access, safety, and local volunteers.',
    [
      'This sample article explores a fictional library initiative designed to showcase educational and community development coverage.',
      'The Riverfront Reading Rooms project sets up accessible learning spaces along urban waterfronts. Each location features donated books, study tables, and volunteer-led tutoring sessions for school-age children.',
      'Local residents staff the evening shifts, ensuring safety and continuity. The libraries operate on an honor system, with books available for borrowing through a simple registration process.',
      'Initial feedback highlights the value of neighborhood-based learning spaces, particularly for families without home study areas. Several rooms have added digital literacy workshops and career counseling sessions.',
      'This demo content shows how publications can cover education, social development, and volunteer-driven initiatives with depth and human interest.',
    ],
    'demo-cat-03', // Bihar
    'demo-reporter-02', // Rohit Kumar
    ['Education', 'Community', 'Literacy'],
    false,
    false,
    true,
    8200,
    8
  ),

  createBaseArticle(
    'demo-article-004',
    'Small Retailers Map Digital Route to Better Inventory Planning',
    'Sample business owners explore simple tools that make seasonal planning easier in this demo business story.',
    [
      'This fictional business report demonstrates how publications can cover entrepreneurship, digital adoption, and economic development.',
      'A group of small retail owners in this sample scenario have formed a learning collective to explore inventory management software. The tools help them track sales patterns, anticipate seasonal demand, and reduce wastage.',
      'Monthly workshops led by business consultants cover spreadsheet basics, point-of-sale systems, and customer relationship tracking. Participants share their own experiences, creating a peer-learning environment.',
      'Several shop owners report better cash flow management and reduced stockouts during festival seasons. The collective plans to expand its focus to digital payment systems and online order fulfillment.',
      'This demo article illustrates clear business reporting with practical detail, showing how news platforms can support local economic development stories.',
    ],
    'demo-cat-04', // Business
    'demo-reporter-03', // Meera Sinha
    ['Business', 'Digital', 'Entrepreneurs'],
    false,
    true,
    true,
    7600,
    10
  ),

  // Trending Articles (8 articles)
  createBaseArticle(
    'demo-article-005',
    'District Sports Festival Celebrates Teamwork Beyond the Scoreboard',
    'Young teams take part in a fictional three-day festival of athletics, football, and kabaddi in this demo sports coverage.',
    [
      'This sample sports story shows how publications can cover community athletics with energy and local detail.',
      'The District Sports Festival brings together school teams, club athletes, and neighborhood groups for three days of competition and celebration. Events include track and field, football, kabaddi, volleyball, and relay races.',
      'Organizers emphasize participation over competition, with awards for sportsmanship, teamwork, and community spirit alongside traditional medals. Volunteers manage logistics, refreshments, and medical support.',
      'Spectators fill neighborhood grounds, cheering for their local teams. The festival has become a yearly tradition, fostering cross-community connections and encouraging youth engagement in sports.',
      'This demo article demonstrates how news platforms can bring local sports to life, celebrating achievement and community pride.',
    ],
    'demo-cat-07', // Sports
    'demo-reporter-04', // Kunal Raj
    ['Sports', 'Community', 'Youth'],
    false,
    true,
    false,
    9500,
    12
  ),

  createBaseArticle(
    'demo-article-006',
    'Student-Built Accessibility Tool Earns Attention at Campus Showcase',
    'A demo feature about inclusive design, multilingual interfaces, and thoughtful technology from a fictional university project.',
    [
      'This fictional technology story illustrates how publications can cover innovation with depth and human-centered reporting.',
      'A team of computer science students developed a screen-reader-friendly campus navigation tool as their final year project. The app provides audio directions, building descriptions, and real-time updates on accessible routes.',
      'The tool supports three regional languages and integrates voice commands for hands-free operation. Beta testing involved students with visual impairments, whose feedback shaped key features like landmark announcements and indoor navigation.',
      'Faculty advisors praised the project\'s user-centered design process and real-world testing methodology. The team plans to open-source the code, enabling other campuses to adapt the tool.',
      'This demo article shows how technology coverage can highlight social impact, accessibility, and collaborative development.',
    ],
    'demo-cat-05', // Technology
    'demo-reporter-05', // Priya Sharma
    ['Technology', 'Innovation', 'Accessibility'],
    true,
    true,
    false,
    11000,
    15
  ),

  createBaseArticle(
    'demo-article-007',
    'Mentor Circles Help First-Generation Learners Plan Their Next Step',
    'A local education collective pilots friendly peer guidance for senior-secondary students in this demo education story.',
    [
      'This sample article demonstrates effective education reporting with empathy and practical detail.',
      'The Mentor Circle program connects high school seniors with college students and recent graduates who guide them through career planning, college applications, and scholarship opportunities.',
      'Sessions are informal, held in community centers and public libraries. Mentors share their own experiences navigating higher education, financial aid, and career transitions, creating a relatable support network.',
      'Participating students report increased confidence in exploring career paths and understanding application processes. Many come from families where they are the first to pursue higher education.',
      'This demo content shows how publications can cover education programs that address equity, access, and student support systems.',
    ],
    'demo-cat-06', // Education
    'demo-reporter-02', // Rohit Kumar
    ['Education', 'Mentorship', 'Students'],
    false,
    true,
    false,
    8900,
    18
  ),

  createBaseArticle(
    'demo-article-008',
    'Independent Theatre Group Brings Fresh Folk Tale to City Stage',
    'A colorful sample cultural report from a fictional evening performance showcasing regional storytelling.',
    [
      'This demo entertainment story shows how publications can celebrate local arts and culture with vivid description.',
      'The Kala Collective, a fictional independent theatre group, staged a contemporary adaptation of a regional folk tale last weekend. The production blends traditional music, modern choreography, and visual projections.',
      'Audience members filled the open-air amphitheater, drawn by word-of-mouth promotion and social media buzz. The performance incorporates live percussion, audience participation, and multilingual narration.',
      'Cast members include school teachers, college students, and working professionals who rehearse on weekends. The group aims to make theatre accessible and culturally rooted, performing in public spaces rather than exclusive venues.',
      'This demo article demonstrates how cultural coverage can be engaging, descriptive, and community-focused.',
    ],
    'demo-cat-08', // Entertainment
    'demo-reporter-01', // Ananya Verma
    ['Culture', 'Theatre', 'Arts'],
    false,
    true,
    false,
    6700,
    20
  ),

  createBaseArticle(
    'demo-article-009',
    'Community Safety Desk Launches Awareness Week for Digital Reporting',
    'This fictional explainer focuses on online safety habits and verified reporting channels.',
    [
      'This demo article shows how publications can cover public safety and digital literacy with clarity and public service focus.',
      'The Community Safety Desk, a fictional initiative, has launched a week-long awareness campaign on recognizing misinformation, verifying news sources, and reporting suspicious online activity.',
      'Workshops target school students, parents, and senior citizens, covering topics like phishing scams, social media verification, and digital privacy. Materials are available in regional languages and simplified formats.',
      'Local police representatives participate in sessions, providing guidance on official reporting channels and debunking common rumors. The program emphasizes media literacy as a community responsibility.',
      'This demo content illustrates responsible reporting on public safety, digital literacy, and community engagement.',
    ],
    'demo-cat-09', // Health (using for safety/awareness)
    'demo-reporter-05', // Priya Sharma
    ['Safety', 'Digital', 'Awareness'],
    false,
    true,
    false,
    7800,
    22
  ),

  createBaseArticle(
    'demo-article-010',
    'Local Farmers Experiment with Water-Saving Irrigation Methods',
    'Sample agricultural report shows how traditional knowledge meets modern technique in this demo story.',
    [
      'This fictional agriculture story demonstrates rural and environment coverage with practical focus.',
      'A group of farmers in this demo scenario have formed a learning cooperative to explore drip irrigation and rainwater harvesting. The initiative aims to reduce water consumption while maintaining crop yields.',
      'Technical experts from agricultural universities provide training on system installation, maintenance, and monitoring. Farmers share results through monthly meet-ups, comparing water usage and crop health.',
      'Early adopters report significant water savings and more consistent yields during dry spells. The cooperative has attracted interest from neighboring villages looking to replicate the model.',
      'This demo article shows how publications can cover agriculture, sustainability, and rural innovation with respect and detail.',
    ],
    'demo-cat-03', // Bihar
    'demo-reporter-02', // Rohit Kumar
    ['Agriculture', 'Innovation', 'Sustainability'],
    false,
    true,
    false,
    8400,
    24
  ),

  createBaseArticle(
    'demo-article-011',
    'Mobile Health Clinics Reach Remote Villages in Sample Initiative',
    'This demo health story covers a fictional medical outreach program bringing basic care closer to underserved areas.',
    [
      'This sample article demonstrates health reporting with empathy, accuracy, and public service focus.',
      'The Mobile Health Clinic program, entirely fictional, deploys medical teams to remote villages on a rotating schedule. Services include basic health check-ups, vaccinations, maternal care consultations, and medicine distribution.',
      'Teams consist of doctors, nurses, and community health workers who maintain patient records and schedule follow-up visits. The program collaborates with local schools and community centers to reach more families.',
      'Villagers report improved access to preventive care and health education. The initiative has reduced travel costs and time for families seeking basic medical attention.',
      'This demo content shows how publications can cover healthcare access, rural development, and public health with dignity and clarity.',
    ],
    'demo-cat-09', // Health
    'demo-reporter-01', // Ananya Verma
    ['Health', 'Rural', 'Access'],
    false,
    true,
    false,
    9200,
    26
  ),

  createBaseArticle(
    'demo-article-012',
    'Weekend Coding Bootcamp Opens Doors to Career Switchers',
    'Sample tech education story follows working professionals learning programming in this demo article.',
    [
      'This fictional technology story shows how publications can cover skill development and career transitions.',
      'The Weekend Coding Bootcamp offers beginner-friendly programming courses for working professionals exploring career changes. Classes cover web development basics, database fundamentals, and project collaboration.',
      'Instructors are industry professionals who volunteer their time, providing real-world context and mentorship. The program emphasizes hands-on projects and portfolio building over theoretical lectures.',
      'Participants include teachers, retail workers, and administrative staff looking to pivot into technology roles. Several graduates have secured junior developer positions or launched freelance careers.',
      'This demo article demonstrates how tech education coverage can be accessible, practical, and focused on opportunity.',
    ],
    'demo-cat-05', // Technology
    'demo-reporter-05', // Priya Sharma
    ['Technology', 'Education', 'Careers'],
    false,
    true,
    false,
    7200,
    28
  ),

  // Featured Articles (5 more articles)
  createBaseArticle(
    'demo-article-013',
    'Neighborhood Book Club Grows into Community Learning Circle',
    'Sample story shows how informal reading groups evolve into broader educational gatherings in this demo article.',
    [
      'This fictional culture story illustrates how publications can cover community-building and lifelong learning.',
      'What started as a small neighborhood book club has expanded into a multifaceted learning circle, hosting author talks, writing workshops, and skill-sharing sessions.',
      'Monthly gatherings attract diverse participants—students, retirees, working professionals—who discuss books, share personal projects, and exchange knowledge. Recent sessions covered budgeting, gardening, and digital tools.',
      'The group operates without formal membership fees, relying on donated books and volunteer facilitators. Meetings rotate between homes, community centers, and public parks.',
      'This demo content shows how publications can celebrate grassroots education, community cohesion, and informal learning networks.',
    ],
    'demo-cat-06', // Education
    'demo-reporter-02', // Rohit Kumar
    ['Community', 'Learning', 'Culture'],
    true,
    false,
    false,
    6500,
    30
  ),

  createBaseArticle(
    'demo-article-014',
    'Youth Cricket League Brings Neighborhood Teams Together',
    'Sample sports story covers a fictional local tournament fostering talent and sportsmanship.',
    [
      'This demo sports article shows how publications can cover grassroots athletics with enthusiasm and local color.',
      'The Youth Cricket League organizes weekend matches between neighborhood teams, providing young players with competitive experience and coaching support.',
      'Matches are held on public grounds, with local volunteers managing scheduling, umpiring, and scorekeeping. Teams consist of players aged 12-18, with mixed skill levels encouraged.',
      'League organizers focus on fair play, skill development, and community spirit. Awards recognize improvement, teamwork, and positive attitude alongside traditional performance metrics.',
      'This demo article demonstrates engaging sports coverage that celebrates participation, youth development, and community pride.',
    ],
    'demo-cat-07', // Sports
    'demo-reporter-04', // Kunal Raj
    ['Sports', 'Youth', 'Cricket'],
    true,
    false,
    false,
    10200,
    32
  ),

  createBaseArticle(
    'demo-article-015',
    'Startup Connects Local Artisans with Online Buyers',
    'Sample business story follows a fictional platform helping traditional craftspeople reach new markets.',
    [
      'This demo business article shows how publications can cover entrepreneurship, e-commerce, and traditional crafts.',
      'A fictional startup has built an online marketplace connecting local artisans—weavers, potters, metalworkers—with customers across the region. The platform handles photography, listings, payments, and shipping.',
      'Artisans receive training on product presentation, pricing, and customer communication. The startup charges a commission but provides marketing and logistics support that individual craftspeople would struggle to manage alone.',
      'Early success stories include weavers expanding their customer base beyond local markets and potters receiving custom orders from urban buyers. The platform emphasizes fair pricing and sustainable production.',
      'This demo content illustrates how business coverage can highlight social impact, digital inclusion, and economic opportunity.',
    ],
    'demo-cat-04', // Business
    'demo-reporter-03', // Meera Sinha
    ['Business', 'Startups', 'Artisans'],
    true,
    false,
    false,
    8800,
    35
  ),

  createBaseArticle(
    'demo-article-016',
    'City Parks Initiative Adds Green Spaces to Dense Neighborhoods',
    'Sample urban development story covers a fictional effort to increase accessible public green spaces.',
    [
      'This demo article demonstrates how publications can cover urban planning, environment, and public space.',
      'The City Parks Initiative, entirely fictional, identifies underutilized plots and transforms them into neighborhood parks with native plants, walking paths, and seating areas.',
      'Community members participate in design consultations, planting drives, and ongoing maintenance. The project prioritizes accessibility, safety lighting, and family-friendly amenities.',
      'Newly opened parks have become popular gathering spots for morning exercise, evening strolls, and weekend family outings. Residents report increased neighborhood cohesion and property value.',
      'This demo content shows how environmental and civic coverage can be positive, detailed, and focused on tangible community benefit.',
    ],
    'demo-cat-01', // India
    'demo-reporter-01', // Ananya Verma
    ['Environment', 'Urban', 'Community'],
    true,
    false,
    false,
    7500,
    38
  ),

  createBaseArticle(
    'demo-article-017',
    'State University Launches Open-Access Research Repository',
    'Sample education story covers a fictional initiative making academic research freely available online.',
    [
      'This demo article shows how publications can cover academic institutions, research, and knowledge sharing.',
      'A fictional state university has launched an open-access repository where faculty and students publish research papers, theses, and project reports. The platform makes scholarly work freely accessible to the public.',
      'The repository includes multilingual abstracts, allowing non-academic readers to engage with research findings. Topics range from agricultural science to urban studies, reflecting the university\'s regional focus.',
      'Librarians and IT staff manage the platform, providing training on submission processes and citation standards. The initiative aims to democratize access to publicly funded research.',
      'This demo content demonstrates how education and technology coverage can intersect, highlighting access, transparency, and public knowledge.',
    ],
    'demo-cat-06', // Education
    'demo-reporter-02', // Rohit Kumar
    ['Education', 'Research', 'Access'],
    true,
    false,
    false,
    6900,
    40
  ),

  // Latest News Articles (35+ more articles across all categories)
  ...Array.from({ length: 35 }, (_, i) => {
    const articleNum = 18 + i;
    const categoryIndex = i % DEMO_CATEGORIES.length;
    const authorIndex = i % DEMO_REPORTERS.length;
    const hoursAgo = 45 + i * 5;
    
    const titles = [
      'Local Council Approves Infrastructure Development Plan',
      'Small Business Summit Brings Entrepreneurs Together',
      'School District Announces New Digital Literacy Program',
      'Regional Marathon Attracts Record Participant Numbers',
      'Tech Meetup Explores Artificial Intelligence Applications',
      'Community Garden Project Welcomes New Volunteers',
      'Healthcare Workers Receive Training on Emergency Response',
      'Art Exhibition Showcases Regional Contemporary Works',
      'Public Transit System Expands Evening Service Routes',
      'Vocational Training Center Opens New Skill Development Courses',
      'Local Football Club Celebrates Championship Victory',
      'Startup Incubator Graduates Third Batch of Companies',
      'Municipal Library Adds Digital Resource Collection',
      'Farmers Market Celebrates Ten Years of Community Service',
      'Environmental Workshop Covers Waste Reduction Strategies',
      'Career Fair Connects Job Seekers with Regional Employers',
      'Music Festival Lineup Features Regional and National Artists',
      'Banking Services Reach Remote Villages Through Mobile Units',
      'School Science Fair Highlights Student Innovation Projects',
      'District Administration Launches Citizen Feedback Portal',
      'Local Cycling Club Organizes Weekend Recreational Rides',
      'Technology Workshop Introduces Seniors to Smartphone Usage',
      'Community Theater Announces Season Performance Schedule',
      'Agricultural Cooperative Reports Successful Harvest Season',
      'Public Health Campaign Focuses on Preventive Care Awareness',
      'Business Networking Event Brings Industry Leaders Together',
      'University Partners with Industry for Research Collaboration',
      'Youth Leadership Program Concludes with Community Projects',
      'Traditional Craft Fair Celebrates Regional Artisan Heritage',
      'City Council Meeting Addresses Traffic Management Solutions',
      'Sports Academy Opens Registrations for Winter Training',
      'Digital Payment Adoption Grows Among Small Vendors',
      'Adult Education Classes Offer Evening Learning Opportunities',
      'Regional Literature Festival Celebrates Local Authors',
      'Infrastructure Projects Show Progress in Quarterly Review',
    ];

    const excerpts = [
      'Detailed coverage of recent developments and their impact on the local community.',
      'This sample article demonstrates comprehensive reporting on community initiatives.',
      'An original demo story showcasing how news platforms present local development.',
      'Fictional coverage designed to illustrate balanced, informative journalism.',
      'This demo article shows how publications cover regional progress and challenges.',
    ];

    return createBaseArticle(
      `demo-article-${String(articleNum).padStart(3, '0')}`,
      titles[i % titles.length],
      excerpts[i % excerpts.length],
      [
        'This is a demo article created to populate the SangTX demo tenant with realistic content.',
        'All names, events, organizations, and statistics in this article are entirely fictional and created for demonstration purposes only.',
        'The article structure, formatting, and editorial style demonstrate how a SangTX-powered publication can present news content professionally.',
        'This sample content shows proper paragraph structure, clear attribution, and balanced reporting—key elements of credible journalism.',
      ],
      DEMO_CATEGORIES[categoryIndex].id,
      DEMO_REPORTERS[authorIndex].id,
      ['Demo', DEMO_CATEGORIES[categoryIndex].name],
      false,
      false,
      false,
      3000 + i * 200,
      hoursAgo
    );
  }),
];

// Sort articles: featured first, then by publish date
DEMO_ARTICLES.sort((a, b) => {
  if (a.breaking && !b.breaking) return -1;
  if (!a.breaking && b.breaking) return 1;
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;
  if (a.trending && !b.trending) return -1;
  if (!a.trending && b.trending) return 1;
  return new Date(b.publish_at || 0).getTime() - new Date(a.publish_at || 0).getTime();
});

// ═══════════════════════════════════════════════════════════════════════════
// DEMO BREAKING NEWS
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_BREAKING_NEWS: BreakingHeadline[] = [
  {
    id: 'demo-breaking-01',
    headline: 'Community Innovation Labs Connect Young Makers with Local Challenges',
    link_url: '/demo/article/community-innovation-labs-connect-young-makers-with-local-challenges',
    sort_order: 1,
  },
  {
    id: 'demo-breaking-02',
    headline: 'Town Hall Series Opens New Chapter for Civic Conversations',
    link_url: '/demo/article/town-hall-series-opens-new-chapter-for-civic-conversations',
    sort_order: 2,
  },
  {
    id: 'demo-breaking-03',
    headline: 'Small Retailers Map Digital Route to Better Inventory Planning',
    link_url: '/demo/article/small-retailers-map-digital-route-to-better-inventory-planning',
    sort_order: 3,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEMO ADVERTISEMENTS
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_ADVERTISEMENTS: AdvertisementPlacement[] = [
  {
    id: 'demo-ad-01',
    placement: 'homepage_top',
    ad_type: 'direct',
    advertiser_name: 'Smart Education Academy',
    title: 'Admissions Open for New Session',
    target_url: null,
    banner_url: null,
    position: 'top',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ad-02',
    placement: 'sidebar',
    ad_type: 'direct',
    advertiser_name: 'City Hospital',
    title: 'Advanced Healthcare Services',
    target_url: null,
    banner_url: null,
    position: 'sidebar',
    start_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ad-03',
    placement: 'article_mid',
    ad_type: 'direct',
    advertiser_name: 'Local Motors',
    title: 'Year-End Sale on All Models',
    target_url: null,
    banner_url: null,
    position: 'mid',
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ad-04',
    placement: 'homepage_bottom',
    ad_type: 'direct',
    advertiser_name: 'Bihar Digital Solutions',
    title: 'Website Development & Digital Marketing',
    target_url: null,
    banner_url: null,
    position: 'bottom',
    start_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-ad-05',
    placement: 'article_bottom',
    ad_type: 'direct',
    advertiser_name: 'Patna Business Hub',
    title: 'Co-working Spaces Available',
    target_url: null,
    banner_url: null,
    position: 'bottom',
    start_date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// DEMO SITE SETTINGS
// ═══════════════════════════════════════════════════════════════════════════

export const DEMO_SITE_SETTINGS: SiteSettings = {
  site_name: DEMO_TENANT_NAME,
  logo_url: null,
  contact_name: 'Editorial Team',
  contact_phone: '+91 000-000-0000',
  contact_email: 'demo@example.com',
  social_links: {
    facebook: '#',
    twitter: '#',
    instagram: '#',
    youtube: '#',
  },
  footer_text: `${DEMO_TENANT_NAME} is a fictional demo publication created to showcase the SangTX platform. All content, names, and events are entirely fictional.`,
  theme_config: {
    primary_color: '#dc2626',
    secondary_color: '#0f172a',
    tagline: DEMO_TENANT_TAGLINE,
    site_url: '/demo',
    breaking_ticker: true,
    comments_enabled: false,
    maintenance_mode: false,
    dark_mode: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA ACCESS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

export function getDemoArticleBySlug(slug: string): PublicArticle | null {
  return DEMO_ARTICLES.find(article => article.slug === slug) || null;
}

export function getDemoCategoryBySlug(slug: string): PublicCategory | null {
  return DEMO_CATEGORIES.find(category => category.slug === slug) || null;
}

export function searchDemoArticles(query: string): PublicArticle[] {
  if (!query.trim()) {
    return DEMO_ARTICLES;
  }

  const searchTerm = query.toLowerCase().trim();
  return DEMO_ARTICLES.filter(article => {
    const searchable = [
      article.title,
      article.excerpt,
      article.category_name,
      article.author_name,
      ...article.tags,
      ...article.content,
    ].join(' ').toLowerCase();

    return searchable.includes(searchTerm);
  });
}

export function getDemoArticlesByCategory(categorySlug: string): PublicArticle[] {
  return DEMO_ARTICLES.filter(article => article.category_slug === categorySlug);
}

export function getFeaturedDemoArticles(limit = 5): PublicArticle[] {
  return DEMO_ARTICLES.filter(article => article.featured).slice(0, limit);
}

export function getTrendingDemoArticles(limit = 10): PublicArticle[] {
  return DEMO_ARTICLES.filter(article => article.trending).slice(0, limit);
}

export function getBreakingDemoArticles(limit = 4): PublicArticle[] {
  return DEMO_ARTICLES.filter(article => article.breaking).slice(0, limit);
}

export function getVideoDemoArticles(limit = 8): PublicArticle[] {
  return DEMO_ARTICLES.filter(article => article.media_type === 'video').slice(0, limit);
}

export function getMostReadDemoArticles(limit = 10): PublicArticle[] {
  return [...DEMO_ARTICLES]
    .sort((a, b) => b.views_count - a.views_count)
    .slice(0, limit);
}

export function getLatestDemoArticles(limit = 20): PublicArticle[] {
  return DEMO_ARTICLES.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════
// READ-ONLY ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * All demo mutations must be rejected.
 * This function provides a standardized error for all mutation attempts.
 */
export function rejectDemoMutation(operation: string): never {
  throw new Error(
    `DEMO_READ_ONLY: ${operation} is not allowed in demo mode. ` +
    `The demo tenant is read-only for exploration purposes. ` +
    `Start your free trial to create and manage your own content.`
  );
}

/**
 * Validates that an operation is not targeting the demo tenant.
 * Use this in admin mutation functions.
 */
export function assertNotDemoTenant(tenantId?: string): void {
  if (tenantId === DEMO_TENANT_ID || window.location.pathname.startsWith('/demo')) {
    rejectDemoMutation('Mutation');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DEMO DATA
// These types and data are used ONLY for the demo admin panel
// They share the same underlying data as the public demo, but in admin format
// ═══════════════════════════════════════════════════════════════════════════

import type {
  AdminArticle,
  AdminCategory,
  AdminMediaItem,
  AdminReporter,
  AdminAd,
  AdminRole,
  AdminUser,
  SeoSetting,
  NotificationRow,
  AuditLogRow,
  BreakingNewsRow,
  SubscriptionRow,
  CampaignRow,
} from './admin';

// Convert public articles to admin format (with status, timestamps, etc.)
export const DEMO_ADMIN_ARTICLES: AdminArticle[] = DEMO_ARTICLES.map(article => ({
  ...article,
  status: (article.breaking ? 'published' : article.trending ? 'published' : article.featured ? 'published' : 'published') as AdminArticle['status'],
  created_at: new Date(Date.parse(article.publish_at!) - 24 * 60 * 60 * 1000).toISOString(),
  updated_at: article.publish_at!,
  deleted_at: null,
}));

// Convert categories to admin format
export const DEMO_ADMIN_CATEGORIES: AdminCategory[] = DEMO_CATEGORIES.map((cat, idx) => ({
  ...cat,
  created_at: new Date(Date.now() - (100 - idx) * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - (50 - idx) * 24 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
}));

// Demo media library
export const DEMO_ADMIN_MEDIA: AdminMediaItem[] = [
  // Technology images
  {
    id: 'demo-media-001',
    file_name: 'tech-innovation.jpg',
    file_path: 'media/demo/tech-innovation.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 245800,
    width: 1200,
    height: 800,
    alt_text: 'Technology and innovation workspace',
    caption: 'Modern technology development environment',
    usage_count: 5,
    is_featured: true,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-002',
    file_name: 'government-building.jpg',
    file_path: 'media/demo/government-building.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 298500,
    width: 1200,
    height: 800,
    alt_text: 'Government building architecture',
    caption: 'Civic administration building',
    usage_count: 4,
    is_featured: true,
    created_at: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-003',
    file_name: 'community-gathering.jpg',
    file_path: 'media/demo/community-gathering.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 312400,
    width: 1200,
    height: 800,
    alt_text: 'Community gathering and meeting',
    caption: 'Local community event',
    usage_count: 8,
    is_featured: true,
    created_at: new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 26 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-004',
    file_name: 'education-classroom.jpg',
    file_path: 'media/demo/education-classroom.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 289600,
    width: 1200,
    height: 800,
    alt_text: 'Students in classroom environment',
    caption: 'Education and learning',
    usage_count: 6,
    is_featured: true,
    created_at: new Date(Date.now() - 54 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-005',
    file_name: 'business-meeting.jpg',
    file_path: 'media/demo/business-meeting.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 276300,
    width: 1200,
    height: 800,
    alt_text: 'Business professionals in meeting',
    caption: 'Corporate business environment',
    usage_count: 7,
    is_featured: true,
    created_at: new Date(Date.now() - 52 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-006',
    file_name: 'sports-stadium.jpg',
    file_path: 'media/demo/sports-stadium.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 334500,
    width: 1200,
    height: 800,
    alt_text: 'Stadium sports venue',
    caption: 'Athletic sports facility',
    usage_count: 5,
    is_featured: false,
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-007',
    file_name: 'healthcare-facility.jpg',
    file_path: 'media/demo/healthcare-facility.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 265700,
    width: 1200,
    height: 800,
    alt_text: 'Medical healthcare facility',
    caption: 'Health services and wellness',
    usage_count: 4,
    is_featured: false,
    created_at: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-008',
    file_name: 'entertainment-stage.jpg',
    file_path: 'media/demo/entertainment-stage.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 297800,
    width: 1200,
    height: 800,
    alt_text: 'Theater and performance stage',
    caption: 'Cultural entertainment venue',
    usage_count: 3,
    is_featured: false,
    created_at: new Date(Date.now() - 46 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-009',
    file_name: 'nature-environment.jpg',
    file_path: 'media/demo/nature-environment.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 321400,
    width: 1200,
    height: 800,
    alt_text: 'Natural environment landscape',
    caption: 'Environmental conservation',
    usage_count: 6,
    is_featured: false,
    created_at: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-media-010',
    file_name: 'urban-cityscape.jpg',
    file_path: 'media/demo/urban-cityscape.jpg',
    storage_bucket: 'media',
    mime_type: 'image/jpeg',
    file_size: 342600,
    width: 1200,
    height: 800,
    alt_text: 'Urban city development',
    caption: 'City infrastructure and planning',
    usage_count: 5,
    is_featured: false,
    created_at: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  // Additional varied media items
  ...Array.from({ length: 20 }, (_, i) => {
    const idx = i + 11;
    const types = ['technology', 'community', 'education', 'business', 'sports', 'health', 'culture', 'environment'];
    const type = types[i % types.length];
    return {
      id: `demo-media-${String(idx).padStart(3, '0')}`,
      file_name: `${type}-${idx}.jpg`,
      file_path: `media/demo/${type}-${idx}.jpg`,
      storage_bucket: 'media',
      mime_type: 'image/jpeg',
      file_size: 200000 + Math.floor(Math.random() * 300000),
      width: 1200,
      height: 800,
      alt_text: `${type.charAt(0).toUpperCase() + type.slice(1)} related image ${idx}`,
      caption: i % 3 === 0 ? `Sample ${type} content image` : null,
      usage_count: Math.floor(Math.random() * 10),
      is_featured: false,
      created_at: new Date(Date.now() - (40 - i * 2) * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - (10 - Math.floor(i / 2)) * 24 * 60 * 60 * 1000).toISOString(),
      deleted_at: null,
    } as AdminMediaItem;
  }),
];

// Demo reporters (extended from public data)
export const DEMO_ADMIN_REPORTERS: AdminReporter[] = DEMO_REPORTERS.map((reporter, idx) => ({
  id: reporter.id,
  full_name: reporter.full_name,
  slug: reporter.slug,
  bio: reporter.bio,
  specialty: reporter.role,
  avatar_url: null,
  status: 'active',
  social_links: {},
  user_id: `demo-user-${String(idx + 1).padStart(3, '0')}`,
  created_at: new Date(Date.now() - (120 - idx * 10) * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - (60 - idx * 5) * 24 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
  email: reporter.email,
  role_slug: 'reporter',
}));

// Demo advertisements
export const DEMO_ADMIN_ADS: AdminAd[] = [
  {
    id: 'demo-ad-001',
    placement: 'header',
    ad_type: 'direct',
    advertiser_name: 'Sample Advertiser Inc',
    title: 'Header Banner Campaign',
    target_url: '#',
    banner_url: null,
    position: 'top',
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    click_count: 1250,
    impression_count: 45000,
    is_active: true,
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-ad-002',
    placement: 'sidebar',
    ad_type: 'direct',
    advertiser_name: 'Demo Business Solutions',
    title: 'Sidebar Display Ad',
    target_url: '#',
    banner_url: null,
    position: 'right',
    start_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    click_count: 890,
    impression_count: 32000,
    is_active: true,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-ad-003',
    placement: 'article',
    ad_type: 'adsense',
    advertiser_name: 'Google AdSense',
    title: 'Article Inline Ads',
    target_url: null,
    banner_url: null,
    position: 'middle',
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: null,
    click_count: 3200,
    impression_count: 125000,
    is_active: true,
    created_at: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];

// Demo roles
export const DEMO_ADMIN_ROLES: AdminRole[] = [
  {
    id: 'demo-role-001',
    name: 'Administrator',
    slug: 'admin',
    description: 'Full system access and management capabilities',
    is_system: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    user_count: 2,
  },
  {
    id: 'demo-role-002',
    name: 'Editor',
    slug: 'editor',
    description: 'Content management and editorial oversight',
    is_system: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    user_count: 3,
  },
  {
    id: 'demo-role-003',
    name: 'Reporter',
    slug: 'reporter',
    description: 'Article creation and submission',
    is_system: true,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 160 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    user_count: 5,
  },
];

// Demo users
export const DEMO_ADMIN_USERS: AdminUser[] = [
  {
    id: 'demo-user-001',
    auth_user_id: null,
    role_id: 'demo-role-001',
    full_name: 'Ananya Verma',
    email: 'ananya@example.demo',
    avatar_url: null,
    phone: null,
    bio: 'Senior Editor with 12 years of experience',
    status: 'active',
    last_login_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    role_name: 'Editor',
    role_slug: 'editor',
  },
  {
    id: 'demo-user-002',
    auth_user_id: null,
    role_id: 'demo-role-003',
    full_name: 'Rohit Kumar',
    email: 'rohit@example.demo',
    avatar_url: null,
    phone: null,
    bio: 'Reporter covering education and social issues',
    status: 'active',
    last_login_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    role_name: 'Reporter',
    role_slug: 'reporter',
  },
  {
    id: 'demo-user-003',
    auth_user_id: null,
    role_id: 'demo-role-003',
    full_name: 'Meera Sinha',
    email: 'meera@example.demo',
    avatar_url: null,
    phone: null,
    bio: 'Business Correspondent',
    status: 'active',
    last_login_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    role_name: 'Reporter',
    role_slug: 'reporter',
  },
  {
    id: 'demo-user-004',
    auth_user_id: null,
    role_id: 'demo-role-003',
    full_name: 'Kunal Raj',
    email: 'kunal@example.demo',
    avatar_url: null,
    phone: null,
    bio: 'Sports Editor',
    status: 'active',
    last_login_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    role_name: 'Reporter',
    role_slug: 'reporter',
  },
  {
    id: 'demo-user-005',
    auth_user_id: null,
    role_id: 'demo-role-003',
    full_name: 'Priya Sharma',
    email: 'priya@example.demo',
    avatar_url: null,
    phone: null,
    bio: 'Technology Reporter',
    status: 'active',
    last_login_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
    role_name: 'Reporter',
    role_slug: 'reporter',
  },
];

// Demo SEO settings
export const DEMO_ADMIN_SEO_SETTINGS: SeoSetting[] = [
  {
    id: 'demo-seo-001',
    page_path: '/',
    meta_title: 'Disha News - Sample Publication Powered by SangTX',
    meta_description: 'A fictional demo publication showcasing complete news platform capabilities',
    og_title: 'Disha News - Demo Publication',
    og_description: 'Explore the SangTX news platform with our demo publication',
    twitter_title: null,
    twitter_description: null,
    schema_json: {},
    canonical_url: '/demo',
    is_indexed: false,
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];

// Demo notifications
export const DEMO_ADMIN_NOTIFICATIONS: NotificationRow[] = [
  {
    id: 'demo-notif-001',
    title: 'System Maintenance Scheduled',
    message: 'Demo notification: Platform maintenance scheduled for next Sunday 2-4 AM',
    channel: 'in-app',
    status: 'sent',
    scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-notif-002',
    title: 'New Feature: Video Articles',
    message: 'Demo notification: Check out the new video article support in the editor',
    channel: 'email',
    status: 'sent',
    scheduled_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    sent_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-notif-003',
    title: 'Weekly Newsletter Draft',
    message: 'Demo notification: Your weekly newsletter draft is ready for review',
    channel: 'in-app',
    status: 'draft',
    scheduled_at: null,
    sent_at: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];

// Demo audit logs
export const DEMO_ADMIN_AUDIT_LOGS: AuditLogRow[] = Array.from({ length: 50 }, (_, i) => {
  const actions = ['article.published', 'article.updated', 'category.created', 'user.login', 'settings.updated', 'media.uploaded'];
  const entities = ['article', 'category', 'user', 'settings', 'media'];
  
  return {
    id: `demo-audit-${String(i + 1).padStart(3, '0')}`,
    action: actions[i % actions.length],
    entity_type: entities[i % entities.length],
    entity_id: `demo-entity-${String(i + 1).padStart(3, '0')}`,
    metadata: { demo: true, index: i },
    ip_address: '192.168.1.100',
    created_at: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
  };
});

// Demo breaking news
export const DEMO_ADMIN_BREAKING_NEWS: BreakingNewsRow[] = DEMO_BREAKING_NEWS.map((item, idx) => ({
  id: `demo-breaking-${String(idx + 1).padStart(3, '0')}`,
  headline: item.headline,
  link_url: item.link_url,
  is_active: true, // All demo breaking news is active
  starts_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  sort_order: item.sort_order,
  created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
}));

// Demo subscriptions
export const DEMO_ADMIN_SUBSCRIPTIONS: SubscriptionRow[] = Array.from({ length: 250 }, (_, i) => ({
  id: `demo-sub-${String(i + 1).padStart(3, '0')}`,
  email: `subscriber${i + 1}@example.demo`,
  full_name: `Demo Subscriber ${i + 1}`,
  status: i % 10 === 0 ? 'unsubscribed' : 'active',
  source: i % 3 === 0 ? 'homepage' : i % 3 === 1 ? 'article' : 'footer',
  created_at: new Date(Date.now() - (250 - i) * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - (100 - Math.floor(i / 3)) * 24 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
}));

// Demo campaigns
export const DEMO_ADMIN_CAMPAIGNS: CampaignRow[] = [
  {
    id: 'demo-campaign-001',
    name: 'Q1 Brand Awareness',
    advertiser_name: 'Sample Advertiser Inc',
    campaign_type: 'direct',
    status: 'active',
    budget: 50000,
    spent: 32500,
    impressions: 450000,
    clicks: 12500,
    start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'demo-campaign-002',
    name: 'Summer Sale Promotion',
    advertiser_name: 'Demo Business Solutions',
    campaign_type: 'direct',
    status: 'completed',
    budget: 30000,
    spent: 30000,
    impressions: 320000,
    clicks: 8900,
    start_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 130 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];
