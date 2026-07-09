export type Article = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  section: string;
  author: string;
  authorRole: string;
  publishDate: string;
  readTime: string;
  image: string;
  content: string[];
  tags: string[];
  featured?: boolean;
  trending?: boolean;
  breaking?: boolean;
  views: string;
};

export type VideoClip = {
  slug: string;
  title: string;
  duration: string;
  thumbnail: string;
  category: string;
};

export type CommentItem = {
  name: string;
  time: string;
  text: string;
};

export const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Bihar', path: '/category/bihar' },
  { label: 'Sitamarhi', path: '/category/sitamarhi' },
  { label: 'Politics', path: '/category/politics' },
  { label: 'Crime', path: '/category/crime' },
  { label: 'Education', path: '/category/education' },
  { label: 'Jobs', path: '/category/jobs' },
  { label: 'Sports', path: '/category/sports' },
  { label: 'Entertainment', path: '/category/entertainment' },
  { label: 'Admin', path: '/admin' },
];

export const breakingNews = [
  'बिहार में नई शिक्षा नीति लागू, सभी सरकारी स्कूलों में डिजिटल कक्षाएं शुरू',
  'सीतामढ़ी में मेगा जॉब फेयर का आयोजन, 5000+ युवाओं को मिलेगा रोजगार',
  'मुजफ्फरपुर-सीतामढ़ी नेशनल हाईवे का उद्घाटन अगले महीने',
  'राज्य सरकार ने किसानों के लिए नई सब्सिडी योजना की घोषणा की',
];

export const categorySummaries = [
  {
    slug: 'bihar',
    title: 'Bihar News',
    description: 'राज्य की राजनीति, विकास, शिक्षा और जनहित से जुड़ी ताज़ा ख़बरें.',
  },
  {
    slug: 'sitamarhi',
    title: 'Sitamarhi News',
    description: 'सीतामढ़ी जिले की ज़मीनी रिपोर्टिंग, लोकल अपडेट और ब्रेकिंग कवरेज.',
  },
  {
    slug: 'politics',
    title: 'Politics',
    description: 'सरकारी फैसले, चुनावी हलचल, बयानबाज़ी और नीतिगत घटनाक्रम.',
  },
  {
    slug: 'crime',
    title: 'Crime',
    description: 'जिले और राज्य भर की अपराध खबरें, जांच, पुलिस कार्रवाई और कोर्ट अपडेट.',
  },
  {
    slug: 'education',
    title: 'Education',
    description: 'स्कूल, कॉलेज, परीक्षा, रिज़ल्ट और छात्र जीवन से जुड़ी प्रमुख रिपोर्ट्स.',
  },
  {
    slug: 'jobs',
    title: 'Jobs',
    description: 'सरकारी और निजी नौकरियों की सूचना, भर्ती और करियर मार्गदर्शन.',
  },
  {
    slug: 'sports',
    title: 'Sports',
    description: 'क्रिकेट, फुटबॉल, राज्य स्तरीय खेल और युवा प्रतिभाओं की खबरें.',
  },
  {
    slug: 'entertainment',
    title: 'Entertainment',
    description: 'फिल्म, टीवी, संस्कृति, वायरल कहानियाँ और मनोरंजन जगत की अपडेट्स.',
  },
];

const image = (id: number) => `https://images.unsplash.com/photo-1${id}7036967-23d11aacaee0?w=900&h=600&fit=crop`;

