export const APPS = [
  {
    id: 'shinomino',
    name: 'شنو منو تك تك',
    description: 'شبكة اجتماعية ومسنجر ومدرسة سومر',
    url: 'https://shinomino.com',
    platform: 'Cloudflare',
    repo: 'arjwan/shenoo-menoo-tak-tak',
    db: 'MongoDB / D1'
  },
  {
    id: 'mahasib-company',
    name: 'المحاسب برو',
    description: 'نظام محاسبة الشركات والفواتير',
    url: 'https://almahasib-company-cf-staging.arjwan307.workers.dev',
    platform: 'Cloudflare',
    repo: null,
    db: 'غير معروف'
  },
  {
    id: 'mahasib-cashier',
    name: 'المحاسب كاشير',
    description: 'كاشير المطاعم والمجمعات',
    url: 'https://cashier.alarjwan-softwear.com',
    platform: 'Cloudflare',
    repo: null,
    db: 'غير معروف'
  },
  {
    id: 'alarjwan-softwear',
    name: 'موقع الأرجوان سوفت وير',
    description: 'الموقع الرسمي للشركة',
    url: 'https://alarjwan-softwear.pages.dev',
    platform: 'Cloudflare',
    repo: null,
    db: 'لا يوجد'
  },
  {
    id: 'almoraqeb-website',
    name: 'المراقب برو — الموقع',
    description: 'الموقع الرسمي لتطبيق المراقب برو',
    url: 'https://almoraqebpro-website.pages.dev',
    platform: 'Cloudflare',
    repo: 'arjwan/AlMoraqebPro-Website',
    db: 'لا يوجد'
  },
  {
    id: 'mawlada',
    name: 'المولدة برو',
    description: 'إدارة المولدات الأهلية والاشتراكات',
    url: null,
    platform: 'GitHub',
    repo: 'arjwan307/AlMawladaPro',
    db: 'غير معروف'
  },
  {
    id: 'salonati',
    name: 'صالوناتي',
    description: 'حجز الصالونات',
    url: null,
    platform: 'GitHub',
    repo: 'arjwan307/salonati-new',
    db: 'غير معروف'
  },
  { id: 'shinomino-call', name: 'شنو منو اتصال', description: 'الاتصالات والمراسلة (ضمن المشروع الحالي)', url: null, platform: 'GitHub / Windows', repo: 'arjwan/shenoo-menoo-tak-tak', db: 'غير محدد' },
  { id: 'sumer-school', name: 'مدرسة سومر', description: 'التعليم الإلكتروني (ضمن شنو منو)', url: null, platform: 'GitHub / Windows', repo: 'arjwan/shenoo-menoo-tak-tak', db: 'غير محدد' },
  { id: 'jamiati', name: 'جامعتي', description: 'مجتمع ومواد طلابية', url: null, platform: 'GitHub / Windows', repo: 'mali77601-wq/uni_campus_hub', db: 'غير محدد' },
  { id: 'almoraqeb-server', name: 'المراقب برو', description: 'الخادم ونظام المراقبة', url: null, platform: 'GitHub / Windows', repo: 'arjwan/AlMoraqebPro-Server', db: 'غير محدد' },
  { id: 'mahasib-offline', name: 'المحاسب برو — سطح المكتب أوفلاين', description: 'نسخة Windows المحلية', url: null, platform: 'GitHub / Windows', repo: 'arjwan/AlMahasibPro-Desktop-Offline', db: 'غير محدد' },
  { id: 'scanner', name: 'الأرجوان سكنر الذكي', description: 'المسح الضوئي والباركود', url: null, platform: 'GitHub / Windows', repo: 'arjwan307/Arjwan-Smart-Accounting-Scanner', db: 'غير محدد' },
  { id: 'representatives', name: 'مندوبي العين', description: 'إدارة المندوبين', url: null, platform: 'GitHub / Windows', repo: 'arjwan/AlAyn-Representatives', db: 'غير محدد' },
  { id: 'remote-control', name: 'التحكم عن بعد', description: 'لوحة المفاتيح والفأرة والتحكم', url: null, platform: 'GitHub / Windows', repo: 'arjwan307/Arjwan-Remote-Keyboard-Mouse', db: 'غير محدد' },
  { id: 'starcom', name: 'ستاركوم ريموت', description: 'برنامج التحكم عن بعد', url: null, platform: 'GitHub / Windows', repo: 'arjwan307/Starcom-Remote', db: 'غير محدد' },
  { id: 'telegram-views', name: 'Telegram Views Pro', description: 'أداة تليغرام', url: null, platform: 'GitHub / Windows', repo: 'arjwan307/-Telegram-Views-Pro', db: 'غير محدد' },
  { id: 'control-center', name: 'مركز الأرجوان', description: 'إدارة المشاريع والتطبيقات', url: null, platform: 'GitHub / Windows', repo: 'arjwan/arjwan-control-center', db: 'غير محدد' }
];

export const SERVICES = [
  { id: 'api-shinomino', name: 'واجهة شنو منو', url: 'https://api.shinomino.com/api/developer/me', expect: [401, 403] },
  { id: 'pages-shenoo', name: 'استضافة شنو منو', url: 'https://shenoo-main-cloudflare.pages.dev/', expect: [200] },
  { id: 'cashier', name: 'استضافة الكاشير', url: 'https://cashier.alarjwan-softwear.com/', expect: [200] },
  { id: 'company', name: 'استضافة المحاسب برو', url: 'https://almahasib-company-cf-staging.arjwan307.workers.dev/', expect: [200] }
];

export const REPOS = [
  'arjwan/shenoo-menoo-tak-tak',
  'arjwan/AlMoraqebPro-Website',
  'arjwan307/salonati-new',
  'arjwan307/AlMawladaPro'
];
