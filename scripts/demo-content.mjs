const categories = [
  ['बिहार', 'राज्य की बड़ी खबरें, नीतियां और विकास अपडेट'],
  ['सीतामढ़ी', 'जिले की स्थानीय खबरें, घटनाएं और जनसरोकार'],
  ['राजनीति', 'राजनीतिक बयान, चुनाव और प्रशासनिक निर्णय'],
  ['क्राइम', 'पुलिस कार्रवाई, जांच और आपराधिक घटनाएं'],
  ['शिक्षा', 'स्कूल, कॉलेज, परीक्षा और छात्र अपडेट'],
  ['नौकरी', 'भर्ती, रिजल्ट और करियर अवसर'],
  ['खेल', 'मैच रिपोर्ट, खिलाड़ी प्रोफाइल और स्पोर्ट्स अपडेट'],
  ['मनोरंजन', 'फिल्म, वेब सीरीज़ और मनोरंजन की खबरें'],
  ['व्यापार', 'बाजार, कारोबार और आर्थिक गतिविधियां'],
  ['टेक्नोलॉजी', 'डिजिटल, गैजेट और तकनीकी रुझान'],
];

const reporters = [
  { full_name: 'अमन कुमार', slug: 'aman-kumar', role: 'राजनीति संवाददाता', bio: 'बिहार और विधानसभा की बड़ी राजनीतिक खबरें कवर करते हैं।' },
  { full_name: 'पूजा कुमारी', slug: 'pooja-kumari', role: 'स्थानीय रिपोर्टर', bio: 'सीतामढ़ी और आसपास की स्थानीय घटनाओं पर रिपोर्ट करती हैं।' },
  { full_name: 'राहुल झा', slug: 'rahul-jha', role: 'क्राइम रिपोर्टर', bio: 'अपराध, पुलिस और अदालत की खबरों पर फोकस करते हैं।' },
  { full_name: 'निधि सिंह', slug: 'nidhi-singh', role: 'शिक्षा संवाददाता', bio: 'परीक्षा, रिजल्ट और शैक्षिक नीतियों की खबरें लिखती हैं।' },
  { full_name: 'सौरभ मिश्रा', slug: 'saurabh-mishra', role: 'स्पोर्ट्स रिपोर्टर', bio: 'खेल और लोकल टूर्नामेंट की लाइव कवरेज करते हैं।' },
];

const imagePool = [
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1513530534585-c7b1394c6d51?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&w=1200&q=80',
];

const storyAngles = {
  'बिहार': ['विकास', 'योजना', 'सड़क', 'स्वास्थ्य', 'प्रशासन', 'बजट', 'अधिकारियों'],
  'सीतामढ़ी': ['अधिकारियों', 'यातायात', 'बारिश', 'स्कूल', 'बाजार', 'जनसुनवाई', 'राहत'],
  'राजनीति': ['कांग्रेस', 'भाजपा', 'राजद', 'सरकार', 'विपक्ष', 'चुनाव', 'नीति'],
  'क्राइम': ['छापेमारी', 'गिरफ्तारी', 'जांच', 'FIR', 'पुलिस', 'अपराध', 'कोर्ट'],
  'शिक्षा': ['परीक्षा', 'रिजल्ट', 'छात्रवृत्ति', 'स्कूल', 'कॉलेज', 'नामांकन', 'क्लास'],
  'नौकरी': ['भर्ती', 'वैकेंसी', 'रिजल्ट', 'साक्षात्कार', 'अधिसूचना', 'सरकारी नौकरी', 'आवेदन'],
  'खेल': ['क्रिकेट', 'फुटबॉल', 'कबड्डी', 'टूर्नामेंट', 'जीत', 'प्रदर्शन', 'फाइनल'],
  'मनोरंजन': ['फिल्म', 'सीरीज़', 'गाना', 'इवेंट', 'सेलिब्रिटी', 'शूटिंग', 'प्रमोशन'],
  'व्यापार': ['बाजार', 'निवेश', 'व्यापार', 'कंपनी', 'लॉन्च', 'कीमत', 'डील'],
  'टेक्नोलॉजी': ['AI', 'मोबाइल', 'ऐप', 'इंटरनेट', 'स्टार्टअप', 'गैजेट', 'डिजिटल'],
};

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]+/gu, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
}

function id(prefix, value) {
  return `${prefix}-${slugify(value)}`;
}

const demoCategories = categories.map(([name, description], index) => ({
  id: `demo-category-${index + 1}`,
  name,
  slug: slugify(name),
  description,
  sort_order: index + 1,
  is_featured: index < 4,
  seo_title: `${name} समाचार`,
  seo_description: description,
}));

