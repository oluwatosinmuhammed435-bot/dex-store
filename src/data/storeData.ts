export type CategorySlug = 'car-parts' | 'toy-cars' | 'other-products' | (string & {});

export type CategoryName = 'Car Parts' | 'Toy Cars' | 'Other Products' | (string & {});

export type AvailabilityStatus = 'In Stock' | 'Available on Order' | 'Out of Stock';

export interface CategoryItem {
  id: string;
  slug: CategorySlug;
  name: CategoryName;
  shortDescription: string;
  editorialSummary: string;
  image: string;
  highlights: string[];
  isActive?: boolean;
  isSample?: boolean;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  reference: string;
  name: string;
  category: CategoryName;
  categorySlug: CategorySlug;
  categoryId?: string | null;
  priceNgn: number;
  stockQuantity?: number;
  availability: AvailabilityStatus;
  featured: boolean;
  recentlyAdded: boolean;
  isActive?: boolean;
  isSample?: boolean;
  createdAtOrder: number;
  updatedAt?: string | null;
  shortDescription: string;
  description: string;
  image: string;
  gallery: {
    url: string;
    caption: string;
  }[];
  specifications: ProductSpecification[];
}

export interface PromotionalBannerConfig {
  id: string;
  eyebrow: string;
  headline: string;
  description: string;
  primaryCtaLabel: string;
  primaryCtaLink: string;
  secondaryCtaLabel: string;
  secondaryCtaCategory: CategorySlug;
}

export interface StoreConfig {
  brandName: string;
  tagline: string;
  /**
   * Configurable WhatsApp click-to-chat number placeholder (digits only, international format).
   * Ready to be populated via environment variable (VITE_WHATSAPP_NUMBER) or future Supabase store settings.
   * Deliberately kept as a neutral configurable placeholder rather than a fabricated real phone number.
   */
  whatsappNumber: string;
  whatsappDisplayPlaceholder: string;
  emailPlaceholder: string;
  addressPlaceholder: string;
  businessHoursPlaceholder: string;
  sampleInventoryNotice: string;
}

export const STORE_CONFIG: StoreConfig = {
  brandName: 'DEX STORES',
  tagline: 'Precision Automotive Parts, Scale Models & Essential Equipment',
  whatsappNumber: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WHATSAPP_NUMBER) || '2340000000000',
  whatsappDisplayPlaceholder: '+234 (000) 000-0000 (Configurable Business Line)',
  emailPlaceholder: 'enquiries@dexstores.example (Placeholder)',
  addressPlaceholder: 'Commercial Trade Corridor, Lagos, Nigeria (Address Placeholder)',
  businessHoursPlaceholder: 'Monday – Saturday, 8:30 AM – 6:00 PM WAT',
  sampleInventoryNotice:
    'Demonstration Catalogue Notice: The products and prices displayed below are sample items illustrating the DEX STORES storefront architecture prior to live inventory connection.',
};

export const HERO_SHOWCASE_IMAGE = '/src/assets/images/hero_automotive_showcase_1794933663321.jpg';

