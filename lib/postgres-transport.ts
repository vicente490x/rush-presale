import { createConnection } from 'node:net';
import { connect, type TLSSocket } from 'node:tls';

// PostgreSQL SSLRequest, then a verified TLS handshake. No credentials or SQL
// are sent. pg_stat_ssl alone cannot observe TLS terminated by a provider proxy.
export function verifyPostgresTransport(value: string, timeoutMs = 8000): Promise<{ certificateVerified: true; protocol: string }> {
  let address: URL;
  try {
    address = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(address.protocol) || !address.hostname) throw new Error();
  } catch { return Promise.reject(new Error('DATABASE_TLS_CHECK_FAILED')); }
  return new Promise((resolve, reject) => {
    const plain = createConnection({ host: address.hostname, port: Number(address.port || 5432) });
    let secure: TLSSocket | undefined;
    let settled = false;
    const timer = setTimeout(fail, timeoutMs);
    function fail() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      secure?.destroy(); plain.destroy();
      reject(new Error('DATABASE_TLS_CHECK_FAILED'));
    }
    plain.once('error', fail);
    plain.once('close', fail);
    plain.once('connect', () => {
      const request = Buffer.alloc(8);
      request.writeInt32BE(8, 0);
      request.writeInt32BE(80877103, 4);
      plain.write(request);
    });
    plain.once('data', reply => {
      if (reply.length !== 1 || reply[0] !== 83) { fail(); return; }
      secure = connect({ socket: plain, servername: address.hostname, minVersion: 'TLSv1.2', rejectUnauthorized: true });
      secure.once('error', fail);
      secure.once('secureConnect', () => {
        const protocol = secure!.getProtocol();
        if (!secure!.authorized || !protocol || !['TLSv1.2', 'TLSv1.3'].includes(protocol)) { fail(); return; }
        settled = true;
        clearTimeout(timer);
        secure!.destroy();
        resolve({ certificateVerified: true, protocol });
      });
    });
  });
}
