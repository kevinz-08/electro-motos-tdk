/**
 * prisma/catalog.ts — Poblar catálogo con jerarquía de tres niveles
 *
 *   Categorías Padre → Subcategorías → Productos
 *
 * Categorías Padre:
 *   Sistema Eléctrico, Repuestos, Aceites, Llantas, Accesorios
 *
 * Ejecutar:
 *   npm run db:catalog
 *
 * Todos los precios están en CENTAVOS COP.
 * Ejemplo: $29.000 COP → 2_900_000 centavos
 *
 * Agregar categorías: agrega objetos en PARENT_CATEGORIES o SUBCATEGORIES.
 * Agregar productos:  agrega objetos en PRODUCTS con el slug de la subcategoría.
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma  = new PrismaClient({ adapter })

// ─── Categorías Padre ─────────────────────────────────────────────────────────

const PARENT_CATEGORIES = [
  {
    slug: 'sistema-electrico',
    name: 'Sistema Eléctrico',
    description: 'Todo el sistema eléctrico de tu moto: CDI, stators, reguladores, arneses y baterías.',
  },
  {
    slug: 'repuestos',
    name: 'Repuestos',
    description: 'Filtros de aire, frenos, bujías y repuestos internos de motor.',
  },
  {
    slug: 'aceites',
    name: 'Aceites',
    description: 'Aceites de motor y lubricantes de las mejores marcas para todas las motos.',
  },
  {
    slug: 'llantas',
    name: 'Llantas',
    description: 'Llantas y neumáticos para todo tipo de moto y terreno.',
  },
  {
    slug: 'accesorios',
    name: 'Accesorios',
    description: 'Accesorios, equipamiento y personalización para tu moto.',
  },
]

// ─── Subcategorías ────────────────────────────────────────────────────────────
// `parentSlug` indica a qué categoría padre pertenece.

const SUBCATEGORIES = [
  // ── Sistema Eléctrico ────────────────────────────────────────────────────
  { slug: 'ramales',      name: 'Ramales',      parentSlug: 'sistema-electrico', description: 'Arneses y ramales eléctricos completos para las principales marcas y modelos.' },
  { slug: 'reguladores',  name: 'Reguladores',  parentSlug: 'sistema-electrico', description: 'Reguladores rectificadores que protegen el sistema eléctrico y la batería.' },
  { slug: 'cdi',          name: 'CDI',          parentSlug: 'sistema-electrico', description: 'Módulos CDI y flashers para el control del encendido electrónico.' },
  { slug: 'baterias',     name: 'Baterías',     parentSlug: 'sistema-electrico', description: 'Baterías Magna y de otras marcas para todo tipo de moto.' },
  { slug: 'estatores',    name: 'Estatores',    parentSlug: 'sistema-electrico', description: 'Stators de encendido para un sistema de carga estable y duradera.' },
  { slug: 'bobinas',      name: 'Bobinas',      parentSlug: 'sistema-electrico', description: 'Bobinas de alta tensión y de señal para el sistema de encendido.' },
  { slug: 'sensores',      name: 'Sensores',      parentSlug: 'sistema-electrico', description: 'Sensores eléctricos que monitorean y regulan parámetros clave del motor y sistema electrónico de la moto.' },

  // ── Repuestos ────────────────────────────────────────────────────────────
  { slug: 'filtro-de-aire',  name: 'Filtro de Aire',  parentSlug: 'repuestos', description: 'Filtros de aire de alto flujo lavables y reutilizables para mayor rendimiento.' },
  { slug: 'bujias',          name: 'Bujías',           parentSlug: 'repuestos', description: 'Bujías de encendido para todas las marcas y cilindradas.' },
  { slug: 'conectores',      name: 'Conectores',       parentSlug: 'repuestos', description: 'Conectores eléctricos y terminales para reparaciones eléctricas.' },
  { slug: 'frenos',          name: 'Frenos',           parentSlug: 'repuestos', description: 'Pastillas, discos y kits de frenos para todas las marcas.' },
  { slug: 'repuestos-motor', name: 'Repuestos Motor',  parentSlug: 'repuestos', description: 'Pistones, anillos, cigüeñales y repuestos internos de motor.' },

  // ── Aceites ──────────────────────────────────────────────────────────────
  { slug: 'liquimoly', name: 'Liquimoly', parentSlug: 'aceites', description: 'Aceites de motor y aditivos Liqui-Moly de alta performance.' },
  { slug: 'sky',       name: 'SKY',       parentSlug: 'aceites', description: 'Lubricantes SKY para moto.' },

  // ── Accesorios ───────────────────────────────────────────────────────────
  { slug: 'espejos',       name: 'Espejos',       parentSlug: 'accesorios', description: 'Espejos retrovisores universales y específicos para cada moto.' },
  { slug: 'exploradores',  name: 'Exploradores',  parentSlug: 'accesorios', description: 'Luces exploradores y barras de iluminación auxiliar.' },
  { slug: 'bombillas-led', name: 'Bombillas LED', parentSlug: 'accesorios', description: 'Bombillas LED de alta intensidad, stops y direccionales.' },
  { slug: 'equipamiento',  name: 'Equipamiento',  parentSlug: 'accesorios', description: 'Balaclavas, guantes y accesorios de protección para el motociclista.' },
  { slug: 'objetivo',      name: 'Objetivo',      parentSlug: 'accesorios', description: 'Accesorios de cámara y soporte de dispositivos para moto.' },
]

// ─── Productos ────────────────────────────────────────────────────────────────
// `categorySlug` debe coincidir con un slug de SUBCATEGORIES o PARENT_CATEGORIES.

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

  // ══════════════════════════════════════════════════════════════════════════
  // SISTEMA ELÉCTRICO → Estatores
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ELE-STA-KYM110-001',
    name: 'Stator KYMCO Unik 110',
    slug: 'stator-kymco-unik-110',
    description: 'Stator de encendido para KYMCO Unik 110. Bobinado original, alta durabilidad y rendimiento estable de carga.',
    price: 13_900_000,
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'KYMCO', model: 'Unik 110' }],
  },
  {
    sku: 'ELE-STA-KTM200-002',
    name: 'Stator KTM Duke 200',
    slug: 'stator-ktm-duke-200',
    description: 'Stator completo para KTM Duke 200. Pieza de repuesto de alta calidad para el sistema de carga.',
    price: 16_200_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'KTM', model: 'Duke 200' }],
  },
  {
    sku: 'ELE-STA-DIS125-003',
    name: 'Stator completo Discover 125 ST',
    slug: 'stator-discover-125-st',
    description: 'Stator completo para Bajaj Discover 125 ST. Compatible con sistema de encendido original.',
    price: 10_200_000,
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'Bajaj', model: 'Discover 125 ST' }],
  },
  {
    sku: 'ELE-STA-PUL180-004',
    name: 'Stator completo Pulsar 180 UG',
    slug: 'stator-pulsar-180-ug',
    description: 'Stator completo para Bajaj Pulsar 180 UG. Bobinado reforzado para mayor vida útil.',
    price: 10_200_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 180 UG' }],
  },
  {
    sku: 'ELE-STA-PUL135-005',
    name: 'Stator completo Pulsar 135 LS',
    slug: 'stator-pulsar-135-ls',
    description: 'Stator completo para Bajaj Pulsar 135 LS. Repuesto directo del sistema de carga.',
    price: 12_000_000,
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 135 LS' }],
  },
  {
    sku: 'ELE-STA-AUT125-006',
    name: 'Stator completo Auteco XCD 125',
    slug: 'stator-auteco-xcd-125',
    description: 'Stator completo para Auteco XCD 125. Alta eficiencia en la generación de carga.',
    price: 12_000_000,
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'Auteco', model: 'XCD 125' }],
  },
  {
    sku: 'ELE-STA-AKT125-007',
    name: 'Stator AKT 125 NKD/TT',
    slug: 'stator-akt-125-nkd-tt',
    description: 'Stator para AKT 125 NKD y AKT TT 125. Compatible con ambas versiones.',
    price: 9_500_000,
    stock: 14,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
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
    price: 10_800_000,
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'estatores',
    compatible: [{ brand: 'Eco', model: 'De Luxe KS' }],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SISTEMA ELÉCTRICO → CDI
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ELE-CDI-AKT110-001',
    name: 'CDI AKT 110 Original',
    slug: 'cdi-akt-110-original',
    description: 'CDI original para AKT 110. Controla el encendido electrónico de forma precisa. Instalación directa.',
    price: 6_500_000,
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'AKT', model: '110' }],
  },
  {
    sku: 'ELE-CDI-BWS125-002',
    name: 'CDI BWS 125 4T',
    slug: 'cdi-bws-125-4t',
    description: 'CDI para Yamaha BWS 125 4 tiempos. Compatible con sistema de encendido CDI AC.',
    price: 18_000_000,
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Yamaha', model: 'BWS 125 4T' }],
  },
  {
    sku: 'ELE-CDI-BEST125-003',
    name: 'CDI Best 125',
    slug: 'cdi-best-125',
    description: 'CDI para Best 125. Módulo de encendido electrónico de repuesto.',
    price: 9_690_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Best', model: '125' }],
  },
  {
    sku: 'ELE-CDI-PUL180-004',
    name: 'CDI Pulsar 180/200 ref: DJ111023',
    slug: 'cdi-pulsar-180-200-dj111023',
    description: 'CDI para Bajaj Pulsar 180 y 200. Referencia DJ111023.',
    price: 12_000_000,
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
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
    price: 12_000_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Bajaj', model: 'Discover 135 Sport' }],
  },
  {
    sku: 'ELE-CDI-PUL220-006',
    name: 'CDI Pulsar 220GP/220S/220F',
    slug: 'cdi-pulsar-220',
    description: 'CDI para Bajaj Pulsar 220GP, 220S y 220F.',
    price: 16_990_000,
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
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
    price: 15_500_000,
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 200 NS' }],
  },
  {
    sku: 'ELE-CDI-PUL135-008',
    name: 'CDI Pulsar 135',
    slug: 'cdi-pulsar-135',
    description: 'CDI para Bajaj Pulsar 135. Repuesto directo del módulo de encendido.',
    price: 16_000_000,
    stock: 11,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 135' }],
  },
  {
    sku: 'ELE-CDI-GN125-009',
    name: 'CDI GN/GS 125',
    slug: 'cdi-gn-gs-125',
    description: 'CDI para Suzuki GN 125 y GS 125.',
    price: 10_200_000,
    stock: 18,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
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
    price: 9_690_000,
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Yamaha', model: 'Libero 110' }],
  },
  {
    sku: 'ELE-CDI-CRY110-011',
    name: 'CDI Yamaha Crypton 110',
    slug: 'cdi-yamaha-crypton-110',
    description: 'CDI para Yamaha Crypton 110.',
    price: 7_990_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Yamaha', model: 'Crypton 110' }],
  },
  {
    sku: 'ELE-CDI-XLR125-012',
    name: 'CDI Honda XLR 125',
    slug: 'cdi-honda-xlr-125',
    description: 'CDI para Honda XLR 125.',
    price: 5_970_000,
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Honda', model: 'XLR 125' }],
  },
  {
    sku: 'ELE-CDI-CRI115-013',
    name: 'CDI Yamaha Cripton 115',
    slug: 'cdi-yamaha-cripton-115',
    description: 'CDI para Yamaha Cripton 115.',
    price: 9_690_000,
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Yamaha', model: 'Cripton 115' }],
  },
  // Flashers → CDI (control electrónico de señalización)
  {
    sku: 'ELE-FLA-BAJ-001',
    name: 'Flasher para moto Bajaj',
    slug: 'flasher-moto-bajaj',
    description: 'Flasher (intermitente electrónico) compatible con motos Bajaj.',
    price: 2_500_000,
    stock: 35,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Bajaj', model: 'Universal' }],
  },
  {
    sku: 'ELE-FLA-CB190-002',
    name: 'Flasher Honda CB 190 R',
    slug: 'flasher-honda-cb-190-r',
    description: 'Flasher para Honda CB 190 R. Control electrónico de las luces direccionales.',
    price: 3_000_000,
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [{ brand: 'Honda', model: 'CB 190 R' }],
  },
  // Módulo estacionarias → CDI
  {
    sku: '9-M2060',
    name: 'Módulo de Estacionarias',
    slug: 'modulo-de-estacionarias',
    description: 'Módulo electrónico para luces estacionarias. Compatible con múltiples modelos de moto.',
    price: 1_800_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'cdi',
    compatible: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SISTEMA ELÉCTRICO → Bobinas
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ELE-BOB-PUL180-001',
    name: 'Bobina de alta Pulsar 180/200',
    slug: 'bobina-alta-pulsar-180-200',
    description: 'Bobina de alta tensión para Bajaj Pulsar 180 y 200. Garantiza una chispa potente para un encendido eficiente.',
    price: 2_900_000,
    stock: 30,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [
      { brand: 'Bajaj', model: 'Pulsar 180' },
      { brand: 'Bajaj', model: 'Pulsar 200' },
    ],
  },
  {
    sku: 'ELE-BOB-CDI-002',
    name: 'Bobina de alta CDI incorporado',
    slug: 'bobina-alta-cdi-incorporado',
    description: 'Bobina de alta tensión con CDI incorporado. Universal para varias referencias.',
    price: 2_500_000,
    stock: 25,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [],
  },
  {
    sku: 'ELE-BOB-GN125-003',
    name: 'Bobina de alta GN125/GS125',
    slug: 'bobina-alta-gn125-gs125',
    description: 'Bobina de alta para Suzuki GN 125 y GS 125.',
    price: 4_680_000,
    stock: 20,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [
      { brand: 'Suzuki', model: 'GN 125' },
      { brand: 'Suzuki', model: 'GS 125' },
    ],
  },
  {
    sku: 'ELE-BOB-RX115-004',
    name: 'Bobina de alta RX 115/DT',
    slug: 'bobina-alta-rx-115-dt',
    description: 'Bobina de alta para Yamaha RX 115 y DT.',
    price: 3_500_000,
    stock: 18,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [
      { brand: 'Yamaha', model: 'RX 115' },
      { brand: 'Yamaha', model: 'DT' },
    ],
  },
  {
    sku: 'ELE-BOB-XT225-005',
    name: 'Bobina de señal Yamaha XT 225',
    slug: 'bobina-senal-yamaha-xt-225',
    description: 'Bobina de señal (pickup) para Yamaha XT 225.',
    price: 6_350_000,
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [{ brand: 'Yamaha', model: 'XT 225' }],
  },
  {
    sku: 'ELE-BOB-DT125-006',
    name: 'Bobina de luz y carga Yamaha DT 125',
    slug: 'bobina-luz-carga-yamaha-dt-125',
    description: 'Bobina de luz y carga para Yamaha DT 125.',
    price: 3_500_000,
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [{ brand: 'Yamaha', model: 'DT 125' }],
  },
  {
    sku: 'ELE-BOB-RX115B-007',
    name: 'Bobina de luz y carga Yamaha RX 115',
    slug: 'bobina-luz-carga-yamaha-rx-115',
    description: 'Bobina de luz y carga para Yamaha RX 115.',
    price: 3_500_000,
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'bobinas',
    compatible: [{ brand: 'Yamaha', model: 'RX 115' }],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SISTEMA ELÉCTRICO → Reguladores
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ELE-REG-HON125-001',
    name: 'Regulador Honda Storm 125',
    slug: 'regulador-honda-storm-125',
    description: 'Regulador rectificador para Honda Storm 125. Controla el voltaje y protege la batería.',
    price: 8_100_000,
    stock: 12,
    images: [],
    isActive: true,
    categorySlug: 'reguladores',
    compatible: [{ brand: 'Honda', model: 'Storm 125' }],
  },
  {
    sku: 'ELE-REG-FZ160-002',
    name: 'Regulador Yamaha FZ-160',
    slug: 'regulador-yamaha-fz-160',
    description: 'Regulador rectificador para Yamaha FZ-160.',
    price: 9_000_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'reguladores',
    compatible: [{ brand: 'Yamaha', model: 'FZ-160' }],
  },
  {
    sku: 'ELE-REG-LIB125-003',
    name: 'Regulador Libero 125',
    slug: 'regulador-libero-125',
    description: 'Regulador rectificador para Yamaha Libero 125.',
    price: 9_000_000,
    stock: 11,
    images: [],
    isActive: true,
    categorySlug: 'reguladores',
    compatible: [{ brand: 'Yamaha', model: 'Libero 125' }],
  },
  {
    sku: 'ELE-REG-PUL180-004',
    name: 'Regulador Pulsar 180/200',
    slug: 'regulador-pulsar-180-200',
    description: 'Regulador rectificador para Bajaj Pulsar 180 y 200.',
    price: 8_500_000,
    stock: 14,
    images: [],
    isActive: true,
    categorySlug: 'reguladores',
    compatible: [
      { brand: 'Bajaj', model: 'Pulsar 180' },
      { brand: 'Bajaj', model: 'Pulsar 200' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SISTEMA ELÉCTRICO → Ramales
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ARN-GS125-2011-001',
    name: 'Ramal eléctrico GS 125 modelo 2011',
    slug: 'ramal-electrico-gs-125-2011',
    description: 'Arnés eléctrico completo para Suzuki GS 125 modelo 2011. Incluye todos los conectores originales.',
    price: 18_000_000,
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Suzuki', model: 'GS 125', year: 2011 }],
  },
  {
    sku: 'ARN-GN125-2013-002',
    name: 'Ramal eléctrico GN 125 modelo 2013',
    slug: 'ramal-electrico-gn-125-2013',
    description: 'Arnés eléctrico completo para Suzuki GN 125 modelo 2013.',
    price: 17_900_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Suzuki', model: 'GN 125', year: 2013 }],
  },
  {
    sku: 'ARN-GS125-2014-003',
    name: 'Ramal eléctrico GS 125 MN 2014-2017',
    slug: 'ramal-electrico-gs-125-mn-2014-2017',
    description: 'Arnés eléctrico para Suzuki GS 125 MN, modelos 2014 a 2017.',
    price: 18_500_000,
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [
      { brand: 'Suzuki', model: 'GS 125 MN', year: 2014 },
      { brand: 'Suzuki', model: 'GS 125 MN', year: 2017 },
    ],
  },
  {
    sku: 'ARN-PUL180-2012-004',
    name: 'Ramal eléctrico Pulsar 180 GT 2012',
    slug: 'ramal-electrico-pulsar-180-gt-2012',
    description: 'Arnés eléctrico para Bajaj Pulsar 180 GT modelo 2012.',
    price: 17_000_000,
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 180 GT', year: 2012 }],
  },
  {
    sku: 'ARN-GN125N-2017-005',
    name: 'Ramal eléctrico GN 125 Nova modelo 2017',
    slug: 'ramal-electrico-gn-125-nova-2017',
    description: 'Arnés eléctrico para Suzuki GN 125 Nova modelo 2017.',
    price: 16_000_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Suzuki', model: 'GN 125 Nova', year: 2017 }],
  },
  {
    sku: 'ARN-GN125-2011-006',
    name: 'Ramal eléctrico GN 125 modelo 2011',
    slug: 'ramal-electrico-gn-125-2011',
    description: 'Arnés eléctrico para Suzuki GN 125 modelo 2011.',
    price: 9_500_000,
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Suzuki', model: 'GN 125', year: 2011 }],
  },
  {
    sku: 'ARN-GN125I-007',
    name: 'Ramal eléctrico GN 125 Intruder',
    slug: 'ramal-electrico-gn-125-intruder',
    description: 'Arnés eléctrico para Suzuki GN 125 Intruder.',
    price: 9_500_000,
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Suzuki', model: 'GN 125 Intruder' }],
  },
  {
    sku: 'ARN-XTZ125-2014-008',
    name: 'Ramal eléctrico XTZ 125 2014-2018',
    slug: 'ramal-electrico-xtz-125-2014-2018',
    description: 'Arnés eléctrico para Yamaha XTZ 125, modelos 2014 a 2018.',
    price: 17_900_000,
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [
      { brand: 'Yamaha', model: 'XTZ 125', year: 2014 },
      { brand: 'Yamaha', model: 'XTZ 125', year: 2018 },
    ],
  },
  {
    sku: 'ARN-XTZ125-2007-009',
    name: 'Ramal eléctrico XTZ 125 Starter 2007',
    slug: 'ramal-electrico-xtz-125-starter-2007',
    description: 'Arnés eléctrico para Yamaha XTZ 125 con arranque eléctrico, modelo 2007.',
    price: 15_500_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Yamaha', model: 'XTZ 125', year: 2007 }],
  },
  {
    sku: 'ARN-LIB125-2014-010',
    name: 'Ramal eléctrico Libero 125 2014-2018',
    slug: 'ramal-electrico-libero-125-2014-2018',
    description: 'Arnés eléctrico para Yamaha Libero 125, modelos 2014 a 2018.',
    price: 14_000_000,
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
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
    price: 18_000_000,
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
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
    price: 12_000_000,
    stock: 4,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [
      { brand: 'Yamaha', model: 'DT 125 Special', year: 1996 },
      { brand: 'Yamaha', model: 'DT 175 Special', year: 1998 },
    ],
  },
  {
    sku: 'ARN-FZ16-2012-013',
    name: 'Ramal eléctrico FZ-16 2012-2014',
    slug: 'ramal-electrico-fz-16-2012-2014',
    description: 'Arnés eléctrico para Yamaha FZ-16, modelos 2012 a 2014.',
    price: 23_000_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [
      { brand: 'Yamaha', model: 'FZ-16', year: 2012 },
      { brand: 'Yamaha', model: 'FZ-16', year: 2014 },
    ],
  },
  {
    sku: 'ARN-DT125-2000-014',
    name: 'Ramal eléctrico DT 125 2000-2008',
    slug: 'ramal-electrico-dt-125-2000-2008',
    description: 'Arnés eléctrico para Yamaha DT 125, modelos 2000 a 2008.',
    price: 14_500_000,
    stock: 6,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
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
    price: 13_500_000,
    stock: 4,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [
      { brand: 'Yamaha', model: 'DT 125', year: 1994 },
      { brand: 'Yamaha', model: 'DT 175', year: 1995 },
    ],
  },
  {
    sku: 'ARN-RX115-016',
    name: 'Ramal eléctrico RX 115',
    slug: 'ramal-electrico-rx-115',
    description: 'Arnés eléctrico para Yamaha RX 115.',
    price: 9_500_000,
    stock: 9,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Yamaha', model: 'RX 115' }],
  },
  {
    sku: 'ARN-YBR125-017',
    name: 'Ramal eléctrico YBR 125 SS',
    slug: 'ramal-electrico-ybr-125-ss',
    description: 'Arnés eléctrico para Yamaha YBR 125 SS.',
    price: 17_000_000,
    stock: 7,
    images: [],
    isActive: true,
    categorySlug: 'ramales',
    compatible: [{ brand: 'Yamaha', model: 'YBR 125 SS' }],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SISTEMA ELÉCTRICO → Baterías
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'BAT-MAG-YB7BB-001',
    name: 'Batería Magna MF-YB7BB',
    slug: 'bateria-magna-mf-yb7bb',
    description: 'Batería Magna libre de mantenimiento MF-YB7BB. 12V 7Ah. Lista para instalar.',
    price: 8_970_000,
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
    description: 'Batería Magna libre de mantenimiento MF-YB6.5LB. 12V 6.5Ah.',
    price: 8_010_000,
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
    description: 'Batería Magna MF-12N7B-3A. 12V 7Ah. Alta capacidad de arranque en frío.',
    price: 10_210_000,
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
    description: 'Batería Magna MF-YB3LA. 12V 3Ah. Para motos pequeñas de 110cc.',
    price: 6_100_000,
    stock: 25,
    images: [],
    isActive: true,
    categorySlug: 'baterias',
    compatible: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // REPUESTOS → Filtro de Aire
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: '9-APACHE',
    name: 'Filtro Aire Alto Flujo Apache 160/180/200',
    slug: 'filtro-aire-alto-flujo-apache-160-180-200',
    description: 'Filtro de aire de alto flujo compatible con Apache 160, 180 y 200. Lavable y reutilizable.',
    price: 3_500_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
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
    description: 'Filtro de aire de alto flujo KYN para Bajaj Dominar 400.',
    price: 3_800_000,
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [{ brand: 'Bajaj', model: 'Dominar 400' }],
  },
  {
    sku: '9-CB190',
    name: 'Filtro Aire Alto Flujo CB 190 / CB 160',
    slug: 'filtro-aire-alto-flujo-cb190-cb160',
    description: 'Filtro de aire de alto flujo para Honda CB 190 y CB 160. Lavable y reutilizable.',
    price: 3_500_000,
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [
      { brand: 'Honda', model: 'CB 190' },
      { brand: 'Honda', model: 'CB 160' },
    ],
  },
  {
    sku: '9-DR150',
    name: 'Filtro Aire Alto Flujo DR 150',
    slug: 'filtro-aire-alto-flujo-dr150',
    description: 'Filtro de aire de alto flujo para Suzuki DR 150.',
    price: 3_200_000,
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [{ brand: 'Suzuki', model: 'DR 150' }],
  },
  {
    sku: '9-GIX150',
    name: 'Filtro Aire Alto Flujo Gixxer 150',
    slug: 'filtro-aire-alto-flujo-gixxer-150',
    description: 'Filtro de aire de alto flujo para Suzuki Gixxer 150.',
    price: 3_500_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [{ brand: 'Suzuki', model: 'Gixxer 150' }],
  },
  {
    sku: '9-K390',
    name: 'Filtro de Aire Alto Flujo KTM 390 3G',
    slug: 'filtro-aire-alto-flujo-ktm-390-3g',
    description: 'Filtro de aire de alto flujo para KTM 390 3G.',
    price: 4_200_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [{ brand: 'KTM', model: '390 3G' }],
  },
  {
    sku: '9-KT250',
    name: 'Filtro Aire Alto Flujo KTM 200/250 NG/WO',
    slug: 'filtro-aire-alto-flujo-ktm-200-250-ng-wo',
    description: 'Filtro de aire de alto flujo para KTM 200 y 250 versiones NG y WO.',
    price: 4_000_000,
    stock: 5,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [
      { brand: 'KTM', model: '200 NG' },
      { brand: 'KTM', model: '200 WO' },
      { brand: 'KTM', model: '250 NG' },
      { brand: 'KTM', model: '250 WO' },
    ],
  },
  {
    sku: '9-YA19',
    name: 'Filtro de Aire Alto Flujo KYN Yamaha MT15',
    slug: 'filtro-aire-alto-flujo-kyn-yamaha-mt15',
    description: 'Filtro de aire de alto flujo KYN para Yamaha MT15.',
    price: 3_800_000,
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [{ brand: 'Yamaha', model: 'MT15' }],
  },
  {
    sku: '9-YA150',
    name: 'Filtro de Aire Alto Flujo XTZ 150',
    slug: 'filtro-aire-alto-flujo-xtz-150',
    description: 'Filtro de aire de alto flujo para Yamaha XTZ 150.',
    price: 3_200_000,
    stock: 8,
    images: [],
    isActive: true,
    categorySlug: 'filtro-de-aire',
    compatible: [{ brand: 'Yamaha', model: 'XTZ 150' }],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // REPUESTOS → Frenos
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'FRE-BRE-FZ25-001',
    name: 'Pastillas de freno Brembo Yamaha FZ25',
    slug: 'pastillas-freno-brembo-yamaha-fz25',
    description: 'Pastillas de freno originales Brembo para Yamaha FZ25. Alta resistencia al calor.',
    price: 8_500_000,
    stock: 25,
    images: [],
    isActive: true,
    categorySlug: 'frenos',
    compatible: [
      { brand: 'Yamaha', model: 'FZ25', year: 2020 },
      { brand: 'Yamaha', model: 'FZ25', year: 2022 },
    ],
  },
  {
    sku: 'FRE-DIS-CB150-002',
    name: 'Disco de freno delantero Honda CB150',
    slug: 'disco-freno-delantero-honda-cb150',
    description: 'Disco de freno delantero de alta calidad para Honda CB150. Acero inoxidable ventilado.',
    price: 19_500_000,
    stock: 15,
    images: [],
    isActive: true,
    categorySlug: 'frenos',
    compatible: [
      { brand: 'Honda', model: 'CB150', year: 2019 },
      { brand: 'Honda', model: 'CB150', year: 2021 },
    ],
  },
  {
    sku: 'FRE-KIT-AKT125-003',
    name: 'Kit freno trasero AKT 125',
    slug: 'kit-freno-trasero-akt-125',
    description: 'Kit completo de freno trasero para AKT 125. Incluye zapatas, resortes y pasadores.',
    price: 12_000_000,
    stock: 30,
    images: [],
    isActive: true,
    categorySlug: 'frenos',
    compatible: [
      { brand: 'AKT', model: 'TT125', year: 2020 },
      { brand: 'AKT', model: 'NKD125', year: 2021 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // REPUESTOS → Repuestos Motor
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'MOT-PIS-YBR125-001',
    name: 'Pistón completo Yamaha YBR 125',
    slug: 'piston-completo-yamaha-ybr125',
    description: 'Pistón completo con anillos para Yamaha YBR 125. Aluminio de alta resistencia.',
    price: 35_000_000,
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
    description: 'Juego de anillos de motor para Honda Wave 110. Cromo duro. Medida estándar 50mm.',
    price: 18_000_000,
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
    description: 'Cigüeñal completo con rodamientos para Bajaj Boxer 150. Balanceado de fábrica.',
    price: 85_000_000,
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
    description: 'Filtro de aceite original para Honda CBR 150. Cambio recomendado cada 3.000 km.',
    price: 2_500_000,
    stock: 50,
    images: [],
    isActive: true,
    categorySlug: 'repuestos-motor',
    compatible: [
      { brand: 'Honda', model: 'CBR150R', year: 2020 },
      { brand: 'Honda', model: 'CBR150R', year: 2022 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // LLANTAS (categoría padre directamente)
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'LLA-PIR-100-90-18-001',
    name: 'Llanta delantera Pirelli 100/90-18',
    slug: 'llanta-delantera-pirelli-100-90-18',
    description: 'Llanta delantera Pirelli Sport Demon 100/90-18. Excelente agarre en pavimento.',
    price: 12_500_000,
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
    description: 'Llanta trasera Michelin Pilot Street 120/80-17. Larga duración para uso urbano.',
    price: 15_800_000,
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
    description: 'Llanta Maxxis Enduro 90/90-21. Taco profundo para terrenos difíciles.',
    price: 22_000_000,
    stock: 3,
    images: [],
    isActive: true,
    categorySlug: 'llantas',
    compatible: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACCESORIOS → Bombillas LED
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ILU-STOP-PUL200-001',
    name: 'Stop integrado Pulsar 200 NS',
    slug: 'stop-integrado-pulsar-200-ns',
    description: 'Stop integrado con direccionales para Bajaj Pulsar 200 NS. Diseño slim LED.',
    price: 11_000_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'bombillas-led',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar 200 NS' }],
  },
  {
    sku: 'ILU-LED-H4-001',
    name: 'Bombillo H4 LED 12000 lúmenes M4 Plus',
    slug: 'bombillo-h4-led-12000-lumenes-m4-plus',
    description: 'Bombillo H4 LED de 12000 lúmenes. Luz blanca 6000K. Compatible con la mayoría de motos con faro H4.',
    price: 6_500_000,
    stock: 30,
    images: [],
    isActive: true,
    categorySlug: 'bombillas-led',
    compatible: [],
  },
  {
    sku: '9-2586',
    name: 'Direccionales LED Naranja Doble Pantalla (Par)',
    slug: 'direccionales-led-naranja-doble-pantalla-par',
    description: 'Par de direccionales LED color naranja con doble pantalla. Alta visibilidad.',
    price: 2_500_000,
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'bombillas-led',
    compatible: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACCESORIOS → Equipamiento
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: '9-05601',
    name: 'Balaclava Negro',
    slug: 'balaclava-negro',
    description: 'Balaclava de color negro para motociclismo. Protege el rostro y cuello del viento y el frío.',
    price: 2_000_000,
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
    description: 'Balaclava negra con diseño cubre cabello. Ideal para usar bajo el casco.',
    price: 2_200_000,
    stock: 2,
    images: [],
    isActive: true,
    categorySlug: 'equipamiento',
    compatible: [],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACCESORIOS → padre (sin subcategoría más específica)
  // ══════════════════════════════════════════════════════════════════════════
  {
    sku: 'ACC-FEND-KTM-001',
    name: 'Fender portaplaca retráctil KTM',
    slug: 'fender-portaplaca-retractil-ktm',
    description: 'Fender portaplaca retráctil para KTM. Look deportivo sin modificaciones.',
    price: 11_000_000,
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
    description: 'Fender portaplaca retráctil para Bajaj Pulsar.',
    price: 11_000_000,
    stock: 10,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [{ brand: 'Bajaj', model: 'Pulsar Universal' }],
  },
  {
    sku: '9-2821',
    name: 'Caballete para Moto Rojo',
    slug: 'caballete-para-moto-rojo',
    description: 'Caballete trasero para moto color rojo. Resistente y de fácil instalación.',
    price: 4_500_000,
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
    description: 'Fender trasero para Suzuki Gixxer 150. Protege de salpicaduras.',
    price: 3_500_000,
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
    description: 'Candado macizo con alarma incorporada. Alta seguridad, activa alarma sonora al detectar movimiento.',
    price: 5_500_000,
    stock: 0,
    images: [],
    isActive: true,
    categorySlug: 'accesorios',
    compatible: [],
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Cargando catálogo jerárquico...\n')

  // ── Limpieza de categorías antiguas que ya no existen en la nueva estructura ──
  const OBSOLETE_SLUGS = [
    'arneses',        // renombrado a "ramales"
    'iluminacion',    // renombrado a "bombillas-led"
    'filtros',        // renombrado a "filtro-de-aire"
    'repuestos-motor-old', // por si acaso
  ]
  for (const slug of OBSOLETE_SLUGS) {
    const cat = await prisma.category.findUnique({ where: { slug } })
    if (cat) {
      // Solo eliminar si no tiene productos asociados
      const productCount = await prisma.product.count({ where: { categoryId: cat.id } })
      if (productCount === 0) {
        await prisma.category.delete({ where: { slug } })
        console.log(`  🗑  Categoría obsoleta eliminada: ${slug}`)
      }
    }
  }

  // ── Paso 1: Upsert categorías padre ───────────────────────────────────────
  console.log('📂 Categorías Padre:')
  const categoryMap: Record<string, string> = {} // slug → id

  for (const cat of PARENT_CATEGORIES) {
    const record = await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, description: cat.description, parentId: null },
      create: { ...cat, parentId: null },
    })
    categoryMap[cat.slug] = record.id
    console.log(`  ✓ ${cat.name}`)
  }

  // ── Paso 2: Upsert subcategorías ──────────────────────────────────────────
  console.log('\n📂 Subcategorías:')
  for (const sub of SUBCATEGORIES) {
    const parentId = categoryMap[sub.parentSlug]
    if (!parentId) {
      console.warn(`  ⚠️  Padre no encontrado: "${sub.parentSlug}" — omitiendo ${sub.slug}`)
      continue
    }
    const { parentSlug: _, ...data } = sub
    const record = await prisma.category.upsert({
      where:  { slug: sub.slug },
      update: { name: sub.name, description: sub.description, parentId },
      create: { ...data, parentId },
    })
    categoryMap[sub.slug] = record.id
    console.log(`  ✓ ${sub.name} (← ${sub.parentSlug})`)
  }

  // ── Paso 3: Upsert productos ──────────────────────────────────────────────
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

  const totalCats = PARENT_CATEGORIES.length + SUBCATEGORIES.length
  console.log(`\n✅ Catálogo cargado: ${created} productos, ${totalCats} categorías`)
  if (skipped > 0) console.log(`⚠️  ${skipped} productos omitidos`)
  console.log(`\n  Padres:        ${PARENT_CATEGORIES.length}`)
  console.log(`  Subcategorías: ${SUBCATEGORIES.length}`)
  console.log(`  Productos:     ${PRODUCTS.length}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