export const CATEGORIES: CategoryItem[] = [
  {
    id: 'cat-car-parts',
    slug: 'car-parts',
    name: 'Car Parts',
    shortDescription:
      'OEM-grade lighting assemblies, exterior mirrors, braking rotors, and replacement components engineered for dependable fitment.',
    editorialSummary:
      'Replacement exterior lighting, mirror assemblies, and braking hardware selected for durability and accurate vehicle compatibility.',
    image: '/src/assets/images/product_corolla_headlamp_1794933664922.jpg',
    highlights: ['Headlamp & Lighting Assemblies', 'Power Side Mirrors', 'Ventilated Brake Rotors & Pads'],
  },
  {
    id: 'cat-toy-cars',
    slug: 'toy-cars',
    name: 'Toy Cars',
    shortDescription:
      'Die-cast collector scale models and proportional 2.4GHz remote control vehicles built with detailed finishes.',
    editorialSummary:
      'Precision 1:18 die-cast display models alongside rugged all-terrain remote control vehicles for collectors and enthusiasts.',
    image: '/src/assets/images/product_miniature_sportscar_1794933668846.jpg',
    highlights: ['1:18 Scale Die-Cast Coupes', '2.4GHz 4WD Remote Control Buggies', 'Display-Ready Collector Models'],
  },
  {
    id: 'cat-other-products',
    slug: 'other-products',
    name: 'Other Products',
    shortDescription:
      'Portable digital tire inflators, emergency jump starters, 4K optical dashcams, and practical utility equipment.',
    editorialSummary:
      'Essential road-readiness electronics, digital air compressors, and cabin recording accessories for everyday reliability.',
    image: '/src/assets/images/product_tire_inflator_1794933671105.jpg',
    highlights: ['Digital Tire Inflators & Jump Starters', '4K Ultra-HD Dashcams', 'Vehicle Utility Accessories'],
  },
];

export const PROMOTIONAL_BANNER: PromotionalBannerConfig = {
  id: 'promo-fleet-and-collector-dispatch',
  eyebrow: 'Direct WhatsApp Order Desk',
  headline: 'Streamlined Sourcing for Replacement Parts & Scale Collectibles',
  description:
    'Select your item, specify the required quantity, and send a pre-formatted order sheet directly to the DEX STORES desk on WhatsApp for prompt availability confirmation.',
  primaryCtaLabel: 'Browse Full Catalogue',
  primaryCtaLink: '/shop',
  secondaryCtaLabel: 'Explore Car Parts',
  secondaryCtaCategory: 'car-parts',
};