export const articles: Article[] = [
  {
    slug: 'cm-nitish-visit-sitamarhi-major-announcements',
    title: 'CM नीतीश का सीतामढ़ी दौरा: बड़ी घोषणाएं',
    excerpt: 'मुख्यमंत्री ने विकास योजनाओं की समीक्षा की और जिला स्तर पर कई नए कार्यों का ऐलान किया.',
    category: 'Bihar',
    section: 'bihar',
    author: 'Rahul Kumar',
    authorRole: 'Senior Reporter',
    publishDate: '31 May 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&h=800&fit=crop',
    content: [
      'राज्य सरकार की प्राथमिकताओं में अब इंफ्रास्ट्रक्चर, शिक्षा और स्वास्थ्य की तेज़ रफ्तार प्रगति शामिल है.',
      'जिला प्रशासन को समयसीमा के भीतर सभी विकास योजनाओं की प्रगति रिपोर्ट साझा करने के निर्देश दिए गए.',
      'स्थानीय लोगों ने सड़क, बिजली और जल निकासी के कामों में तेजी की मांग दोहराई.',
    ],
    tags: ['Bihar', 'Politics', 'Development'],
    featured: true,
    trending: true,
    views: '84.2K',
  },
  {
    slug: 'sitamarhi-medical-college-announcement',
    title: 'सीतामढ़ी में नया मेडिकल कॉलेज की घोषणा',
    excerpt: 'स्वास्थ्य और शिक्षा क्षेत्र में एक साथ निवेश की घोषणा ने स्थानीय लोगों में उम्मीद जगाई.',
    category: 'Education',
    section: 'education',
    author: 'Priya Sharma',
    authorRole: 'Reporter',
    publishDate: '31 May 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1587351021759-3e566b3f8f6a?w=1200&h=800&fit=crop',
    content: [
      'मेडिकल कॉलेज बनने से जिले में उच्च शिक्षा और स्वास्थ्य सुविधाओं दोनों में बड़ा बदलाव आने की उम्मीद है.',
      'छात्रों और अभिभावकों ने इस निर्णय का स्वागत करते हुए इसे लंबे समय से उठ रही मांग का जवाब बताया.',
      'अधिकारियों का कहना है कि परियोजना के लिए ज़मीन और डिजाइन पर प्राथमिक काम जल्द शुरू किया जाएगा.',
    ],
    tags: ['Education', 'Healthcare', 'Sitamarhi'],
    views: '71K',
  },
  {
    slug: 'flood-relief-package-sitamarhi',
    title: 'बाढ़ राहत: 50 हजार लोगों को मुआवजा',
    excerpt: 'बाढ़ प्रभावित परिवारों के लिए सहायता पैकेज और पुनर्वास प्रक्रिया की घोषणा.',
    category: 'Sitamarhi',
    section: 'sitamarhi',
    author: 'Amit Singh',
    authorRole: 'Crime & Ground Reporter',
    publishDate: '30 May 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=1200&h=800&fit=crop',
    content: [
      'प्रशासन ने कहा कि क्षतिग्रस्त घरों और फसलों की सूची तैयार की जा रही है.',
      'राहत सामग्री, स्वास्थ्य जांच और पीने के पानी की सप्लाई प्रभावित इलाकों में बढ़ाई गई है.',
      'स्थानीय स्वयंसेवी संगठनों ने राहत कार्यों में मदद के लिए टीमों को तैनात किया है.',
    ],
    tags: ['Sitamarhi', 'Flood', 'Relief'],
    featured: true,
    trending: true,
    breaking: true,
    views: '62.4K',
  },
  {
    slug: 'bihar-cricket-ranji-win',
    title: 'बिहार क्रिकेट टीम की रणजी ट्रॉफी जीत',
    excerpt: 'युवा खिलाड़ियों ने शानदार प्रदर्शन कर राज्य के खेल प्रेमियों को गर्व का पल दिया.',
    category: 'Sports',
    section: 'sports',
    author: 'Santosh Yadav',
    authorRole: 'Sports Reporter',
    publishDate: '30 May 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&h=800&fit=crop',
    content: [
      'टीम की जीत ने बिहार में क्रिकेट के लिए नए आत्मविश्वास का माहौल बनाया है.',
      'कोचिंग और स्थानीय अकादमियों से खिलाड़ियों की निरंतर तैयारी को इस सफलता का आधार माना गया.',
      'फाइनल मुकाबले में गेंदबाज़ी और फील्डिंग दोनों ने निर्णायक भूमिका निभाई.',
    ],
    tags: ['Sports', 'Cricket', 'Bihar'],
    views: '51.8K',
  },
  {
    slug: 'government-job-announcement-10000',
    title: '10,000 नई सरकारी नौकरियों की घोषणा',
    excerpt: 'युवाओं के लिए नई भर्ती प्रक्रिया और विभागवार पदों की जानकारी सामने आई.',
    category: 'Jobs',
    section: 'jobs',
    author: 'Meera Devi',
    authorRole: 'Career Reporter',
    publishDate: '31 May 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1200&h=800&fit=crop',
    content: [
      'विभिन्न विभागों में रिक्तियों को भरने के लिए चरणबद्ध भर्ती कैलेंडर जारी करने की तैयारी है.',
      'आवेदन प्रक्रिया, योग्यता और परीक्षा पैटर्न की आधिकारिक जानकारी जल्द प्रकाशित होगी.',
      'करियर काउंसलिंग डेस्क और नौकरी अलर्ट सेक्शन भी पोर्टल पर सक्रिय किए जा रहे हैं.',
    ],
    tags: ['Jobs', 'Recruitment', 'Career'],
    views: '47.3K',
  },
  {
    slug: 'patna-high-court-landmark-decision',
    title: 'पटना हाई कोर्ट का ऐतिहासिक फैसला',
    excerpt: 'अदालत के निर्णय ने प्रशासनिक और कानूनी हलकों में नई बहस छेड़ दी.',
    category: 'Politics',
    section: 'politics',
    author: 'Rahul Kumar',
    authorRole: 'Senior Reporter',
    publishDate: '29 May 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1200&h=800&fit=crop',
    content: [
      'फैसले के बाद सरकारी मशीनरी को क्रियान्वयन की दिशा में नए निर्देश जारी किए गए.',
      'कानूनी विशेषज्ञों ने कहा कि निर्णय का प्रभाव कई विभागों पर पड़ेगा.',
      'राजनीतिक दलों ने अलग-अलग प्रतिक्रियाएं देते हुए इसे व्यापक बहस का विषय बना दिया.',
    ],
    tags: ['Politics', 'Court', 'Law'],
    views: '43.2K',
  },
  {
    slug: 'student-national-award-sitamarhi',
    title: 'सीतामढ़ी के छात्र का राष्ट्रीय पुरस्कार',
    excerpt: 'एक स्थानीय छात्र ने अपने नवाचार से देशभर में पहचान बनाई.',
    category: 'Education',
    section: 'education',
    author: 'Priya Sharma',
    authorRole: 'Reporter',
    publishDate: '28 May 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&h=800&fit=crop',
    content: [
      'पुरस्कार मिलने के बाद स्कूल और परिवार में खुशी का माहौल है.',
      'शिक्षकों ने छात्र की रचनात्मकता और अनुशासन को इस सफलता का श्रेय दिया.',
      'जिले में अन्य विद्यार्थियों के लिए यह एक प्रेरणादायक उदाहरण माना जा रहा है.',
    ],
    tags: ['Education', 'Students', 'Award'],
    views: '31.6K',
  },
  {
    slug: 'crime-bust-in-border-area',
    title: 'सीमावर्ती इलाके में अपराध गिरोह का भंडाफोड़',
    excerpt: 'पुलिस की त्वरित कार्रवाई के बाद कई संदिग्धों को हिरासत में लिया गया.',
    category: 'Crime',
    section: 'crime',
    author: 'Amit Singh',
    authorRole: 'Crime Reporter',
    publishDate: '31 May 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&h=800&fit=crop',
    content: [
      'अभियान में हथियार, मोबाइल फोन और संचार सामग्री बरामद होने की जानकारी दी गई.',
      'पुलिस ने आगे की जांच के लिए कई टीमें गठित की हैं.',
      'स्थानीय लोगों ने सुरक्षा बढ़ाने और निगरानी मजबूत करने की मांग की है.',
    ],
    tags: ['Crime', 'Police', 'Investigation'],
    views: '29.8K',
  },
  {
    slug: 'entertainment-festival-lineup',
    title: 'लोक संस्कृति महोत्सव में बड़े कलाकारों की प्रस्तुति',
    excerpt: 'संगीत, नाटक और लोक कला का रंगारंग कार्यक्रम तैयार किया गया.',
    category: 'Entertainment',
    section: 'entertainment',
    author: 'Meera Devi',
    authorRole: 'Culture Reporter',
    publishDate: '30 May 2026',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&h=800&fit=crop',
    content: [
      'महोत्सव में स्थानीय कलाकारों को भी मंच देने की योजना बनाई गई है.',
      'आयोजकों का कहना है कि यह कार्यक्रम क्षेत्रीय पहचान को मज़बूत करेगा.',
      'परिवारों और युवाओं के लिए अलग-अलग सांस्कृतिक सत्र रखे गए हैं.',
    ],
    tags: ['Entertainment', 'Culture', 'Festival'],
    views: '22.1K',
  },
];

