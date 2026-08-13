import * as http from 'http';
import * as net from 'net';
import { SsrfEgressProxy } from './ssrf-egress-proxy';

/**
 * Hostname the partial mock below resolves to loopback and reports as
 * "public", so the positive paths can talk to in-test servers. Every other
 * input goes through the REAL url-safety logic, keeping the negative tests
 * honest.
 */
const TEST_PUBLIC_HOST = 'egress-proxy-positive.test';

vi.mock('./url-safety.util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./url-safety.util')>();
  return {
    ...actual,
    resolveAndAssertPublic: async (hostname: string): Promise<string[]> => {
      if (hostname === TEST_PUBLIC_HOST) {
        return ['127.0.0.1'];
      }
      return actual.resolveAndAssertPublic(hostname);
    },
  };
});

/** Open a raw TCP connection to the proxy, send `payload`, return everything until close. */
function rawExchange(port: number, payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(payload);
    });
    let received = '';
    socket.on('data', (chunk) => {
      received += chunk.toString('utf8');
    });
    socket.on('close', () => resolve(received));
    socket.on('error', reject);
    socket.setTimeout(5_000, () => {
      socket.destroy();
      resolve(received);
    });
  });
}

describe('SsrfEgressProxy (Unit)', () => {
  let proxy: SsrfEgressProxy;
  let proxyPort: number;

  afterEach(async () => {
    await proxy.close();
  });

  describe('policy enforcement (default ports)', () => {
    beforeEach(async () => {
      proxy = new SsrfEgressProxy();
      proxyPort = await proxy.start();
    });

    it('start() is idempotent and returns the same port', async () => {
      await expect(proxy.start()).resolves.toBe(proxyPort);
    });

    it('refuses CONNECT to a loopback literal', async () => {
      const response = await rawExchange(
        proxyPort,
        'CONNECT 127.0.0.1:443 HTTP/1.1\r\nHost: 127.0.0.1:443\r\n\r\n',
      );
      expect(response).toContain('403');
    });

    it('refuses CONNECT to a bracketed IPv6 loopback literal', async () => {
      const response = await rawExchange(
        proxyPort,
        'CONNECT [::1]:443 HTTP/1.1\r\nHost: [::1]:443\r\n\r\n',
      );
      expect(response).toContain('403');
    });

    it('refuses a disallowed port before any DNS resolution', async () => {
      const response = await rawExchange(
        proxyPort,
        'CONNECT example.invalid:25 HTTP/1.1\r\nHost: example.invalid:25\r\n\r\n',
      );
      expect(response).toContain('403');
    });

    it('refuses an absolute-form GET to the cloud metadata address', async () => {
      const response = await rawExchange(
        proxyPort,
        'GET http://169.254.169.254/latest/meta-data/ HTTP/1.1\r\nHost: 169.254.169.254\r\n\r\n',
      );
      expect(response).toContain('403');
    });

    it('refuses origin-form (non-proxy) requests', async () => {
      const response = await rawExchange(proxyPort, 'GET / HTTP/1.1\r\nHost: whatever\r\n\r\n');
      expect(response).toContain('403');
    });
  });

  describe('validated traffic passes (test port allow-list)', () => {
    let upstream: http.Server;
    let upstreamPort: number;

    beforeEach(async () => {
      upstream = http.createServer((req, res) => {
        res.writeHead(200, { 'content-type': 'text/plain' });
        res.end(`host=${req.headers.host ?? ''}`);
      });
      await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
      const address = upstream.address();
      if (!address || typeof address === 'string') throw new Error('no upstream port');
      upstreamPort = address.port;

      proxy = new SsrfEgressProxy({ allowedPorts: new Set([upstreamPort]) });
      proxyPort = await proxy.start();
    });

    afterEach(async () => {
      await new Promise<void>((resolve) => upstream.close(() => resolve()));
    });

    it('proxies an absolute-form GET to a validated host, preserving Host', async () => {
      const response = await rawExchange(
        proxyPort,
        `GET http://${TEST_PUBLIC_HOST}:${upstreamPort}/hello HTTP/1.1\r\n` +
          `Host: ${TEST_PUBLIC_HOST}:${upstreamPort}\r\nConnection: close\r\n\r\n`,
      );
      expect(response).toContain('200');
      expect(response).toContain(`host=${TEST_PUBLIC_HOST}:${upstreamPort}`);
    });

    it('establishes a CONNECT tunnel to a validated host', async () => {
      const response = await rawExchange(
        proxyPort,
        `CONNECT ${TEST_PUBLIC_HOST}:${upstreamPort} HTTP/1.1\r\n` +
          `Host: ${TEST_PUBLIC_HOST}:${upstreamPort}\r\n\r\n` +
          // Sent through the established tunnel straight to the upstream server.
          `GET /tunnel HTTP/1.1\r\nHost: ${TEST_PUBLIC_HOST}\r\nConnection: close\r\n\r\n`,
      );
      expect(response).toContain('200 Connection Established');
      expect(response).toContain(`host=${TEST_PUBLIC_HOST}`);
    });
  });
});
