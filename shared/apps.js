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
  }
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
