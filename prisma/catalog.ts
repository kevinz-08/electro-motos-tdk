/**
 * prisma/catalog.ts — Poblar catálogo de productos
 *
 * Archivo independiente del seed principal.
 * Se puede ejecutar solo cuando necesitas cargar o actualizar el catálogo
 * sin tocar usuarios, pedidos ni configuración.
 *
 * Ejecutar:
 *   npm run db:catalog
 *
 * Todos los precios están en CENTAVOS COP.
 * Ejemplo: $29.000 COP → 2_900_000 centavos
 *
 * Para agregar nuevas categorías: agrega un objeto al array CATEGORIES.
 * Para agregar productos: agrega un objeto al array PRODUCTS y referencia el slug de la categoría.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

// ─── Categorías ───────────────────────────────────────────────────────────────
// Para agregar una categoría nueva, añade un objeto aquí.
// El campo `slug` es el identificador único y se usa en las URLs del catálogo.

const CATEGORIES = [
  {
    slug: 'sistema-electrico',
    name: 'Sistema Eléctrico',
    description: 'CDI, stators, reguladores, bobinas y componentes eléctricos para motos',
  },
  {
    slug: 'arneses',
    name: 'Arneses Eléctricos',
    description: 'Ramales y arneses eléctricos para las principales marcas y modelos',
  },
  {
    slug: 'baterias',
    name: 'Baterías',
    description: 'Baterías Magna y de otras marcas para todo tipo de moto',
  },
  {
    slug: 'iluminacion',
    name: 'Iluminación',
    description: 'Bombillos LED, stops integrados y accesorios de iluminación',
  },
  {
    slug: 'accesorios',
    name: 'Accesorios',
    description: 'Fenders, portaplacas retráctiles y accesorios para motos',
  },
  {
    slug: 'filtros',
    name: 'Filtros',
    description: 'Filtros de aire de alto flujo y mantenimiento',
  },
  {
    slug: 'frenos',
    name: 'Frenos',
    description: 'Pastillas, discos y kits de frenos para motos',
  },
  {
    slug: 'llantas',
    name: 'Llantas',
    description: 'Llantas y neumáticos para todo tipo de moto',
  },
  {
    slug: 'repuestos-motor',
    name: 'Repuestos Motor',
    description: 'Pistones, anillos, cigüeñales y repuestos internos de motor',
  },
  {
    slug: 'equipamiento',
    name: 'Equipamiento',
    description: 'Balaclavas, guantes y accesorios de protección para el motociclista',
  },
]

// ─── Productos ────────────────────────────────────────────────────────────────
// Para agregar un producto nuevo, añade un objeto aquí.
// `categorySlug` debe coincidir con un slug de CATEGORIES.
// `compatible` lista las motos compatibles (puede ser array vacío).

const PRODUCTS: Array<{
  sku: string
  name: string
  slug: string
  description: string
  price: number      // en centavos COP
  stock: number
  images: string[]
  isActive: boolean
  categorySlug: string
  compatible: Array<{ brand: string; model: string; year?: number }>
}> = [

  // ── Sistema Eléctrico: Stators ──────────────────────────────────────────────
  {
    sku: 'ELE-STA-KYM110-001',
    name: 'Stator KYMCO Unik 110',
    slug: 'stator-kymco-unik-110',
    description: 'Stator de encendido para KYMCO Unik 110. Bobinado original, alta durabilidad y rendimiento estable de carga.',
    price: 13_900_000, // $139.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'KYMCO', model: 'Unik 110' }],
  },
  {
    sku: 'ELE-STA-KTM200-002',
    name: 'Stator KTM Duke 200',
    slug: 'stator-ktm-duke-200',
    description: 'Stator completo para KTM Duke 200. Pieza de repuesto de alta calidad para el sistema de carga.',
    price: 16_200_000, // $162.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'KTM', model: 'Duke 200' }],
  },
  {
    sku: 'ELE-STA-DIS125-003',
    name: 'Stator completo Discover 125 ST',
    slug: 'stator-discover-125-st',
    description: 'Stator completo para Bajaj Discover 125 ST. Compatible con sistema de encendido original.',
    price: 10_200_000, // $102.000 COP
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Discover 125 ST' }],
  },
  {
    sku: 'ELE-STA-PUL180-004',
    name: 'Stator completo Pulsar 180 UG',
    slug: 'stator-pulsar-180-ug',
    description: 'Stator completo para Bajaj Pulsar 180 UG. Bobinado reforzado para mayor vida útil.',
    price: 10_200_000, // $102.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 180 UG' }],
  },
  {
    sku: 'ELE-STA-PUL135-005',
    name: 'Stator completo Pulsar 135 LS',
    slug: 'stator-pulsar-135-ls',
    description: 'Stator completo para Bajaj Pulsar 135 LS. Repuesto directo del sistema de carga.',
    price: 12_000_000, // $120.000 COP
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 135 LS' }],
  },
  {
    sku: 'ELE-STA-AUT125-006',
    name: 'Stator completo Auteco XCD 125',
    slug: 'stator-auteco-xcd-125',
    description: 'Stator completo para Auteco XCD 125. Alta eficiencia en la generación de carga.',
    price: 12_000_000, // $120.000 COP
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Auteco', model: 'XCD 125' }],
  },
  {
    sku: 'ELE-STA-AKT125-007',
    name: 'Stator AKT 125 NKD/TT',
    slug: 'stator-akt-125-nkd-tt',
    description: 'Stator para AKT 125 NKD y AKT TT 125. Compatible con ambas versiones.',
    price: 9_500_000, // $95.000 COP
    stock: 14,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'AKT', model: 'NKD 125' },
      { brand: 'AKT', model: 'TT 125' },
    ],
  },
  {
    sku: 'ELE-STA-ECO-008',
    name: 'Stator Eco de Luxe KS',
    slug: 'stator-eco-de-luxe-ks',
    description: 'Stator para Eco de Luxe KS. Repuesto del sistema de generación eléctrica.',
    price: 10_800_000, // $108.000 COP
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Eco', model: 'De Luxe KS' }],
  },

  // ── Sistema Eléctrico: CDI ──────────────────────────────────────────────────
  {
    sku: 'ELE-CDI-AKT110-001',
    name: 'CDI AKT 110 Original',
    slug: 'cdi-akt-110-original',
    description: 'CDI original para AKT 110. Controla el encendido electrónico de forma precisa. Instalación directa, sin modificaciones.',
    price: 6_500_000, // $65.000 COP
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'AKT', model: '110' }],
  },
  {
    sku: 'ELE-CDI-BWS125-002',
    name: 'CDI BWS 125 4T',
    slug: 'cdi-bws-125-4t',
    description: 'CDI para Yamaha BWS 125 4 tiempos. Compatible con sistema de encendido CDI AC.',
    price: 18_000_000, // $180.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'BWS 125 4T' }],
  },
  {
    sku: 'ELE-CDI-BEST125-003',
    name: 'CDI Best 125',
    slug: 'cdi-best-125',
    description: 'CDI para Best 125. Módulo de encendido electrónico de repuesto.',
    price: 9_690_000, // $96.900 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Best', model: '125' }],
  },
  {
    sku: 'ELE-CDI-PUL180-004',
    name: 'CDI Pulsar 180/200 ref: DJ111023',
    slug: 'cdi-pulsar-180-200-dj111023',
    description: 'CDI para Bajaj Pulsar 180 y 200. Referencia DJ111023. Compatible con modelos estándar.',
    price: 12_000_000, // $120.000 COP
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Bajaj', model: 'Pulsar 180' },
      { brand: 'Bajaj', model: 'Pulsar 200' },
    ],
  },
  {
    sku: 'ELE-CDI-DIS135-005',
    name: 'CDI Discover 135 Sport ref: DJ111017',
    slug: 'cdi-discover-135-sport-dj111017',
    description: 'CDI para Bajaj Discover 135 Sport. Referencia DJ111017.',
    price: 12_000_000, // $120.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Discover 135 Sport' }],
  },
  {
    sku: 'ELE-CDI-PUL220-006',
    name: 'CDI Pulsar 220GP/220S/220F',
    slug: 'cdi-pulsar-220',
    description: 'CDI para Bajaj Pulsar 220GP, 220S y 220F. Compatible con las tres versiones.',
    price: 16_990_000, // $169.900 COP
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Bajaj', model: 'Pulsar 220GP' },
      { brand: 'Bajaj', model: 'Pulsar 220S' },
      { brand: 'Bajaj', model: 'Pulsar 220F' },
    ],
  },
  {
    sku: 'ELE-CDI-PUL200NS-007',
    name: 'CDI Pulsar 200 NS',
    slug: 'cdi-pulsar-200-ns',
    description: 'CDI para Bajaj Pulsar 200 NS. Módulo de encendido electrónico directo.',
    price: 15_500_000, // $155.000 COP
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 200 NS' }],
  },
  {
    sku: 'ELE-CDI-PUL135-008',
    name: 'CDI Pulsar 135',
    slug: 'cdi-pulsar-135',
    description: 'CDI para Bajaj Pulsar 135. Repuesto directo del módulo de encendido.',
    price: 16_000_000, // $160.000 COP
    stock: 11,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 135' }],
  },
  {
    sku: 'ELE-CDI-GN125-009',
    name: 'CDI GN/GS 125',
    slug: 'cdi-gn-gs-125',
    description: 'CDI para Suzuki GN 125 y GS 125. Compatible con ambos modelos.',
    price: 10_200_000, // $102.000 COP
    stock: 18,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Suzuki', model: 'GN 125' },
      { brand: 'Suzuki', model: 'GS 125' },
    ],
  },
  {
    sku: 'ELE-CDI-LIB110-010',
    name: 'CDI Libero 110',
    slug: 'cdi-libero-110',
    description: 'CDI para Yamaha Libero 110. Repuesto del módulo de encendido electrónico.',
    price: 9_690_000, // $96.900 COP
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'Libero 110' }],
  },
  {
    sku: 'ELE-CDI-CRY110-011',
    name: 'CDI Yamaha Crypton 110',
    slug: 'cdi-yamaha-crypton-110',
    description: 'CDI para Yamaha Crypton 110. Módulo de encendido de repuesto.',
    price: 7_990_000, // $79.900 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'Crypton 110' }],
  },
  {
    sku: 'ELE-CDI-XLR125-012',
    name: 'CDI Honda XLR 125',
    slug: 'cdi-honda-xlr-125',
    description: 'CDI para Honda XLR 125. Módulo de encendido electrónico de repuesto.',
    price: 5_970_000, // $59.700 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Honda', model: 'XLR 125' }],
  },
  {
    sku: 'ELE-CDI-CRI115-013',
    name: 'CDI Yamaha Cripton 115',
    slug: 'cdi-yamaha-cripton-115',
    description: 'CDI para Yamaha Cripton 115. Compatible con el sistema de encendido original.',
    price: 9_690_000, // $96.900 COP
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'Cripton 115' }],
  },

  // ── Sistema Eléctrico: Bobinas ──────────────────────────────────────────────
  {
    sku: 'ELE-BOB-PUL180-001',
    name: 'Bobina de alta Pulsar 180/200',
    slug: 'bobina-alta-pulsar-180-200',
    description: 'Bobina de alta tensión para Bajaj Pulsar 180 y 200. Garantiza una chispa potente para un encendido eficiente.',
    price: 2_900_000, // $29.000 COP
    stock: 30,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Bajaj', model: 'Pulsar 180' },
      { brand: 'Bajaj', model: 'Pulsar 200' },
    ],
  },
  {
    sku: 'ELE-BOB-CDI-002',
    name: 'Bobina de alta CDI incorporado',
    slug: 'bobina-alta-cdi-incorporado',
    description: 'Bobina de alta tensión con CDI incorporado. Universal para varias referencias de motos.',
    price: 2_500_000, // $25.000 COP
    stock: 25,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [],
  },
  {
    sku: 'ELE-BOB-GN125-003',
    name: 'Bobina de alta GN125/GS125',
    slug: 'bobina-alta-gn125-gs125',
    description: 'Bobina de alta para Suzuki GN 125 y GS 125. Compatible con encendido CDI y convencional.',
    price: 4_680_000, // $46.800 COP
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Suzuki', model: 'GN 125' },
      { brand: 'Suzuki', model: 'GS 125' },
    ],
  },
  {
    sku: 'ELE-BOB-RX115-004',
    name: 'Bobina de alta RX 115/DT',
    slug: 'bobina-alta-rx-115-dt',
    description: 'Bobina de alta para Yamaha RX 115 y DT. Repuesto directo para el sistema de encendido.',
    price: 3_500_000, // $35.000 COP
    stock: 18,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Yamaha', model: 'RX 115' },
      { brand: 'Yamaha', model: 'DT' },
    ],
  },
  {
    sku: 'ELE-BOB-XT225-005',
    name: 'Bobina de señal Yamaha XT 225',
    slug: 'bobina-senal-yamaha-xt-225',
    description: 'Bobina de señal (pickup) para Yamaha XT 225. Genera la señal de encendido para el CDI.',
    price: 6_350_000, // $63.500 COP
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'XT 225' }],
  },
  {
    sku: 'ELE-BOB-DT125-006',
    name: 'Bobina de luz y carga Yamaha DT 125',
    slug: 'bobina-luz-carga-yamaha-dt-125',
    description: 'Bobina de luz y carga para Yamaha DT 125. Genera corriente para iluminación y carga de batería.',
    price: 3_500_000, // $35.000 COP
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'DT 125' }],
  },
  {
    sku: 'ELE-BOB-RX115B-007',
    name: 'Bobina de luz y carga Yamaha RX 115',
    slug: 'bobina-luz-carga-yamaha-rx-115',
    description: 'Bobina de luz y carga para Yamaha RX 115. Compatible con sistema de encendido convencional.',
    price: 3_500_000, // $35.000 COP
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'RX 115' }],
  },

  // ── Sistema Eléctrico: Reguladores ─────────────────────────────────────────
  {
    sku: 'ELE-REG-HON125-001',
    name: 'Regulador Honda Storm 125',
    slug: 'regulador-honda-storm-125',
    description: 'Regulador rectificador para Honda Storm 125. Controla el voltaje del sistema eléctrico y protege la batería.',
    price: 8_100_000, // $81.000 COP
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Honda', model: 'Storm 125' }],
  },
  {
    sku: 'ELE-REG-FZ160-002',
    name: 'Regulador Yamaha FZ-160',
    slug: 'regulador-yamaha-fz-160',
    description: 'Regulador rectificador para Yamaha FZ-160. Estabiliza el voltaje para proteger el sistema eléctrico.',
    price: 9_000_000, // $90.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'FZ-160' }],
  },
  {
    sku: 'ELE-REG-LIB125-003',
    name: 'Regulador Libero 125',
    slug: 'regulador-libero-125',
    description: 'Regulador rectificador para Yamaha Libero 125. Repuesto directo para el sistema de carga.',
    price: 9_000_000, // $90.000 COP
    stock: 11,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Yamaha', model: 'Libero 125' }],
  },
  {
    sku: 'ELE-REG-PUL180-004',
    name: 'Regulador Pulsar 180/200',
    slug: 'regulador-pulsar-180-200',
    description: 'Regulador rectificador para Bajaj Pulsar 180 y 200. Evita sobrecargas en el sistema eléctrico.',
    price: 8_500_000, // $85.000 COP
    stock: 14,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [
      { brand: 'Bajaj', model: 'Pulsar 180' },
      { brand: 'Bajaj', model: 'Pulsar 200' },
    ],
  },

  // ── Sistema Eléctrico: Flashers ─────────────────────────────────────────────
  {
    sku: 'ELE-FLA-BAJ-001',
    name: 'Flasher para moto Bajaj',
    slug: 'flasher-moto-bajaj',
    description: 'Flasher (intermitente electrónico) compatible con motos Bajaj. Reemplaza la unidad de control de direccionales.',
    price: 2_500_000, // $25.000 COP
    stock: 35,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Bajaj', model: 'Universal' }],
  },
  {
    sku: 'ELE-FLA-CB190-002',
    name: 'Flasher Honda CB 190 R',
    slug: 'flasher-honda-cb-190-r',
    description: 'Flasher para Honda CB 190 R. Control electrónico de las luces direccionales.',
    price: 3_000_000, // $30.000 COP
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [{ brand: 'Honda', model: 'CB 190 R' }],
  },

  // ── Arneses Eléctricos ──────────────────────────────────────────────────────
  {
    sku: 'ARN-GS125-2011-001',
    name: 'Ramal eléctrico GS 125 modelo 2011',
    slug: 'ramal-electrico-gs-125-2011',
    description: 'Arnés eléctrico completo para Suzuki GS 125 modelo 2011. Incluye todos los conectores originales.',
    price: 18_000_000, // $180.000 COP
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Suzuki', model: 'GS 125', year: 2011 }],
  },
  {
    sku: 'ARN-GN125-2013-002',
    name: 'Ramal eléctrico GN 125 modelo 2013',
    slug: 'ramal-electrico-gn-125-2013',
    description: 'Arnés eléctrico completo para Suzuki GN 125 modelo 2013.',
    price: 17_900_000, // $179.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Suzuki', model: 'GN 125', year: 2013 }],
  },
  {
    sku: 'ARN-GS125-2014-003',
    name: 'Ramal eléctrico GS 125 MN 2014-2017',
    slug: 'ramal-electrico-gs-125-mn-2014-2017',
    description: 'Arnés eléctrico para Suzuki GS 125 MN, modelos 2014 a 2017.',
    price: 18_500_000, // $185.000 COP
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Suzuki', model: 'GS 125 MN', year: 2014 },
      { brand: 'Suzuki', model: 'GS 125 MN', year: 2015 },
      { brand: 'Suzuki', model: 'GS 125 MN', year: 2016 },
      { brand: 'Suzuki', model: 'GS 125 MN', year: 2017 },
    ],
  },
  {
    sku: 'ARN-PUL180-2012-004',
    name: 'Ramal eléctrico Pulsar 180 GT 2012',
    slug: 'ramal-electrico-pulsar-180-gt-2012',
    description: 'Arnés eléctrico para Bajaj Pulsar 180 GT modelo 2012.',
    price: 17_000_000, // $170.000 COP
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 180 GT', year: 2012 }],
  },
  {
    sku: 'ARN-GN125N-2017-005',
    name: 'Ramal eléctrico GN 125 Nova modelo 2017',
    slug: 'ramal-electrico-gn-125-nova-2017',
    description: 'Arnés eléctrico para Suzuki GN 125 Nova modelo 2017.',
    price: 16_000_000, // $160.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Suzuki', model: 'GN 125 Nova', year: 2017 }],
  },
  {
    sku: 'ARN-GN125-2011-006',
    name: 'Ramal eléctrico GN 125 modelo 2011',
    slug: 'ramal-electrico-gn-125-2011',
    description: 'Arnés eléctrico para Suzuki GN 125 modelo 2011.',
    price: 9_500_000, // $95.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Suzuki', model: 'GN 125', year: 2011 }],
  },
  {
    sku: 'ARN-GN125I-007',
    name: 'Ramal eléctrico GN 125 Intruder',
    slug: 'ramal-electrico-gn-125-intruder',
    description: 'Arnés eléctrico para Suzuki GN 125 Intruder.',
    price: 9_500_000, // $95.000 COP
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Suzuki', model: 'GN 125 Intruder' }],
  },
  {
    sku: 'ARN-XTZ125-2014-008',
    name: 'Ramal eléctrico XTZ 125 2014-2018',
    slug: 'ramal-electrico-xtz-125-2014-2018',
    description: 'Arnés eléctrico para Yamaha XTZ 125, modelos 2014 a 2018.',
    price: 17_900_000, // $179.000 COP
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Yamaha', model: 'XTZ 125', year: 2014 },
      { brand: 'Yamaha', model: 'XTZ 125', year: 2015 },
      { brand: 'Yamaha', model: 'XTZ 125', year: 2016 },
      { brand: 'Yamaha', model: 'XTZ 125', year: 2017 },
      { brand: 'Yamaha', model: 'XTZ 125', year: 2018 },
    ],
  },
  {
    sku: 'ARN-XTZ125-2007-009',
    name: 'Ramal eléctrico XTZ 125 Starter 2007',
    slug: 'ramal-electrico-xtz-125-starter-2007',
    description: 'Arnés eléctrico para Yamaha XTZ 125 con arranque eléctrico (starter), modelo 2007.',
    price: 15_500_000, // $155.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Yamaha', model: 'XTZ 125', year: 2007 }],
  },
  {
    sku: 'ARN-LIB125-2014-010',
    name: 'Ramal eléctrico Libero 125 2014-2018',
    slug: 'ramal-electrico-libero-125-2014-2018',
    description: 'Arnés eléctrico para Yamaha Libero 125, modelos 2014 a 2018.',
    price: 14_000_000, // $140.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Yamaha', model: 'Libero 125', year: 2014 },
      { brand: 'Yamaha', model: 'Libero 125', year: 2018 },
    ],
  },
  {
    sku: 'ARN-GS125V-2008-011',
    name: 'Ramal eléctrico GS 125 MV 2008-2014',
    slug: 'ramal-electrico-gs-125-mv-2008-2014',
    description: 'Arnés eléctrico para Suzuki GS 125 MV, modelos 2008 a 2014.',
    price: 18_000_000, // $180.000 COP
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Suzuki', model: 'GS 125 MV', year: 2008 },
      { brand: 'Suzuki', model: 'GS 125 MV', year: 2014 },
    ],
  },
  {
    sku: 'ARN-DT125-1996-012',
    name: 'Ramal eléctrico DT 125-175 Special 1996-98',
    slug: 'ramal-electrico-dt-125-175-special-1996-98',
    description: 'Arnés eléctrico para Yamaha DT 125/175 Special, modelos 1996 a 1998.',
    price: 12_000_000, // $120.000 COP
    stock: 4,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Yamaha', model: 'DT 125 Special', year: 1996 },
      { brand: 'Yamaha', model: 'DT 175 Special', year: 1998 },
    ],
  },
  {
    sku: 'ARN-FZ16-2012-013',
    name: 'Ramal eléctrico FZ-16 2012-2014',
    slug: 'ramal-electrico-fz-16-2012-2014',
    description: 'Arnés eléctrico para Yamaha FZ-16, modelos 2012 a 2014. El más completo del mercado.',
    price: 23_000_000, // $230.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Yamaha', model: 'FZ-16', year: 2012 },
      { brand: 'Yamaha', model: 'FZ-16', year: 2013 },
      { brand: 'Yamaha', model: 'FZ-16', year: 2014 },
    ],
  },
  {
    sku: 'ARN-DT125-2000-014',
    name: 'Ramal eléctrico DT 125 2000-2008',
    slug: 'ramal-electrico-dt-125-2000-2008',
    description: 'Arnés eléctrico para Yamaha DT 125, modelos 2000 a 2008.',
    price: 14_500_000, // $145.000 COP
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Yamaha', model: 'DT 125', year: 2000 },
      { brand: 'Yamaha', model: 'DT 125', year: 2008 },
    ],
  },
  {
    sku: 'ARN-DT125-1994-015',
    name: 'Ramal eléctrico DT 125/175 1994-95',
    slug: 'ramal-electrico-dt-125-175-1994-95',
    description: 'Arnés eléctrico para Yamaha DT 125 y DT 175, modelos 1994 y 1995.',
    price: 13_500_000, // $135.000 COP
    stock: 4,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [
      { brand: 'Yamaha', model: 'DT 125', year: 1994 },
      { brand: 'Yamaha', model: 'DT 175', year: 1995 },
    ],
  },
  {
    sku: 'ARN-RX115-016',
    name: 'Ramal eléctrico RX 115',
    slug: 'ramal-electrico-rx-115',
    description: 'Arnés eléctrico para Yamaha RX 115. Compatible con modelos recientes.',
    price: 9_500_000, // $95.000 COP
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Yamaha', model: 'RX 115' }],
  },
  {
    sku: 'ARN-YBR125-017',
    name: 'Ramal eléctrico YBR 125 SS',
    slug: 'ramal-electrico-ybr-125-ss',
    description: 'Arnés eléctrico para Yamaha YBR 125 SS. Incluye todos los conectores del sistema eléctrico.',
    price: 17_000_000, // $170.000 COP
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'arneses',
    compatible: [{ brand: 'Yamaha', model: 'YBR 125 SS' }],
  },

  // ── Baterías ────────────────────────────────────────────────────────────────
  {
    sku: 'BAT-MAG-YB7BB-001',
    name: 'Batería Magna MF-YB7BB',
    slug: 'bateria-magna-mf-yb7bb',
    description: 'Batería Magna libre de mantenimiento MF-YB7BB. 12V 7Ah. Compatible con motos de mediana cilindrada. Lista para instalar.',
    price: 8_970_000, // $89.700 COP
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'baterias',
    compatible: [],
  },
  {
    sku: 'BAT-MAG-YB6LB-002',
    name: 'Batería Magna MF-YB6.5LB',
    slug: 'bateria-magna-mf-yb6-5lb',
    description: 'Batería Magna libre de mantenimiento MF-YB6.5LB. 12V 6.5Ah. Ideal para motos pequeñas y medianas.',
    price: 8_010_000, // $80.100 COP
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'baterias',
    compatible: [],
  },
  {
    sku: 'BAT-MAG-12N7B-003',
    name: 'Batería Magna MF-12N7B-3A',
    slug: 'bateria-magna-mf-12n7b-3a',
    description: 'Batería Magna MF-12N7B-3A. 12V 7Ah. Alta capacidad de arranque en frío. Libre de mantenimiento.',
    price: 10_210_000, // $102.100 COP
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'baterias',
    compatible: [],
  },
  {
    sku: 'BAT-MAG-YB3LA-004',
    name: 'Batería Magna MF-YB3LA',
    slug: 'bateria-magna-mf-yb3la',
    description: 'Batería Magna MF-YB3LA. 12V 3Ah. Para motos pequeñas de 110cc. Compacta y liviana.',
    price: 6_100_000, // $61.000 COP
    stock: 25,
    images: [],
    isActive: true,
    categorySlug: 'baterias',
    compatible: [],
  },

  // ── Iluminación ─────────────────────────────────────────────────────────────
  {
    sku: 'ILU-STOP-PUL200-001',
    name: 'Stop integrado Pulsar 200 NS',
    slug: 'stop-integrado-pulsar-200-ns',
    description: 'Stop integrado con direccionales para Bajaj Pulsar 200 NS. Diseño slim, LED de alta visibilidad.',
    price: 11_000_000, // $110.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'iluminacion',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 200 NS' }],
  },
  {
    sku: 'ILU-LED-H4-001',
    name: 'Bombillo H4 LED 12000 lúmenes M4 Plus',
    slug: 'bombillo-h4-led-12000-lumenes-m4-plus',
    description: 'Bombillo H4 LED de 12000 lúmenes M4 Plus. Luz blanca de alta intensidad. Compatible con la mayoría de motos con faro H4. Temperatura de color 6000K.',
    price: 6_500_000, // $65.000 COP
    stock: 30,
    images: [],
    isActive: true,
    categorySlug: 'iluminacion',
    compatible: [],
  },

  // ── Accesorios ──────────────────────────────────────────────────────────────
  {
    sku: 'ACC-FEND-KTM-001',
    name: 'Fender portaplaca retráctil KTM',
    slug: 'fender-portaplaca-retractil-ktm',
    description: 'Fender o portaplaca retráctil para KTM. Elimina el guardafango trasero de fábrica dándole un look más deportivo. Instalación sin modificaciones.',
    price: 11_000_000, // $110.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [{ brand: 'KTM', model: 'Universal' }],
  },
  {
    sku: 'ACC-FEND-PUL-002',
    name: 'Fender portaplaca retráctil Pulsar',
    slug: 'fender-portaplaca-retractil-pulsar',
    description: 'Fender o portaplaca retráctil para Bajaj Pulsar. Diseño deportivo, fácil instalación. Compatible con varias versiones de Pulsar.',
    price: 11_000_000, // $110.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar Universal' }],
  },

  // ── Filtros ─────────────────────────────────────────────────────────────────
  {
    sku: '9-APACHE',
    name: 'Filtro Aire Alto Flujo Apache 160/180/200',
    slug: 'filtro-aire-alto-flujo-apache-160-180-200',
    description: 'Filtro de aire de alto flujo compatible con Apache 160, 180 y 200. Lavable y reutilizable, mejora la entrada de aire al motor.',
    price: 7_500_000, // $75.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [
      { brand: 'TVS', model: 'Apache 160' },
      { brand: 'TVS', model: 'Apache 180' },
      { brand: 'TVS', model: 'Apache 200' },
    ],
  },
  {
    sku: '9-BA37',
    name: 'Filtro Aire Alto Flujo KYN Dominar 400',
    slug: 'filtro-aire-alto-flujo-kyn-dominar-400',
    description: 'Filtro de aire de alto flujo KYN para Bajaj Dominar 400. Aumenta la entrada de aire al motor para mejor rendimiento.',
    price: 11_500_000, // $115.000 COP
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [{ brand: 'Bajaj', model: 'Dominar 400' }],
  },
  {
    sku: '9-CB190',
    name: 'Filtro Aire Alto Flujo CB 190 / CB 160',
    slug: 'filtro-aire-alto-flujo-cb190-cb160',
    description: 'Filtro de aire de alto flujo para Honda CB 190 y CB 160. Lavable y reutilizable.',
    price: 7_500_000, // $75.000 COP
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [
      { brand: 'Honda', model: 'CB 190' },
      { brand: 'Honda', model: 'CB 160' },
    ],
  },
  {
    sku: '9-DR150',
    name: 'Filtro Aire Alto Flujo DR 150',
    slug: 'filtro-aire-alto-flujo-dr150',
    description: 'Filtro de aire de alto flujo para Suzuki DR 150. Mejora el rendimiento del motor con mayor entrada de aire.',
    price: 7_500_000, // $75.000 COP
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [{ brand: 'Suzuki', model: 'DR 150' }],
  },
  {
    sku: '9-GIX150',
    name: 'Filtro Aire Alto Flujo Gixxer 150',
    slug: 'filtro-aire-alto-flujo-gixxer-150',
    description: 'Filtro de aire de alto flujo para Suzuki Gixxer 150. Lavable y reutilizable, optimiza la mezcla aire-combustible.',
    price: 7_500_000, // $75.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [{ brand: 'Suzuki', model: 'Gixxer 150' }],
  },
  {
    sku: '9-K390',
    name: 'Filtro de Aire Alto Flujo KTM 390 3G',
    slug: 'filtro-aire-alto-flujo-ktm-390-3g',
    description: 'Filtro de aire de alto flujo para KTM 390 3G. Alto rendimiento y larga vida útil.',
    price: 8_500_000, // $85.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [{ brand: 'KTM', model: '390 3G' }],
  },
  {
    sku: '9-KT250',
    name: 'Filtro Aire Alto Flujo KTM 200/250 NG/WO',
    slug: 'filtro-aire-alto-flujo-ktm-200-250-ng-wo',
    description: 'Filtro de aire de alto flujo para KTM 200 y 250 versiones NG y WO. Lavable y reutilizable.',
    price: 8_500_000, // $85.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [
      { brand: 'KTM', model: '200 NG' },
      { brand: 'KTM', model: '200 WO' },
      { brand: 'KTM', model: '250 NG' },
      { brand: 'KTM', model: '250 WO' },
    ],
  },

  // ── Filtros Yamaha ───────────────────────────────────────────────────────────
  {
    sku: '9-YA19',
    name: 'Filtro de Aire Alto Flujo KYN Yamaha MT15',
    slug: 'filtro-aire-alto-flujo-kyn-yamaha-mt15',
    description: 'Filtro de aire de alto flujo KYN para Yamaha MT15. Lavable y reutilizable, mejora la entrada de aire al motor.',
    price: 9_500_000, // $95.000 COP
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [{ brand: 'Yamaha', model: 'MT15' }],
  },
  {
    sku: '9-YA150',
    name: 'Filtro de Aire Alto Flujo XTZ 150',
    slug: 'filtro-aire-alto-flujo-xtz-150',
    description: 'Filtro de aire de alto flujo para Yamaha XTZ 150. Lavable y reutilizable, optimiza la mezcla aire-combustible.',
    price: 7_500_000, // $75.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'filtros',
    compatible: [{ brand: 'Yamaha', model: 'XTZ 150' }],
  },

  // ── Iluminación ─────────────────────────────────────────────────────────────
  {
    sku: '9-2586',
    name: 'Direccionales LED Naranja Doble Pantalla (Par)',
    slug: 'direccionales-led-naranja-doble-pantalla-par',
    description: 'Par de direccionales LED color naranja con doble pantalla. Alta visibilidad y bajo consumo energético.',
    price: 1_500_000, // $15.000 COP
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'iluminacion',
    compatible: [],
  },

  // ── Sistema Eléctrico ────────────────────────────────────────────────────────
  {
    sku: '9-M2060',
    name: 'Módulo de Estacionarias',
    slug: 'modulo-de-estacionarias',
    description: 'Módulo electrónico para luces estacionarias. Compatible con múltiples modelos de moto.',
    price: 6_000_000, // $60.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'sistema-electrico',
    compatible: [],
  },

  // ── Accesorios ───────────────────────────────────────────────────────────────
  {
    sku: '9-2821',
    name: 'Caballete para Moto Rojo',
    slug: 'caballete-para-moto-rojo',
    description: 'Caballete trasero para moto color rojo. Resistente y de fácil instalación.',
    price: 11_500_000, // $115.000 COP
    stock: 0,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [],
  },
  {
    sku: '9-3500',
    name: 'Fender para Gixxer 150',
    slug: 'fender-para-gixxer-150',
    description: 'Fender trasero para Suzuki Gixxer 150. Protege de salpicaduras y mejora la estética de la moto.',
    price: 11_000_000, // $110.000 COP
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [{ brand: 'Suzuki', model: 'Gixxer 150' }],
  },
  {
    sku: '9-LK303',
    name: 'Candado con Alarma Macizo',
    slug: 'candado-con-alarma-macizo',
    description: 'Candado macizo con alarma incorporada para moto. Alta seguridad contra robos, activa alarma sonora al detectar movimiento.',
    price: 8_500_000, // $85.000 COP
    stock: 0,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [],
  },

  // ── Equipamiento ─────────────────────────────────────────────────────────────
  {
    sku: '9-05601',
    name: 'Balaclava Negro',
    slug: 'balaclava-negro',
    description: 'Balaclava de color negro para motociclismo. Protege el rostro y cuello del viento y el frío.',
    price: 2_500_000, // $25.000 COP
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'equipamiento',
    compatible: [],
  },
  {
    sku: '9-05602',
    name: 'Balaclava Negro Cubre Cabello',
    slug: 'balaclava-negro-cubre-cabello',
    description: 'Balaclava negra con diseño cubre cabello. Ideal para usar bajo el casco, mantiene el cabello recogido y protege del viento.',
    price: 2_000_000, // $20.000 COP
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'equipamiento',
    compatible: [],
  },

  // ── Frenos ──────────────────────────────────────────────────────────────────
  {
    sku: 'FRE-BRE-FZ25-001',
    name: 'Pastillas de freno Brembo Yamaha FZ25',
    slug: 'pastillas-freno-brembo-yamaha-fz25',
    description: 'Pastillas de freno originales Brembo para Yamaha FZ25. Alta resistencia al calor y larga durabilidad. Desgaste progresivo para mayor seguridad.',
    price: 8_500_000, // $85.000 COP
    stock: 25,
    images: [],
    isActive: true,
    categorySlug: 'frenos',
    compatible: [
      { brand: 'Yamaha', model: 'FZ25', year: 2020 },
      { brand: 'Yamaha', model: 'FZ25', year: 2021 },
      { brand: 'Yamaha', model: 'FZ25', year: 2022 },
    ],
  },
  {
    sku: 'FRE-DIS-CB150-002',
    name: 'Disco de freno delantero Honda CB150',
    slug: 'disco-freno-delantero-honda-cb150',
    description: 'Disco de freno delantero de alta calidad para Honda CB150. Acero inoxidable, diseño ventilado para mejor disipación de calor.',
    price: 19_500_000, // $195.000 COP
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'frenos',
    compatible: [
      { brand: 'Honda', model: 'CB150', year: 2019 },
      { brand: 'Honda', model: 'CB150', year: 2020 },
      { brand: 'Honda', model: 'CB150', year: 2021 },
    ],
  },
  {
    sku: 'FRE-KIT-AKT125-003',
    name: 'Kit freno trasero AKT 125',
    slug: 'kit-freno-trasero-akt-125',
    description: 'Kit completo de freno trasero para AKT 125. Incluye zapatas, resortes y pasadores. Fácil instalación.',
    price: 12_000_000, // $120.000 COP
    stock: 30,
    images: [],
    isActive: true,
    categorySlug: 'frenos',
    compatible: [
      { brand: 'AKT', model: 'TT125', year: 2020 },
      { brand: 'AKT', model: 'NKD125', year: 2021 },
    ],
  },

  // ── Llantas ─────────────────────────────────────────────────────────────────
  {
    sku: 'LLA-PIR-100-90-18-001',
    name: 'Llanta delantera Pirelli 100/90-18',
    slug: 'llanta-delantera-pirelli-100-90-18',
    description: 'Llanta delantera Pirelli Sport Demon 100/90-18. Excelente agarre en pavimento seco y mojado. Diseño sport de alto rendimiento.',
    price: 12_500_000, // $125.000 COP
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'llantas',
    compatible: [],
  },
  {
    sku: 'LLA-MIC-120-80-17-002',
    name: 'Llanta trasera Michelin 120/80-17',
    slug: 'llanta-trasera-michelin-120-80-17',
    description: 'Llanta trasera Michelin Pilot Street 120/80-17. Compuesto de goma de larga duración. Ideal para uso urbano y carretera.',
    price: 15_800_000, // $158.000 COP
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'llantas',
    compatible: [],
  },
  {
    sku: 'LLA-MAX-90-90-21-003',
    name: 'Llanta todo terreno Maxxis 90/90-21',
    slug: 'llanta-todo-terreno-maxxis-90-90-21',
    description: 'Llanta Maxxis Enduro 90/90-21 para uso mixto. Taco profundo para terrenos difíciles. Estructura reforzada anti-pinchazos.',
    price: 22_000_000, // $220.000 COP
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'llantas',
    compatible: [],
  },

  // ── Repuestos Motor ─────────────────────────────────────────────────────────
  {
    sku: 'MOT-PIS-YBR125-001',
    name: 'Pistón completo Yamaha YBR 125',
    slug: 'piston-completo-yamaha-ybr125',
    description: 'Pistón completo con anillos para Yamaha YBR 125. Aluminio de alta resistencia, medidas estándar. Incluye pasador y seguros.',
    price: 35_000_000, // $350.000 COP
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'repuestos-motor',
    compatible: [{ brand: 'Yamaha', model: 'YBR125', year: 2018 }],
  },
  {
    sku: 'MOT-ANI-WAV110-002',
    name: 'Anillos motor Honda Wave 110',
    slug: 'anillos-motor-honda-wave-110',
    description: 'Juego de anillos de motor para Honda Wave 110. Cromo duro, alta resistencia al desgaste. Medida estándar 50mm.',
    price: 18_000_000, // $180.000 COP
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'repuestos-motor',
    compatible: [
      { brand: 'Honda', model: 'Wave 110', year: 2019 },
      { brand: 'Honda', model: 'Wave 110', year: 2020 },
    ],
  },
  {
    sku: 'MOT-CIG-BOX150-003',
    name: 'Cigüeñal Bajaj Boxer 150',
    slug: 'ciguenal-bajaj-boxer-150',
    description: 'Cigüeñal completo con rodamientos para Bajaj Boxer 150. Balanceado de fábrica. Garantía de 6 meses.',
    price: 85_000_000, // $850.000 COP
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'repuestos-motor',
    compatible: [{ brand: 'Bajaj', model: 'Boxer 150', year: 2020 }],
  },
  {
    sku: 'MOT-FIL-CBR150-004',
    name: 'Filtro de aceite Honda CBR 150',
    slug: 'filtro-aceite-honda-cbr150',
    description: 'Filtro de aceite original para Honda CBR 150. Alta capacidad de filtración. Recomendado cambio cada 3.000 km.',
    price: 2_500_000, // $25.000 COP
    stock: 50,
    images: [],
    isActive: true,
    categorySlug: 'repuestos-motor',
    compatible: [
      { brand: 'Honda', model: 'CBR150R', year: 2020 },
      { brand: 'Honda', model: 'CBR150R', year: 2021 },
      { brand: 'Honda', model: 'CBR150R', year: 2022 },
    ],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Cargando catálogo...\n')

  // 1. Crear / actualizar categorías
  console.log('📂 Categorías:')
  const categoryMap: Record<string, string> = {} // slug → id

  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, description: cat.description },
      create: cat,
    })
    categoryMap[cat.slug] = record.id
    console.log(`  ✓ ${cat.name}`)
  }

  // 2. Crear / actualizar productos
  console.log('\n📦 Productos:')
  let created = 0
  let skipped = 0

  for (const { categorySlug, compatible, ...productData } of PRODUCTS) {
    const categoryId = categoryMap[categorySlug]
    if (!categoryId) {
      console.warn(`  ⚠️  Categoría no encontrada: "${categorySlug}" — omitiendo ${productData.sku}`)
      skipped++
      continue
    }

    await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {
        name: productData.name,
        description: productData.description,
        price: productData.price,
        stock: productData.stock,
        isActive: productData.isActive,
        categoryId,
      },
      create: {
        ...productData,
        categoryId,
        compatible: { create: compatible },
      },
    })
    console.log(`  ✓ [${productData.sku}] ${productData.name}`)
    created++
  }

  console.log(`\n✅ Catálogo cargado: ${created} productos, ${CATEGORIES.length} categorías`)
  if (skipped > 0) console.log(`⚠️  ${skipped} productos omitidos por categoría inválida`)
  console.log(`\nTotal productos en este catálogo: ${PRODUCTS.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