export const PRODUCTS: Product[] = [
  {
    id: 'prod-corolla-headlamp',
    slug: 'toyota-corolla-headlamp',
    reference: 'DEX-CP-101',
    name: 'Toyota Corolla Headlamp',
    category: 'Car Parts',
    categorySlug: 'car-parts',
    priceNgn: 185000,
    availability: 'In Stock',
    featured: true,
    recentlyAdded: false,
    createdAtOrder: 5,
    shortDescription:
      'Crystal LED projector headlamp assembly with integrated daytime running light strip and sealed polycarbonate lens.',
    description:
      'Engineered to match factory mounting geometry for modern Toyota Corolla sedans, this complete projector headlamp assembly delivers a crisp low-beam cutoff and uniform high-beam illumination. Built with a UV-stabilized polycarbonate outer lens and matte black internal housing for long-term clarity.',
    image: '/src/assets/images/product_corolla_headlamp_1794933664922.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_corolla_headlamp_1794933664922.jpg',
        caption: 'Front three-quarter view showing projector optics and DRL light guide',
      },
      {
        url: '/src/assets/images/hero_automotive_showcase_1794933663321.jpg',
        caption: 'Studio comparison view alongside collector scale model on travertine plinth',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-CP-101 (Sample)' },
      { label: 'Optics Type', value: 'Bi-LED Projector + LED DRL Guide' },
      { label: 'Housing Material', value: 'ABS Composite / UV-Coated Polycarbonate Lens' },
      { label: 'Connector Interface', value: 'OEM-Style Plug-and-Play Harness' },
    ],
  },
  {
    id: 'prod-side-mirror',
    slug: 'car-side-mirror',
    reference: 'DEX-CP-104',
    name: 'Car Side Mirror',
    category: 'Car Parts',
    categorySlug: 'car-parts',
    priceNgn: 68500,
    availability: 'In Stock',
    featured: true,
    recentlyAdded: true,
    createdAtOrder: 7,
    shortDescription:
      'Power-adjustable exterior door mirror assembly with integrated sequential LED turn signal indicator.',
    description:
      'Complete replacement exterior side-view mirror featuring motorized glass adjustment, wide-angle convex optics, and an amber LED turn repeater integrated into the lower housing. Supplied with a reinforced gasket base and multi-pin wiring connector for clean installation.',
    image: '/src/assets/images/product_side_mirror_1794933667259.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_side_mirror_1794933667259.jpg',
        caption: 'Complete side mirror assembly showing mounting studs and LED repeater strip',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-CP-104 (Sample)' },
      { label: 'Adjustment', value: 'Electric 4-Way Mirror Glass + Manual/Power Fold' },
      { label: 'Finish', value: 'Gloss Black Cap with Smoked LED Indicator Strip' },
      { label: 'Mounting', value: '3-Stud Triangular Door Flange with Weather Seal' },
    ],
  },
  {
    id: 'prod-miniature-sportscar',
    slug: 'miniature-sports-car',
    reference: 'DEX-TC-201',
    name: 'Miniature Sports Car',
    category: 'Toy Cars',
    categorySlug: 'toy-cars',
    priceNgn: 42000,
    availability: 'In Stock',
    featured: true,
    recentlyAdded: false,
    createdAtOrder: 4,
    shortDescription:
      '1:18 scale die-cast collector grand tourer coupe in deep metallic forest green with steerable front wheels.',
    description:
      'Crafted from heavy-gauge zinc alloy with a multi-stage metallic forest green finish, this 1:18 scale miniature sports car features opening doors, a detailed cockpit interior, and multi-spoke silver alloy wheels with rubberized tread tires. Designed for desk display or collector shelving.',
    image: '/src/assets/images/product_miniature_sportscar_1794933668846.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_miniature_sportscar_1794933668846.jpg',
        caption: '1:18 scale metallic forest green coupe studio profile',
      },
      {
        url: '/src/assets/images/hero_automotive_showcase_1794933663321.jpg',
        caption: 'Editorial scale display on architectural stone surface',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-TC-201 (Sample)' },
      { label: 'Scale Ratio', value: '1:18 Collector Scale (~25 cm Length)' },
      { label: 'Body Construction', value: 'Die-Cast Metal Shell with ABS Interior Trim' },
      { label: 'Features', value: 'Steerable Front Axle, Opening Doors, Rubber Tires' },
    ],
  },
  {
    id: 'prod-rc-toy-car',
    slug: 'remote-control-toy-car',
    reference: 'DEX-TC-205',
    name: 'Remote Control Toy Car',
    category: 'Toy Cars',
    categorySlug: 'toy-cars',
    priceNgn: 75000,
    availability: 'In Stock',
    featured: true,
    recentlyAdded: true,
    createdAtOrder: 8,
    shortDescription:
      '1:14 scale 4WD off-road remote control buggy with coil-over suspension and 2.4GHz pistol-grip transmitter.',
    description:
      'Built for responsive all-terrain driving, this 1:14 scale 4WD remote control buggy combines high-grip lugged rubber tires, independent coil-spring suspension, and a low-latency 2.4GHz proportional pistol-grip controller. Includes rechargeable battery pack and USB balance charger.',
    image: '/src/assets/images/product_rc_offroad_car_1794933669169.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_rc_offroad_car_1794933669169.jpg',
        caption: '1:14 scale 4WD off-road buggy alongside 2.4GHz wireless transmitter',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-TC-205 (Sample)' },
      { label: 'Drivetrain', value: 'Full-Time 4WD with Independent Coil Suspension' },
      { label: 'Radio System', value: '2.4GHz Proportional Steering & Throttle (60m Range)' },
      { label: 'Power', value: '7.4V Li-Ion Rechargeable Pack (Included)' },
    ],
  },
  {
    id: 'prod-brake-disc-set',
    slug: 'ventilated-brake-rotor-ceramic-pad-set',
    reference: 'DEX-CP-109',
    name: 'Ventilated Front Brake Rotor & Ceramic Pad Set',
    category: 'Car Parts',
    categorySlug: 'car-parts',
    priceNgn: 112000,
    availability: 'In Stock',
    featured: false,
    recentlyAdded: true,
    createdAtOrder: 9,
    shortDescription:
      'Cross-drilled and slotted ventilated cast-iron front brake rotor paired with low-dust ceramic brake pads.',
    description:
      'Precision-balanced front brake rotor engineered with directional cooling vanes, cross-drilled heat dissipation ports, and gas-relief slots. Paired with chamfered ceramic friction pads formulated for quiet braking and minimal wheel dust.',
    image: '/src/assets/images/product_brake_disc_pads_1794933666756.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_brake_disc_pads_1794933666756.jpg',
        caption: 'Machined ventilated rotor with ceramic brake pad set and hardware clips',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-CP-109 (Sample)' },
      { label: 'Rotor Metallurgy', value: 'G3000 High-Carbon Cast Iron with Anti-Corrosion Hub' },
      { label: 'Pad Compound', value: 'Low-Dust Ceramic with Acoustic Shims' },
      { label: 'Axle Position', value: 'Front Axle Service Kit' },
    ],
  },
  {
    id: 'prod-tire-inflator',
    slug: 'portable-digital-tire-inflator-jump-starter',
    reference: 'DEX-OP-302',
    name: 'Portable Digital Tire Inflator & Jump Starter',
    category: 'Other Products',
    categorySlug: 'other-products',
    priceNgn: 54000,
    availability: 'In Stock',
    featured: false,
    recentlyAdded: true,
    createdAtOrder: 10,
    shortDescription:
      'Compact 150 PSI programmable air compressor with integrated 12V emergency battery jump-start terminals.',
    description:
      'An all-in-one roadside utility unit combining a digital auto-shutoff tire inflator with a 12V lithium emergency jump starter. Features a backlit LCD pressure readout (PSI/BAR), braided nylon air hose with brass chuck, and heavy-duty insulated battery clamps.',
    image: '/src/assets/images/product_tire_inflator_1794933671105.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_tire_inflator_1794933671105.jpg',
        caption: 'Digital tire inflator unit with braided hose and 12V jump-start clamps',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-OP-302 (Sample)' },
      { label: 'Max Inflation Pressure', value: '150 PSI with Auto-Stop Target Preset' },
      { label: 'Jump Start Output', value: '12V Vehicle Battery Assist + USB-A Power Out' },
      { label: 'Enclosure', value: 'Anodized Aluminum & Rubberized Side Grips' },
    ],
  },
  {
    id: 'prod-dashcam-4k',
    slug: '4k-ultra-hd-automotive-dashcam',
    reference: 'DEX-OP-306',
    name: '4K Ultra-HD Automotive Dashcam',
    category: 'Other Products',
    categorySlug: 'other-products',
    priceNgn: 62000,
    availability: 'Available on Order',
    featured: false,
    recentlyAdded: true,
    createdAtOrder: 6,
    shortDescription:
      'Wide-angle 148° 7-element glass lens dashboard camera with loop recording, G-sensor incident lock, and IPS screen.',
    description:
      'Discreet windshield-mounted 4K Ultra-HD dashcam engineered to capture clear license plate and road detail in both daylight and low-light driving conditions. Equipped with an f/1.8 multi-element glass lens, built-in G-sensor emergency file protection, and a rear IPS preview screen.',
    image: '/src/assets/images/product_dashcam_pro_1794933676535.jpg',
    gallery: [
      {
        url: '/src/assets/images/product_dashcam_pro_1794933676535.jpg',
        caption: 'Front lens assembly and rear IPS display view of the 4K dashcam',
      },
    ],
    specifications: [
      { label: 'Part Reference', value: 'DEX-OP-306 (Sample)' },
      { label: 'Video Resolution', value: '4K Ultra-HD (3840 × 2160 @ 30fps)' },
      { label: 'Optics', value: '7-Element Glass Lens, f/1.8 Aperture, 148° FOV' },
      { label: 'Storage Support', value: 'MicroSD up to 256GB with Seamless Loop Recording' },
    ],
  },
];
