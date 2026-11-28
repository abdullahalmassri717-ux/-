import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, createPublicKey, verify } from 'node:crypto';
import * as wp from '../../supabase/functions/_shared/webpush.ts';
import { timeAgo } from '../../src/lib/timeAgo.ts';

test('VAPID header is a valid ES256 token for the push service origin', async () => {
  const keys = await wp.generateVapidKeys();
  const h = await wp.vapidAuthorization('https://web.push.apple.com/abc', keys, 'https://dequa.study');
  const m = h.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.ok(m);
  const [head, payload, sig] = m[1].split('.');
  const claims = JSON.parse(Buffer.from(wp.b64urlDecode(payload)).toString());
  assert.equal(claims.aud, 'https://web.push.apple.com');
  assert.equal(wp.b64urlDecode(m[2]).length, 65);
  const pub = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: keys.privateJwk.x, y: keys.privateJwk.y }, format: 'jwk' });
  assert.ok(verify('sha256', Buffer.from(`${head}.${payload}`), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(wp.b64urlDecode(sig))));
});

test('encrypted message has the aes128gcm header (salt, record size, sender key)', async () => {
  const ua = createECDH('prime256v1');
  ua.generateKeys();
  const target = { endpoint: 'https://x.example/1', p256dh: wp.b64urlEncode(ua.getPublicKey()), auth: wp.b64urlEncode(new Uint8Array(16).fill(7)) };
  const out = await wp.encryptPayload(target, new TextEncoder().encode('مرحبا'));
  assert.equal(new DataView(out.buffer).getUint32(16), 4096);
  assert.equal(out[20], 65);
  assert.equal(out.length, 16 + 4 + 1 + 65 + new TextEncoder().encode('مرحبا').length + 1 + 16);
});

test('timeAgo speaks Arabic', () => {
  const now = Date.parse('2026-11-28T12:00:00Z');
  assert.equal(timeAgo('2026-11-28T11:59:50Z', now), 'الآن');
  assert.equal(timeAgo('2026-11-28T10:00:00Z', now), 'منذ ساعتين');
  assert.equal(timeAgo('2026-11-27T12:00:00Z', now), 'أمس');
});
