/**
 * Feed de Google Merchant Center (docs/seo/, Fase 7). Lee el catálogo con
 * Prisma y delega en `buildMerchantFeed` (dominio) la decisión de qué entra.
 * Lo usan la ruta `/feeds/google-merchant.xml` y el panel `/admin/merchant`.
 */
import { prisma } from '@/infrastructure/database/prisma-client'
import { buildMerchantFeed, type MerchantFeedItem, type MerchantFeedReport } from '@h2r/domain'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { SITE_URL } from '@/lib/seo'

export const MERCHANT_FEED_PATH = '/feeds/google-merchant.xml'

/**
 * Imagen para el feed: 900 px y JPEG explícito. `f_auto` sirve AVIF/WebP según
 * el navegador, y el rastreador de Merchant Center no siempre los acepta.
 */
const feedImage = (src: string) => cloudinaryUrl(src, 'detail').replace('f_auto', 'f_jpg')

export async function loadMerchantFeed(): Promise<MerchantFeedReport> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    select: {
      sku: true, name: true, slug: true, description: true, price: true, compareAtPrice: true, stock: true,
      images: true, isActive: true, deletedAt: true, partBrand: true, mpn: true,
      category: { select: { slug: true, name: true, parent: { select: { slug: true, name: true } } } },
      fitments: {
        where: { verified: true, model: { isActive: true } },
        orderBy: { createdAt: 'asc' },
        select: { model: { select: { name: true, cc: true, brand: { select: { name: true } } } } },
      },
    },
  })

  return buildMerchantFeed(
    products.map((p) => ({
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      description: p.description ?? '',
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      imageUrls: p.images.filter((i) => i && i.trim()).map(feedImage).filter(Boolean),
      isActive: p.isActive,
      deleted: p.deletedAt !== null,
      category: { slug: p.category.slug, name: p.category.name },
      parentCategory: p.category.parent,
      partBrand: p.partBrand,
      mpn: p.mpn,
      fitments: p.fitments.map((f) => ({ brandName: f.model.brand.name, modelName: f.model.name, cc: f.model.cc })),
    })),
    SITE_URL,
  )
}

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const tag = (name: string, value: string | number | null | undefined) =>
  value === null || value === undefined || value === '' ? '' : `      <g:${name}>${escapeXml(String(value))}</g:${name}>\n`

/** RSS 2.0 con el espacio de nombres `g:` de Google (formato estándar de Merchant Center). */
export function merchantFeedXml(items: MerchantFeedItem[]): string {
  const body = items
    .map(
      (i) =>
        '    <item>\n' +
        tag('id', i.id) +
        tag('title', i.title) +
        tag('description', i.description) +
        tag('link', i.link) +
        tag('image_link', i.imageLink) +
        i.additionalImageLinks.map((url) => tag('additional_image_link', url)).join('') +
        tag('availability', i.availability) +
        tag('price', i.price) +
        tag('sale_price', i.salePrice) +
        tag('condition', i.condition) +
        tag('brand', i.brand) +
        tag('mpn', i.mpn) +
        (i.identifierExists ? '' : tag('identifier_exists', 'no')) +
        tag('google_product_category', i.googleProductCategory) +
        tag('product_type', i.productType) +
        '    </item>',
    )
    .join('\n')

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    '  <channel>\n' +
    '    <title>H2R Online Store</title>\n' +
    `    <link>${escapeXml(SITE_URL)}</link>\n` +
    '    <description>Repuestos y accesorios para moto con envío a toda Colombia</description>\n' +
    (body ? `${body}\n` : '') +
    '  </channel>\n' +
    '</rss>\n'
  )
}