export const videos: VideoClip[] = [
  {
    slug: 'bihar-flood-ground-report',
    title: 'बिहार बाढ़ ग्राउंड रिपोर्ट',
    duration: '03:42',
    thumbnail: 'https://images.unsplash.com/photo-1547683905-f686c993aae5?w=600&h=400&fit=crop',
    category: 'Bihar',
  },
  {
    slug: 'nitish-visit-highlights',
    title: 'CM दौरे की प्रमुख झलकियां',
    duration: '04:15',
    thumbnail: 'https://images.unsplash.com/photo-1500435599590-4f8e3f9d9b5f?w=600&h=400&fit=crop',
    category: 'Politics',
  },
  {
    slug: 'medical-college-reaction',
    title: 'मेडिकल कॉलेज घोषणा पर प्रतिक्रियाएं',
    duration: '02:58',
    thumbnail: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=400&fit=crop',
    category: 'Education',
  },
  {
    slug: 'sports-celebration',
    title: 'रणजी जीत का जश्न',
    duration: '05:02',
    thumbnail: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=600&h=400&fit=crop',
    category: 'Sports',
  },
];

export const comments: CommentItem[] = [
  { name: 'Ramesh Kumar', time: '12 min ago', text: 'अच्छी रिपोर्टिंग, स्थानीय मुद्दों को सटीक तरीके से दिखाया गया है.' },
  { name: 'Anita Devi', time: '38 min ago', text: 'सरकार के फैसले का ज़मीनी असर भी आगे देखने को मिलेगा.' },
  { name: 'Vikash Yadav', time: '1 hour ago', text: 'ऐसे अपडेट्स रोज़ाना मिलते रहें तो भरोसा और बढ़ेगा.' },
];

