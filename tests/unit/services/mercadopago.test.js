// tests/unit/services/mercadopago.test.js
// verificarFirmaWebhook es una funcion pura exportada: no requiere DB ni red.
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import crypto from "crypto";
import { verificarFirmaWebhook } from "../../../services/mercadopago.js";

const SECRET = "test_webhook_secret";

const firmar = (dataId, ts, requestId, secret = SECRET) => {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
};

describe("verificarFirmaWebhook", () => {
  const originalSecret = process.env.MP_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.MP_WEBHOOK_SECRET = SECRET;
  });

  afterEach(() => {
    process.env.MP_WEBHOOK_SECRET = originalSecret;
  });

  it("acepta una firma valida", () => {
    const ts = "1704908010";
    const requestId = "req-123";
    const dataId = "987654321";
    const v1 = firmar(dataId, ts, requestId);
    const xSignature = `ts=${ts},v1=${v1}`;

    expect(verificarFirmaWebhook(dataId, xSignature, requestId)).toBe(true);
  });

  it("rechaza una firma invalida", () => {
    const xSignature = "ts=1704908010,v1=firmaFalsa";
    expect(verificarFirmaWebhook("987654321", xSignature, "req-123")).toBe(false);
  });

  it("rechaza si falta el header x-signature", () => {
    expect(verificarFirmaWebhook("987654321", undefined, "req-123")).toBe(false);
  });

  it("rechaza si falta el header x-request-id", () => {
    const ts = "1704908010";
    const v1 = firmar("987654321", ts, "req-123");
    expect(verificarFirmaWebhook("987654321", `ts=${ts},v1=${v1}`, undefined)).toBe(false);
  });

  it("rechaza si falta el dataId", () => {
    const ts = "1704908010";
    const v1 = firmar("987654321", ts, "req-123");
    expect(verificarFirmaWebhook(undefined, `ts=${ts},v1=${v1}`, "req-123")).toBe(false);
  });

  it("permite el webhook sin verificar si no hay MP_WEBHOOK_SECRET configurado (compatibilidad)", () => {
    delete process.env.MP_WEBHOOK_SECRET;
    expect(verificarFirmaWebhook("987654321", "ts=1,v1=loquesea", "req-123")).toBe(true);
  });
});
