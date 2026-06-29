import "dotenv/config";
import { PrismaClient, Role, OrderStatus, PaymentProvider, PaymentStatus } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ─── Admin user ───────────────────────────────────────────────────────────
  // Credenciales de acceso al panel de administración:
  //   Email:      admin@electromotos-tony.co
  //   Contraseña: Admin123!
  const adminPassword = await bcrypt.hash('Admin123!', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@electromotos-tony.co' },
    update: { password: adminPassword },
    create: {
      email: 'admin@electromotos-tony.co',
      name: 'Admin Tony',
      role: Role.ADMIN,
      password: adminPassword,
    },
  })

  // ─── Test customer ────────────────────────────────────────────────────────
  // Credenciales de prueba:
  //   Email:      cliente@ejemplo.co
  //   Contraseña: Cliente123!
  const customerPassword = await bcrypt.hash('Cliente123!', 12)
  const customer = await prisma.user.upsert({
    where: { email: 'cliente@ejemplo.co' },
    update: { password: customerPassword },
    create: {
      email: 'cliente@ejemplo.co',
      name: 'Carlos Pérez',
      role: Role.CUSTOMER,
      password: customerPassword,
    },
  })

  // ─── Categories ───────────────────────────────────────────────────────────
  const frenos = await prisma.category.upsert({
    where: { slug: 'frenos' },
    update: {},
    create: {
      name: 'Frenos',
      slug: 'frenos',
      description: 'Pastillas, discos y kits de frenos para motos',
    },
  })

  const sistemaElectrico = await prisma.category.upsert({
    where: { slug: 'sistema-electrico' },
    update: {},
    create: {
      name: 'Sistema Eléctrico',
      slug: 'sistema-electrico',
      description: 'Componentes eléctricos y electrónicos para motos',
    },
  })

  const motores = await prisma.category.upsert({
    where: { slug: 'motores' },
    update: { parentId: sistemaElectrico.id },
    create: {
      name: 'Motores',
      slug: 'motores',
      description: 'Repuestos de motor: pistones, anillos, cigüeñales',
      parentId: sistemaElectrico.id,
    },
  })

  const llantas = await prisma.category.upsert({
    where: { slug: 'llantas' },
    update: {},
    create: {
      name: 'Llantas',
      slug: 'llantas',
      description: 'Llantas y neumáticos para todo tipo de moto',
    },
  })

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = [
    // Frenos
    {
      name: 'Pastillas de freno Brembo Yamaha FZ25',
      slug: 'pastillas-freno-brembo-yamaha-fz25',
      description:
        'Pastillas de freno originales Brembo para Yamaha FZ25. Alta resistencia al calor y larga durabilidad. Desgaste progresivo para mayor seguridad.',
      price: 8500000, // $85.000 COP
      stock: 25,
      sku: 'FRE-BRE-FZ25-001',
      images: [],
      isActive: true,
      categoryId: frenos.id,
      compatible: [
        { brand: 'Yamaha', model: 'FZ25', year: 2020 },
        { brand: 'Yamaha', model: 'FZ25', year: 2021 },
        { brand: 'Yamaha', model: 'FZ25', year: 2022 },
      ],
    },
    {
      name: 'Disco de freno delantero Honda CB150',
      slug: 'disco-freno-delantero-honda-cb150',
      description:
        'Disco de freno delantero de alta calidad para Honda CB150. Acero inoxidable, diseño ventilado para mejor disipación de calor.',
      price: 19500000, // $195.000 COP
      stock: 15,
      sku: 'FRE-DIS-CB150-002',
      images: [],
      isActive: true,
      categoryId: frenos.id,
      compatible: [
        { brand: 'Honda', model: 'CB150', year: 2019 },
        { brand: 'Honda', model: 'CB150', year: 2020 },
        { brand: 'Honda', model: 'CB150', year: 2021 },
      ],
    },
    {
      name: 'Kit freno trasero AKT 125',
      slug: 'kit-freno-trasero-akt-125',
      description:
        'Kit completo de freno trasero para AKT 125. Incluye zapatas, resortes y pasadores. Fácil instalación.',
      price: 12000000, // $120.000 COP
      stock: 30,
      sku: 'FRE-KIT-AKT125-003',
      images: [],
      isActive: true,
      categoryId: frenos.id,
      compatible: [
        { brand: 'AKT', model: 'TT125', year: 2020 },
        { brand: 'AKT', model: 'NKD125', year: 2021 },
      ],
    },
    // Motores (hijo de Sistema Eléctrico)
    {
      name: 'Pistón completo Yamaha YBR 125',
      slug: 'piston-completo-yamaha-ybr125',
      description:
        'Pistón completo con anillos para Yamaha YBR 125. Aluminio de alta resistencia, medidas estándar. Incluye pasador y seguros.',
      price: 35000000, // $350.000 COP
      stock: 10,
      sku: 'MOT-PIS-YBR125-001',
      images: [],
      isActive: true,
      categoryId: motores.id,
      compatible: [{ brand: 'Yamaha', model: 'YBR125', year: 2018 }],
    },
    {
      name: 'Anillos motor Honda Wave 110',
      slug: 'anillos-motor-honda-wave-110',
      description:
        'Juego de anillos de motor para Honda Wave 110. Cromo duro, alta resistencia al desgaste. Medida estándar 50mm.',
      price: 18000000, // $180.000 COP
      stock: 20,
      sku: 'MOT-ANI-WAV110-002',
      images: [],
      isActive: true,
      categoryId: motores.id,
      compatible: [
        { brand: 'Honda', model: 'Wave 110', year: 2019 },
        { brand: 'Honda', model: 'Wave 110', year: 2020 },
      ],
    },
    {
      name: 'Cigüeñal Bajaj Boxer 150',
      slug: 'ciguenal-bajaj-boxer-150',
      description:
        'Cigüeñal completo con rodamientos para Bajaj Boxer 150. Balanceado de fábrica. Garantía de 6 meses.',
      price: 85000000, // $850.000 COP
      stock: 5,
      sku: 'MOT-CIG-BOX150-003',
      images: [],
      isActive: true,
      categoryId: motores.id,
      compatible: [{ brand: 'Bajaj', model: 'Boxer 150', year: 2020 }],
    },
    {
      name: 'Filtro de aceite Honda CBR 150',
      slug: 'filtro-aceite-honda-cbr150',
      description:
        'Filtro de aceite original para Honda CBR 150. Alta capacidad de filtración. Recomendado cambio cada 3.000 km.',
      price: 2500000, // $25.000 COP
      stock: 50,
      sku: 'MOT-FIL-CBR150-004',
      images: [],
      isActive: true,
      categoryId: motores.id,
      compatible: [
        { brand: 'Honda', model: 'CBR150R', year: 2020 },
        { brand: 'Honda', model: 'CBR150R', year: 2021 },
        { brand: 'Honda', model: 'CBR150R', year: 2022 },
      ],
    },
    // Llantas
    {
      name: 'Llanta delantera Pirelli 100/90-18',
      slug: 'llanta-delantera-pirelli-100-90-18',
      description:
        'Llanta delantera Pirelli Sport Demon 100/90-18. Excelente agarre en pavimento seco y mojado. Diseño sport de alto rendimiento.',
      price: 12500000, // $125.000 COP  — typo intencional para ver en UI si precio tiene decimales
      stock: 12,
      sku: 'LLA-PIR-100-90-18-001',
      images: [],
      isActive: true,
      categoryId: llantas.id,
      compatible: [],
    },
    {
      name: 'Llanta trasera Michelin 120/80-17',
      slug: 'llanta-trasera-michelin-120-80-17',
      description:
        'Llanta trasera Michelin Pilot Street 120/80-17. Compuesto de goma de larga duración. Ideal para uso urbano y carretera.',
      price: 15800000, // $158.000 COP
      stock: 8,
      sku: 'LLA-MIC-120-80-17-002',
      images: [],
      isActive: true,
      categoryId: llantas.id,
      compatible: [],
    },
    {
      name: 'Llanta todo terreno Maxxis 90/90-21',
      slug: 'llanta-todo-terreno-maxxis-90-90-21',
      description:
        'Llanta Maxxis Enduro 90/90-21 para uso mixto. Taco profundo para terrenos difíciles. Estructura reforzada anti-pinchazos.',
      price: 22000000, // $220.000 COP
      stock: 3,
      sku: 'LLA-MAX-90-90-21-003',
      images: [],
      isActive: true,
      categoryId: llantas.id,
      compatible: [],
    },
  ]

  for (const { compatible, ...productData } of products) {
    const product = await prisma.product.upsert({
      where: { sku: productData.sku },
      update: {},
      create: {
        ...productData,
        compatible: {
          create: compatible,
        },
      },
    })
    console.log(`✓ Producto: ${product.name}`)
  }

  // ─── Settings ─────────────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { key: 'MERCADOPAGO_ENABLED' },
    update: {},
    create: { key: 'MERCADOPAGO_ENABLED', value: 'false' },
  })
  await prisma.settings.upsert({
    where: { key: 'COD_ENABLED' },
    update: {},
    create: { key: 'COD_ENABLED', value: 'true' },
  })

  // ─── Sample orders ────────────────────────────────────────────────────────
  const product1 = await prisma.product.findUnique({ where: { sku: 'FRE-BRE-FZ25-001' } })
  const product2 = await prisma.product.findUnique({ where: { sku: 'LLA-PIR-100-90-18-001' } })

  if (product1 && product2) {
    // Orden pagada
    const paidOrder = await prisma.order.create({
      data: {
        userId: customer.id,
        status: OrderStatus.PAID,
        total: product1.price + product2.price,
        paymentProvider: PaymentProvider.WOMPI,
        shippingAddress: {
          fullName: 'Carlos Pérez',
          address: 'Calle 45 # 23-10, Apto 302',
          city: 'Medellín',
          department: 'Antioquia',
          phone: '3001234567',
        },
        items: {
          create: [
            { productId: product1.id, quantity: 1, priceAtPurchase: product1.price },
            { productId: product2.id, quantity: 1, priceAtPurchase: product2.price },
          ],
        },
        payment: {
          create: {
            provider: PaymentProvider.WOMPI,
            externalId: 'WOMPI-TEST-123456',
            status: PaymentStatus.APPROVED,
            amount: product1.price + product2.price,
          },
        },
      },
    })
    console.log(`✓ Orden pagada: ${paidOrder.id}`)

    // Orden pendiente
    const pendingOrder = await prisma.order.create({
      data: {
        userId: customer.id,
        status: OrderStatus.PENDING,
        total: product2.price * 2,
        paymentProvider: PaymentProvider.WOMPI,
        shippingAddress: {
          fullName: 'Carlos Pérez',
          address: 'Calle 45 # 23-10, Apto 302',
          city: 'Medellín',
          department: 'Antioquia',
          phone: '3001234567',
        },
        items: {
          create: [
            { productId: product2.id, quantity: 2, priceAtPurchase: product2.price },
          ],
        },
        payment: {
          create: {
            provider: PaymentProvider.WOMPI,
            status: PaymentStatus.PENDING,
            amount: product2.price * 2,
          },
        },
      },
    })
    console.log(`✓ Orden pendiente: ${pendingOrder.id}`)
  }

  console.log('\n✅ Seed completado')
  console.log('\n─── Credenciales de acceso ───────────────────────')
  console.log(`  Admin:`)
  console.log(`    Email:      ${admin.email}`)
  console.log(`    Contraseña: Admin123!`)
  console.log(`    Panel:      /admin`)
  console.log(`  Cliente de prueba:`)
  console.log(`    Email:      ${customer.email}`)
  console.log(`    Contraseña: Cliente123!`)
  console.log('──────────────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