const demoArticles = Array.from({ length: 50 }, (_, index) => {
  const category = demoCategories[index % demoCategories.length];
  const reporter = reporters[index % reporters.length];
  const angle = storyAngles[category.name][index % storyAngles[category.name].length];
  const isVideo = index % 5 === 0;
  const slug = `${slugify(category.name)}-${slugify(angle)}-${String(index + 1).padStart(2, '0')}`;
  return {
    id: `demo-article-${index + 1}`,
    category_id: category.id,
    category_name: category.name,
    category_slug: category.slug,
    author_id: `demo-user-${(index % reporters.length) + 1}`,
    author_name: reporter.full_name,
    author_role: reporter.role,
    title: index === 0
      ? 'बिहार में विकास की नई रफ्तार, मुख्यमंत्री ने कई परियोजनाओं का शुभारंभ किया'
      : `${category.name} : ${angle} से जुड़ी बड़ी खबर ${String(index + 1).padStart(2, '0')}`,
    slug,
    excerpt: `${category.name} से जुड़ी यह डेमो रिपोर्ट ${angle} पर केंद्रित है और बिक्री प्रस्तुति में एक सक्रिय न्यूज़ रूम का अनुभव देती है।`,
    content: [
      `${category.name} क्षेत्र से जुड़ी यह डेमो रिपोर्ट ${angle} को केंद्र में रखती है और पाठकों को ताज़ा अपडेट देती है।`,
      `स्थानीय प्रशासन, नागरिक प्रतिक्रिया और मौके की तस्वीरों के साथ यह खबर ${index + 1} नंबर की प्रस्तुति के लिए तैयार की गई है।`,
      'इस कहानी का उद्देश्य न्यूज़ पोर्टल के लेआउट, कार्ड, आर्टिकल पेज और शेयरिंग यूआई को वास्तविक कंटेंट जैसा दिखाना है।',
    ],
    featured_image: imagePool[index % imagePool.length],
    seo_title: `${category.name} समाचार | Newsroom`,
    seo_description: `${category.name} से जुड़ी ताज़ा खबरें और डेमो कंटेंट।`,
    status: index < 40 ? 'published' : 'draft',
    featured: index === 0 || index % 11 === 0,
    trending: index % 3 === 0,
    breaking: index % 4 === 0,
    publish_at: new Date(Date.now() - index * 1000 * 60 * 60 * 7).toISOString(),
    read_time: `${3 + (index % 4)} min read`,
    views_count: 2000 + index * 173,
    media_type: isVideo ? 'video' : 'article',
    video_url: isVideo ? `https://www.youtube.com/watch?v=aqz-KE-bpKQ&v=${index}` : null,
    tags: [category.name, angle, isVideo ? 'वीडियो' : 'समाचार'],
  };
});

const breakingNews = Array.from({ length: 20 }, (_, index) => {
  const article = demoArticles[index % demoArticles.length];
  return {
    id: `demo-breaking-${index + 1}`,
    headline: `${article.category_name} अपडेट ${index + 1}: ${article.title}`,
    link_url: `/article/${article.slug}`,
    sort_order: index + 1,
  };
});

const advertisements = [
  {
    id: 'demo-ad-1',
    placement: 'header',
    ad_type: 'adsense',
    advertiser_name: 'Google AdSense',
    title: 'Google Adsense Advertisement',
    target_url: 'https://ads.google.com',
    banner_url: null,
    position: '728x90',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-2',
    placement: 'sidebar',
    ad_type: 'adsense',
    advertiser_name: 'Google AdSense',
    title: 'Google Adsense Advertisement',
    target_url: 'https://ads.google.com',
    banner_url: null,
    position: '300x250',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-3',
    placement: 'hero',
    ad_type: 'direct',
    advertiser_name: 'Patna Hospital',
    title: '24x7 Emergency & ICU Care',
    target_url: 'https://example.com/patna-hospital',
    banner_url: imagePool[0],
    position: '728x90',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-4',
    placement: 'mid-content',
    ad_type: 'direct',
    advertiser_name: 'Sitamarhi Coaching Center',
    title: 'Admissions Open for 2026 Batch',
    target_url: 'https://example.com/coaching',
    banner_url: imagePool[1],
    position: '336x280',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-5',
    placement: 'category',
    ad_type: 'direct',
    advertiser_name: 'Local Growth Partner',
    title: 'Grow Your Local Brand Online',
    target_url: 'https://example.com/swiftgrowth',
    banner_url: imagePool[2],
    position: '300x250',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-6',
    placement: 'footer',
    ad_type: 'direct',
    advertiser_name: 'Local Real Estate Project',
    title: 'Premium Plots Near the City Center',
    target_url: 'https://example.com/real-estate',
    banner_url: imagePool[3],
    position: '728x90',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-7',
    placement: 'article-top',
    ad_type: 'direct',
    advertiser_name: 'Jewellery Store',
    title: 'Festive Collection Now Available',
    target_url: 'https://example.com/jewellery',
    banner_url: imagePool[4],
    position: '300x250',
    start_date: null,
    end_date: null,
  },
  {
    id: 'demo-ad-8',
    placement: 'search-result',
    ad_type: 'direct',
    advertiser_name: 'School Admission Campaign',
    title: 'Enroll for the New Academic Session',
    target_url: 'https://example.com/school',
    banner_url: imagePool[5],
    position: '300x250',
    start_date: null,
    end_date: null,
  },
];

const siteSettings = {
  id: 'demo-site-settings',
  site_name: 'Newsroom',
  logo_url: imagePool[6],
  contact_name: 'Editorial Office',
  contact_phone: '+91 98765 43210',
  contact_email: 'editorial@newsroom.local',
  social_links: {
    facebook: 'https://facebook.com/newsroom',
    twitter: 'https://x.com/newsroom',
    instagram: 'https://instagram.com/newsroom',
    youtube: 'https://youtube.com/@newsroom',
    whatsapp: 'https://wa.me/919876543210',
  },
  footer_text: 'Single-tenant newsroom CMS demo install.',
  theme_config: {
    logo: imagePool[6],
    favicon: imagePool[7],
    primary_color: '#dc2626',
    secondary_color: '#0f172a',
    tagline: 'Bihar Ki Khabar',
    site_url: 'https://newsroom.local',
  },
};

export { demoCategories as DEMO_CATEGORIES, demoArticles as DEMO_ARTICLES, breakingNews as DEMO_BREAKING_NEWS, advertisements as DEMO_ADVERTISEMENTS, siteSettings as DEMO_SITE_SETTINGS, reporters as DEMO_REPORTERS };
