import { notFound } from 'next/navigation'
import { PrismaProductRepository } from '@/infrastructure/repositories/PrismaProductRepository'
import { prisma } from '@/infrastructure/database/prisma-client'
import { ProductEditForm } from '@/components/admin/ProductEditForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params
  const repo = new PrismaProductRepository()
  const product = id === 'nuevo'
    ? null
    : await repo.findBySku(id) ?? await repo.findBySlug(id)

  // Also try by ID directly
  let foundProduct = product
  if (!foundProduct && id !== 'nuevo') {
    const raw = await prisma.product.findUnique({
      where: { id },
      include: { compatible: true },
    })
    if (!raw) notFound()
    foundProduct = {
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      price: raw.price,
      stock: raw.stock,
      sku: raw.sku,
      images: raw.images,
      isActive: raw.isActive,
      categoryId: raw.categoryId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      compatible: raw.compatible,
    }
  }

  const categories = await prisma.category.findMany()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {foundProduct ? `Editar: ${foundProduct.name}` : 'Nuevo producto'}
      </h1>
      <ProductEditForm product={foundProduct ?? undefined} categories={categories} />
    </div>
  )
}
