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
  { slug: 'motores-de-arranque',      name: 'Motores de Arraque',      parentSlug: 'sistema-electrico', description: 'Motores de arranque que garantizan un encendido rápido y eficiente en todo tipo de motocicletas.' },

  // ── Repuestos ────────────────────────────────────────────────────────────
  { slug: 'filtro-de-aire',  name: 'Filtro de Aire',  parentSlug: 'repuestos', description: 'Filtros de aire de alto flujo lavables y reutilizables para mayor rendimiento.' },
  { slug: 'bujias',          name: 'Bujías',           parentSlug: 'repuestos', description: 'Bujías de encendido para todas las marcas y cilindradas.' },
  { slug: 'conectores',      name: 'Conectores',       parentSlug: 'repuestos', description: 'Conectores eléctricos y terminales para reparaciones eléctricas.' },
  { slug: 'frenos',          name: 'Frenos',           parentSlug: 'repuestos', description: 'Pastillas, discos y kits de frenos para todas las marcas.' },
  { slug: 'repuestos-motor', name: 'Repuestos Motor',  parentSlug: 'repuestos', description: 'Pistones, anillos, cigüeñales y repuestos internos de motor.' },

  // ── Llantas ──────────────────────────────────────────────────────────────
  { slug: 'kontrol', name: 'Kontrol', parentSlug: 'llantas', description: 'Llantas Kontrol para todo tipo de moto y terreno.' },
  { slug: 'dunlop',  name: 'Dunlop',  parentSlug: 'llantas', description: 'Llantas Dunlop de alto rendimiento para moto.' },
  { slug: 'sky',     name: 'SKY',     parentSlug: 'llantas', description: 'Llantas SKY para moto.' },

  // ── Aceites ──────────────────────────────────────────────────────────────
  { slug: 'liquimoly', name: 'Liquimoly', parentSlug: 'aceites', description: 'Aceites de motor y aditivos Liqui-Moly de alta performance.' },
  { slug: 'castrol',   name: 'Castrol',   parentSlug: 'aceites', description: 'Aceites Castrol para moto.' },

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
  {
    sku:          '12-91206',
    name:         'AC CASTROL 4T 20W-50 POWER1 1L',
    slug:         '12-91206',
    description:  '',
    price:        3800000,
    stock:        5,
    images:       ["products/12-91206/1"],
    isActive:     true,
    categorySlug: 'castrol',
    compatible:   [],
  },
  {
    sku:          '12-2075',
    name:         'AC LIQUIMOLY 4T 10W-40 RACE 1L',
    slug:         '12-2075',
    description:  '',
    price:        8900000,
    stock:        5,
    images:       ["products/12-2075/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-2186',
    name:         'AC LIQUIMOLY 4T 20W-50 OPTIMAL 1L',
    slug:         '12-2186',
    description:  '',
    price:        3800000,
    stock:        10,
    images:       ["products/12-2186/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM1500',
    name:         'AC LIQUIMOLY 4T 20W-50 STREET 1L',
    slug:         '12-lm1500',
    description:  '',
    price:        5200000,
    stock:        5,
    images:       ["products/12-LM1500/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM1502',
    name:         'AC LIQUIMOLY 4T 10W-50 RACE 1L',
    slug:         '12-lm1502',
    description:  '',
    price:        8700000,
    stock:        2,
    images:       ["products/12-LM1502/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM1521',
    name:         'AC LIQUIMOLY 4T 10W-40 STREET 1L',
    slug:         '12-lm1521',
    description:  '',
    price:        5900000,
    stock:        5,
    images:       ["products/12-LM1521/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM2056',
    name:         'ADITIVO-AC LIQUIMOLY MOTO MOS2 ANTIDESGASTE 20ML',
    slug:         '12-lm2056',
    description:  '',
    price:        2800000,
    stock:        3,
    images:       ["products/12-LM2056/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM2083',
    name:         'AC LIQUIMOLY 4T 10W-40 SCOOTER 1L',
    slug:         '12-lm2083',
    description:  '',
    price:        5585000,
    stock:        5,
    images:       ["products/12-LM2083/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM2172',
    name:         'AC LIQUIMOLY 4T 10W-50 STREET 1',
    slug:         '12-lm2172',
    description:  '',
    price:        6570000,
    stock:        5,
    images:       ["products/12-LM2172/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '12-LM2555',
    name:         'AC LIQUIMOLY 4T 15W-50 STREET 1L',
    slug:         '12-lm2555',
    description:  '',
    price:        6000000,
    stock:        5,
    images:       ["products/12-LM2555/1"],
    isActive:     true,
    categorySlug: 'liquimoly',
    compatible:   [],
  },
  {
    sku:          '6-04700',
    name:         'CDI DISCOVER 100',
    slug:         '6-04700',
    description:  '',
    price:        14000000,
    stock:        1,
    images:       ["products/6-04700/1","products/6-04700/2","products/6-04700/3"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-10100',
    name:         'CDI PULSAR 160 NS',
    slug:         '6-10100',
    description:  '',
    price:        17000000,
    stock:        1,
    images:       ["products/6-10100/1","products/6-10100/2"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-12657',
    name:         'CDI YAMAHA SZR 16',
    slug:         '6-12657',
    description:  '',
    price:        14500000,
    stock:        1,
    images:       ["products/6-12657/1","products/6-12657/2"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-45600',
    name:         'CDI SUZUKI GIXXER 150',
    slug:         '6-45600',
    description:  '',
    price:        18000000,
    stock:        1,
    images:       ["products/6-45600/1","products/6-45600/2"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-AKRACI',
    name:         'CDI AKT 110 RACING',
    slug:         '6-akraci',
    description:  '',
    price:        18500000,
    stock:        1,
    images:       ["products/6-AKRACI/1","products/6-AKRACI/2","products/6-AKRACI/3","products/6-AKRACI/4"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-CDIXTZ2',
    name:         'CDI YAMAHA XTZ 125 M. 2019',
    slug:         '6-cdixtz2',
    description:  '',
    price:        18000000,
    stock:        1,
    images:       ["products/6-CDIXTZ2/1","products/6-CDIXTZ2/2"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-ECU',
    name:         'ECU DE YAMAHA FZ 2.0',
    slug:         '6-ecu',
    description:  '',
    price:        35000000,
    stock:        0,
    images:       ["products/6-ECU/1","products/6-ECU/2","products/6-ECU/3","products/6-ECU/4"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '6-NSRA',
    name:         'CDI PULSAR 200 NS RACING',
    slug:         '6-nsra',
    description:  '',
    price:        24000000,
    stock:        1,
    images:       ["products/6-NSRA/1","products/6-NSRA/2","products/6-NSRA/3","products/6-NSRA/4"],
    isActive:     true,
    categorySlug: 'cdi',
    compatible:   [],
  },
  {
    sku:          '4-2756',
    name:         'BOBINA DE ALTA RACING',
    slug:         '4-2756',
    description:  '',
    price:        5500000,
    stock:        2,
    images:       ["products/4-2756/1","products/4-2756/2"],
    isActive:     true,
    categorySlug: 'bobinas',
    compatible:   [],
  },
  {
    sku:          '4-67700',
    name:         'BOBINA DE ALTA APACHE 160 4V',
    slug:         '4-67700',
    description:  '',
    price:        5900000,
    stock:        2,
    images:       ["products/4-67700/1","products/4-67700/2","products/4-67700/3"],
    isActive:     true,
    categorySlug: 'bobinas',
    compatible:   [],
  },
  {
    sku:          '4-B5H',
    name:         'BOBINA DE ALTA FZ 2.0-BWS FI',
    slug:         '4-b5h',
    description:  '',
    price:        7500000,
    stock:        2,
    images:       ["products/4-B5H/1","products/4-B5H/2","products/4-B5H/3"],
    isActive:     true,
    categorySlug: 'bobinas',
    compatible:   [],
  },
  {
    sku:          '8-32700',
    name:         'STATOR COMPLETO TVS 100',
    slug:         '8-32700',
    description:  '',
    price:        12000000,
    stock:        1,
    images:       ["products/8-32700/1","products/8-32700/2"],
    isActive:     true,
    categorySlug: 'estatores',
    compatible:   [],
  },
  {
    sku:          '9-02300',
    name:         'MOTOR ARRANQUE PULSAR 180 UG',
    slug:         '9-02300',
    description:  '',
    price:        14500000,
    stock:        1,
    images:       ["products/9-02300/1","products/9-02300/2","products/9-02300/3"],
    isActive:     true,
    categorySlug: 'motores-de-arranque',
    compatible:   [],
  },
  {
    sku:          '9-06200',
    name:         'MOTOR ARRANQUE GIXXER 150',
    slug:         '9-06200',
    description:  '',
    price:        15500000,
    stock:        1,
    images:       ["products/9-06200/1","products/9-06200/2","products/9-06200/3"],
    isActive:     true,
    categorySlug: 'motores-de-arranque',
    compatible:   [],
  },
  {
    sku:          '9-09060',
    name:         'MOTOR ARRANQUE CBF 150 - XR 150L',
    slug:         '9-09060',
    description:  '',
    price:        16900000,
    stock:        1,
    images:       ["products/9-09060/1","products/9-09060/2"],
    isActive:     true,
    categorySlug: 'motores-de-arranque',
    compatible:   [],
  },
  {
    sku:          '10-0008',
    name:         'RAMAL ELECTRICO DT 125-175  M.V 1994-95',
    slug:         '10-0008',
    description:  '',
    price:        13500000,
    stock:        1,
    images:       ["products/10-0008/1","products/10-0008/2","products/10-0008/3","products/10-0008/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-0023',
    name:         'RAMAL ELECTRICO LIBERO 125  2014-2018',
    slug:         '10-0023',
    description:  '',
    price:        14000000,
    stock:        1,
    images:       ["products/10-0023/1","products/10-0023/2","products/10-0023/3","products/10-0023/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-0030',
    name:         'RAMAL ELECTRICO RX 115 M.N 1997 -2000',
    slug:         '10-0030',
    description:  '',
    price:        9500000,
    stock:        1,
    images:       ["products/10-0030/1","products/10-0030/2","products/10-0030/3","products/10-0030/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-0041',
    name:         'RAMAL ELECTRICO XTZ 125 ESTARTER M. 2007-2012',
    slug:         '10-0041',
    description:  '',
    price:        15500000,
    stock:        1,
    images:       ["products/10-0041/1","products/10-0041/2","products/10-0041/3","products/10-0041/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-0053',
    name:         'RAMAL ELECTRICO XTZ 125 M.N 2018-2023',
    slug:         '10-0053',
    description:  '',
    price:        18000000,
    stock:        0,
    images:       ["products/10-0053/1","products/10-0053/2","products/10-0053/3","products/10-0053/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-0055',
    name:         'RAMAL ELECTRICO SZ 150 R 2016-2018',
    slug:         '10-0055',
    description:  '',
    price:        21500000,
    stock:        0,
    images:       ["products/10-0055/1","products/10-0055/2","products/10-0055/3","products/10-0055/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-1005',
    name:         'RAMAL ELECTRICO BEST 125 M. 2008-2016',
    slug:         '10-1005',
    description:  '',
    price:        21000000,
    stock:        1,
    images:       ["products/10-1005/1","products/10-1005/2","products/10-1005/3","products/10-1005/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-2001',
    name:         'RAMAL ELECTRICO HONDA BROSS NXR (STARTE) 2007-2011',
    slug:         '10-2001',
    description:  '',
    price:        19500000,
    stock:        1,
    images:       ["products/10-2001/1","products/10-2001/2","products/10-2001/3","products/10-2001/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '10-4031',
    name:         'RAMAL ELECTRICO PULSAR 180 II (2008-2009)',
    slug:         '10-4031',
    description:  '',
    price:        20800000,
    stock:        0,
    images:       ["products/10-4031/1","products/10-4031/2","products/10-4031/3","products/10-4031/4"],
    isActive:     true,
    categorySlug: 'ramales',
    compatible:   [],
  },
  {
    sku:          '7-R15V2',
    name:         'REGULADOR RECTIFICADOR YAMAHA R15 V2',
    slug:         '7-r15v2',
    description:  '',
    price:        15000000,
    stock:        0,
    images:       ["products/7-R15V2/1","products/7-R15V2/2","products/7-R15V2/3","products/7-R15V2/4"],
    isActive:     true,
    categorySlug: 'reguladores',
    compatible:   [],
  },
  {
    sku:          '7-RR160',
    name:         'REGULADOR RECTIFICADOR FZ 16 - SZ-R - FAZER (4 ENTRA)',
    slug:         '7-rr160',
    description:  '',
    price:        9500000,
    stock:        2,
    images:       ["products/7-RR160/1","products/7-RR160/2"],
    isActive:     true,
    categorySlug: 'reguladores',
    compatible:   [],
  },
  {
    sku:          '7-RR23',
    name:         'REGULADOR RECTIFICADOR HONDA CB 110',
    slug:         '7-rr23',
    description:  '',
    price:        8500000,
    stock:        1,
    images:       ["products/7-RR23/1","products/7-RR23/2","products/7-RR23/3","products/7-RR23/4"],
    isActive:     true,
    categorySlug: 'reguladores',
    compatible:   [],
  },
  {
    sku:          '7-RR35',
    name:         'REGULADOR RECTIFICADOR HONDA CBF 150',
    slug:         '7-rr35',
    description:  '',
    price:        8500000,
    stock:        1,
    images:       ["products/7-RR35/1","products/7-RR35/2","products/7-RR35/3","products/7-RR35/4"],
    isActive:     true,
    categorySlug: 'reguladores',
    compatible:   [],
  },
  {
    sku:          '7-RR98',
    name:         'REGULADOR RECTIFICADOR SUZUKI GSR600',
    slug:         '7-rr98',
    description:  '',
    price:        38000000,
    stock:        1,
    images:       ["products/7-RR98/1","products/7-RR98/2","products/7-RR98/3","products/7-RR98/4"],
    isActive:     true,
    categorySlug: 'reguladores',
    compatible:   [],
  },
  {
    sku:          '7-RR99',
    name:         'REGULADOR RECTIFICADOR HONDA NAVI',
    slug:         '7-rr99',
    description:  '',
    price:        8800000,
    stock:        1,
    images:       ["products/7-RR99/1","products/7-RR99/2","products/7-RR99/3","products/7-RR99/4"],
    isActive:     true,
    categorySlug: 'reguladores',
    compatible:   [],
  },
  {
    sku:          '14-15010',
    name:         'BOMBA DE GASOLINA FZ 2.0 - CRIPTON 115 FI',
    slug:         '14-15010',
    description:  '',
    price:        14500000,
    stock:        3,
    images:       ["products/14-15010/1","products/14-15010/2"],
    isActive:     true,
    categorySlug: 'sensores',
    compatible:   [],
  },
  {
    sku:          '16-TPSFZ',
    name:         'SENSOR HIBRIDO TPS FZ 2.0',
    slug:         '16-tpsfz',
    description:  '',
    price:        18000000,
    stock:        1,
    images:       ["products/16-TPSFZ/1","products/16-TPSFZ/2","products/16-TPSFZ/3","products/16-TPSFZ/4"],
    isActive:     true,
    categorySlug: 'sensores',
    compatible:   [],
  },
  {
    sku:          '15-L2261',
    name:         'LLANTA DUNLOP GT601 140-70-17',
    slug:         '15-l2261',
    description:  '',
    price:        28500000,
    stock:        1,
    images:       ["products/15-L2261/1"],
    isActive:     true,
    categorySlug: 'dunlop',
    compatible:   [],
  },
  {
    sku:          '15-L5098',
    name:         'LLANTA 2.75-18 KONTROL NKD',
    slug:         '15-l5098',
    description:  '',
    price:        8500000,
    stock:        2,
    images:       ["products/15-L5098/1"],
    isActive:     true,
    categorySlug: 'kontrol',
    compatible:   [],
  },
  {
    sku:          '15-L5104',
    name:         'LLANTA 3.00-18 KONTROL NKD',
    slug:         '15-l5104',
    description:  '',
    price:        8900000,
    stock:        2,
    images:       ["products/15-L5104/1"],
    isActive:     true,
    categorySlug: 'kontrol',
    compatible:   [],
  },
  {
    sku:          '15-S535',
    name:         'LLANTA 120-70-12 TL SKY 535',
    slug:         '15-s535',
    description:  '',
    price:        9600000,
    stock:        2,
    images:       ["products/15-S535/1","products/15-S535/2"],
    isActive:     true,
    categorySlug: 'sky',
    compatible:   [],
  },
  {
    sku:          '15-S5352',
    name:         'LLANTA 130-70-12 TL SKY535',
    slug:         '15-s5352',
    description:  '',
    price:        11000000,
    stock:        2,
    images:       ["products/15-S5352/1","products/15-S5352/2"],
    isActive:     true,
    categorySlug: 'sky',
    compatible:   [],
  },
  {
    sku:          '9-B8TC',
    name:         'BUJIAS EVOL IRIDIUM PATA LARGA',
    slug:         '9-b8tc',
    description:  '',
    price:        2000000,
    stock:        2,
    images:       ["products/9-B8TC/1","products/9-B8TC/2","products/9-B8TC/3","products/9-B8TC/4"],
    isActive:     true,
    categorySlug: 'bujias',
    compatible:   [],
  },

  // ── Placeholders — una entrada por subcategoría sin productos reales aún ──
  { sku: 'PH-OBJ-001',  name: 'Soporte de celular para manillar',     slug: 'ph-obj-001',  description: '', price: 3_500_000,  stock: 7,  images: [], isActive: true, categorySlug: 'objetivo',          compatible: [] },
]

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Cargando catálogo jerárquico...\n')

  // ── Limpieza de productos que ya no están en el seed ────────────────────────
  const currentSkus = PRODUCTS.map(p => p.sku)
  const toDelete = await prisma.product.findMany({
    where: { sku: { notIn: currentSkus } },
    select: { id: true },
  })
  if (toDelete.length > 0) {
    const ids = toDelete.map(p => p.id)
    // Borrar dependencias antes de borrar los productos
    await prisma.orderItem.deleteMany({ where: { productId: { in: ids } } })
    await prisma.motorcycleCompatibility.deleteMany({ where: { productId: { in: ids } } })
    const deleted = await prisma.product.deleteMany({ where: { id: { in: ids } } })
    console.log(`🗑  ${deleted.count} productos obsoletos eliminados\n`)
  }

  // ── Limpieza de categorías antiguas que ya no existen en la nueva estructura ──
  const OBSOLETE_SLUGS = [
    'arneses',
    'iluminacion',
    'filtros',
    'repuestos-motor-old',
  ]
  for (const slug of OBSOLETE_SLUGS) {
    const cat = await prisma.category.findUnique({ where: { slug } })
    if (cat) {
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
