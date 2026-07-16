import type { Order, OrderItem, Product, StockAudit } from "@prisma/client";

/**
 * Prisma returns `Decimal` for numeric(10,2) columns. The old Mongo/Mongoose
 * API always sent plain JS numbers over the wire, and the React client does
 * things like `p.price.toFixed(2)` — so we convert Decimal -> number here to
 * keep the JSON contract identical to the old API.
 */

export function serializeProduct(p: Product) {
  return {
    id: p.id,
    title: p.title,
    variantName: p.variantName ?? "",
    brand: p.brand ?? "",
    category: p.category ?? "",
    packLabel: p.packLabel ?? "",
    pcs: p.pcs ?? undefined,
    sizeMl: p.sizeMl ?? undefined,
    price: Number(p.price),
    imageUrl: p.imageUrl ?? "",
    stockQty: p.stockQty,
    // Derived, not stored — the shopper-facing "is this orderable" flag.
    inStock: p.stockQty > 0,
    tag: p.tag ?? "",
    groupId: p.groupId ?? "",
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function serializeOrder(o: Order & { items: OrderItem[] }) {
  return {
    id: o.id,
    customer: {
      name: o.customerName,
      phone: o.customerPhone,
      address: o.customerAddress,
      note: o.customerNote ?? "",
    },
    items: o.items.map((i) => ({
      productId: i.productId,
      title: i.title,
      variantName: i.variantName ?? "",
      price: Number(i.price),
      qty: i.qty,
    })),
    total: Number(o.total),
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export function serializeStockAudit(a: StockAudit & { product?: Product | null }) {
  return {
    id: a.id,
    productId: a.productId,
    productTitle: a.product?.title,
    systemQty: a.systemQty,
    countedQty: a.countedQty,
    difference: a.difference,
    note: a.note ?? "",
    createdAt: a.createdAt,
  };
}
