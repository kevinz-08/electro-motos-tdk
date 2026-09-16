/**
 * /resena/[orderItemId]?token=… — "Califica tu compra" (README §22.6).
 *
 * Llega desde el correo que programa ReviewRequestService. El token firmado prueba la
 * compra (sirve para invitados, sin sesión). Esta página valida el token y el estado para
 * dar feedback inmediato; la API vuelve a validar todo al enviar.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { prisma } from '@/infrastructure/database/prisma-client'
import { verifyReviewToken } from '@/lib/order-access-token'
import { cloudinaryUrl } from '@/lib/cloudinary'
import { ReviewForm } from '@/components/store/ReviewForm'

export const metadata: Metadata = {
  title: 'Califica tu compra',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ orderItemId: string }>
  searchParams: Promise<{ token?: string }>
}

function Message({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-500 mb-6">{body}</p>
        <Link href="/catalogo" className="inline-block bg-sky-400 text-black px-6 py-3 rounded-xl font-bold hover:bg-sky-500 transition-colors">
          Ir a la tienda
        </Link>
      </div>
    </div>
  )
}

export default async function ReviewPage({ params, searchParams }: PageProps) {
  const { orderItemId } = await params
  const { token } = await searchParams

  if (!verifyReviewToken(orderItemId, token)) {
    return <Message icon="🔒" title="Enlace no válido" body="Usa el enlace del correo que te enviamos para calificar tu compra." />
  }

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      order: { select: { status: true } },
      review: { select: { id: true } },
      product: { select: { name: true, slug: true, images: true } },
    },
  })

  if (!item) {
    return <Message icon="🔍" title="Producto no encontrado" body="No encontramos este producto en tus pedidos." />
  }
  if (item.review) {
    return <Message icon="🙌" title="¡Ya calificaste este producto!" body="Gracias por ayudar a otros motociclistas a elegir mejor." />
  }
  if (item.order.status !== 'DELIVERED') {
    return <Message icon="📦" title="Aún no puedes calificar" body="Podrás calificar el producto cuando tu pedido sea entregado." />
  }

  const image = item.product.images[0]

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2">Compra verificada</p>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">¿Qué tal tu compra?</h1>
      <div className="flex items-center gap-4 mb-8 border border-gray-200 rounded-xl p-4">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cloudinaryUrl(image, 'thumbnail')} alt="" className="w-16 h-16 object-contain rounded-lg bg-gray-50" />
        )}
        <Link href={`/producto/${item.product.slug}`} className="text-sm font-semibold text-gray-900 hover:text-sky-600">
          {item.product.name}
        </Link>
      </div>
      <ReviewForm orderItemId={orderItemId} token={token!} />
    </div>
  )
}
