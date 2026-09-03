import { createHash } from "node:crypto";
import prisma from "../lib/prisma.js";

const purchaseInFlight = new Set();
const normalize = (value) => String(value || "").trim().toLowerCase();
const hash = (value) => {
  const normalized = normalize(value);
  return normalized ? createHash("sha256").update(normalized).digest("hex") : null;
};
const hashPhone = (value) => {
  const normalized = String(value || "").replace(/\D/g, "");
  return normalized ? createHash("sha256").update(normalized).digest("hex") : null;
};

export const sendMetaPurchaseSafely = async (orderId) => {
  if (!orderId || purchaseInFlight.has(orderId)) return false;
  purchaseInFlight.add(orderId);

  try {
    const settings = await prisma.platformSetting.findUnique({
      where: { id: "GLOBAL" },
      select: {
        metaTrackingEnabled: true,
        metaPixelId: true,
        metaCapiAccessToken: true,
        metaTestEventCode: true,
      },
    });

    if (!settings?.metaTrackingEnabled || !settings.metaPixelId || !settings.metaCapiAccessToken) {
      return false;
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, orderStatus: "COMPLETED", metaPurchaseSentAt: null },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        phone: true,
        user: { select: { id: true, email: true, phone: true } },
        items: {
          select: {
            productId: true,
            quantity: true,
            price: true,
          },
        },
      },
    });

    if (!order) return false;

    const em = hash(order.user?.email);
    const ph = hashPhone(order.phone || order.user?.phone);
    const externalId = hash(order.user?.id);
    const userData = Object.fromEntries(
      Object.entries({
        em: em ? [em] : undefined,
        ph: ph ? [ph] : undefined,
        external_id: externalId ? [externalId] : undefined,
      }).filter(([, value]) => value)
    );

    const payload = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: "order-" + order.id,
        action_source: "website",
        user_data: userData,
        custom_data: {
          currency: "BDT",
          value: Number(order.totalAmount),
          order_id: order.orderNumber,
          content_type: "product",
          content_ids: order.items.map((item) => item.productId),
          contents: order.items.map((item) => ({
            id: item.productId,
            quantity: item.quantity,
            item_price: Number(item.price),
          })),
        },
      }],
      access_token: settings.metaCapiAccessToken,
      ...(settings.metaTestEventCode ? { test_event_code: settings.metaTestEventCode } : {}),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let response;

    try {
      response = await fetch(
        "https://graph.facebook.com/" + encodeURIComponent(settings.metaPixelId) + "/events",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await response.json().catch(() => null);
    if (!response.ok || Number(responseBody?.events_received || 0) < 1) {
      console.error("Meta Purchase delivery failed for order " + order.id + " (HTTP " + response.status + ")");
      return false;
    }

    await prisma.order.updateMany({
      where: { id: order.id, orderStatus: "COMPLETED", metaPurchaseSentAt: null },
      data: { metaPurchaseSentAt: new Date() },
    });

    return true;
  } catch (error) {
    const reason = error?.name === "AbortError" ? "timeout" : "request error";
    console.error("Meta Purchase delivery failed for order " + orderId + " (" + reason + ")");
    return false;
  } finally {
    purchaseInFlight.delete(orderId);
  }
};