export const relatedArticles = articles.filter(article => article.section !== 'bihar').slice(0, 4);

export const sidebarWidgets = [
  {
    title: 'Top Trending',
    items: articles.filter(article => article.trending).slice(0, 4),
  },
  {
    title: 'Editor Picks',
    items: articles.filter(article => article.featured).slice(0, 4),
  },
];

export const homeSections = [
  { slug: 'latest', title: 'Latest News' },
  { slug: 'bihar', title: 'Bihar News' },
  { slug: 'sitamarhi', title: 'Sitamarhi News' },
  { slug: 'politics', title: 'Politics' },
  { slug: 'crime', title: 'Crime' },
  { slug: 'education', title: 'Education' },
  { slug: 'jobs', title: 'Jobs' },
  { slug: 'sports', title: 'Sports' },
  { slug: 'entertainment', title: 'Entertainment' },
];

export const adminSections = [
  'overview',
  'news',
  'categories',
  'media',
  'breaking',
  'journalists',
  'users',
  'roles',
  'analytics',
  'seo',
  'ads',
  'subscriptions',
  'notifications',
  'security',
  'settings',
  'reports',
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findArticleBySlug(slug: string) {
  return articles.find(article => article.slug === slug) ?? articles[0];
}

export function getSectionArticles(section: string) {
  return articles.filter(article => article.section === section);
}

export function searchArticles(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return articles;
  return articles.filter(article =>
    [article.title, article.excerpt, article.category, article.author, ...article.tags]
      .join(' ')
      .toLowerCase()
      .includes(normalized),
  );
}
