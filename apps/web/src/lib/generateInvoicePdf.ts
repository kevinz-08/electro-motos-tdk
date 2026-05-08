import type { OrderHistoryEntry } from './queries/getOrderHistory'

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

/** Genera y descarga un PDF de factura para el pedido dado. Solo se ejecuta en el browser. */
export async function generateInvoicePdf(order: OrderHistoryEntry): Promise<void> {
  const { jsPDF } = await import('jspdf')

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const PAGE_W = 210
  const MARGIN = 18
  const COL_W = PAGE_W - MARGIN * 2

  // ─── Paleta ───────────────────────────────────────────────────────────────
  const BLACK = [15, 23, 42] as const      // slate-900
  const GRAY  = [100, 116, 139] as const   // slate-500
  const LIGHT = [241, 245, 249] as const   // slate-100
  const ACCENT = [14, 165, 233] as const   // sky-500
  const WHITE  = [255, 255, 255] as const

  const shortId = order.id.slice(-8).toUpperCase()

  let y = MARGIN

  // ─── Header ───────────────────────────────────────────────────────────────
  doc.setFillColor(...BLACK)
  doc.roundedRect(MARGIN, y, COL_W, 22, 3, 3, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...WHITE)
  doc.text('Electro Motos Tony', MARGIN + 6, y + 9)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184) // slate-400
  doc.text('Accesorios y repuestos para motos', MARGIN + 6, y + 15)

  // Número de factura (esquina derecha)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...WHITE)
  doc.text(`FACTURA #${shortId}`, PAGE_W - MARGIN - 6, y + 9, { align: 'right' })

  y += 28

  // ─── Fecha y estado ───────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text(`Fecha: ${formatDate(order.createdAt)}`, MARGIN, y)
  doc.text(`Estado: ${order.status}`, PAGE_W - MARGIN, y, { align: 'right' })

  y += 5

  // Línea separadora
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)

  y += 7

  // ─── Datos de envío ───────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.roundedRect(MARGIN, y, COL_W, 13, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text('DATOS DE ENVÍO', MARGIN + 4, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...BLACK)
  doc.text(
    `${order.shippingCity}, ${order.shippingDepartment}`,
    MARGIN + 4,
    y + 10,
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  doc.text(`Método de pago: ${order.paymentProvider}`, PAGE_W - MARGIN - 4, y + 10, { align: 'right' })

  y += 20

  // ─── Tabla de productos ───────────────────────────────────────────────────
  // Cabecera
  doc.setFillColor(...BLACK)
  doc.rect(MARGIN, y, COL_W, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...WHITE)

  const COL = {
    product: MARGIN + 4,
    qty:     MARGIN + 112,
    price:   MARGIN + 135,
    total:   PAGE_W - MARGIN - 4,
  }

  doc.text('PRODUCTO', COL.product, y + 5.5)
  doc.text('CANT.', COL.qty, y + 5.5)
  doc.text('P. UNIT.', COL.price, y + 5.5)
  doc.text('SUBTOTAL', COL.total, y + 5.5, { align: 'right' })

  y += 8

  // Filas
  order.items.forEach((item, i) => {
    const rowH = 10
    const isEven = i % 2 === 0

    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252)
    doc.rect(MARGIN, y, COL_W, rowH, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...BLACK)

    // Truncar nombre largo para que no desborde la columna
    const maxNameWidth = 105
    const name = doc.splitTextToSize(item.productName, maxNameWidth)[0] as string

    doc.text(name, COL.product, y + 6.5)

    doc.text(String(item.quantity), COL.qty, y + 6.5)

    doc.setTextColor(...GRAY)
    doc.text(formatCOP(item.priceAtPurchase), COL.price, y + 6.5)

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...BLACK)
    doc.text(formatCOP(item.quantity * item.priceAtPurchase), COL.total, y + 6.5, { align: 'right' })

    // Separador sutil
    doc.setDrawColor(226, 232, 240) // slate-200
    doc.setLineWidth(0.2)
    doc.line(MARGIN, y + rowH, PAGE_W - MARGIN, y + rowH)

    y += rowH
  })

  y += 4

  // ─── Total ────────────────────────────────────────────────────────────────
  doc.setFillColor(...ACCENT)
  doc.roundedRect(PAGE_W - MARGIN - 60, y, 60, 12, 2, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHITE)
  doc.text('TOTAL', PAGE_W - MARGIN - 56, y + 5)
  doc.setFontSize(10)
  doc.text(formatCOP(order.total), PAGE_W - MARGIN - 4, y + 8, { align: 'right' })

  y += 20

  // ─── Footer ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...LIGHT)
  doc.setLineWidth(0.4)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)

  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Electro Motos Tony · soporte@electromotos-tony.co', PAGE_W / 2, y, { align: 'center' })
  doc.text('Este documento es una representación impresa de la factura electrónica.', PAGE_W / 2, y + 4, { align: 'center' })

  doc.save(`factura-${shortId}.pdf`)
}
