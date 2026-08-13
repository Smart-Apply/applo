import * as http from 'http';
import * as net from 'net';
import { Logger } from '@nestjs/common';
import { resolveAndAssertPublic } from './url-safety.util';

/**
 * Loopback HTTP forward proxy that enforces the SSRF policy at CONNECT time
 * (security audit 2026-08-13, F15).
 *
 * Why it exists: the agent parser's `page.route` interceptor validates each
 * hostname in Node, but Chromium then re-resolves the same hostname with its
 * own resolver — a TTL-0 nameserver can answer the two lookups differently
 * (DNS rebinding), landing the browser on a private address the check just
 * approved. Launch flags like `--host-resolver-rules` can't fix this for a
 * WARM browser, whose flags are frozen at launch.
 *
 * Routing the browser through this proxy removes the second lookup entirely:
 * for both CONNECT tunnels (https/wss) and absolute-form requests (http/ws),
 * the proxy resolves the hostname ITSELF via `resolveAndAssertPublic` and
 * dials the exact IP that passed the check. The browser never resolves DNS
 * for proxied traffic. As a side effect every WebSocket handshake is policed
 * at the network layer too (defense in depth for F14).
 *
 * Scope: binds 127.0.0.1 on an ephemeral port; upstream ports are limited to
 * the web set {80, 443, 8080, 8443} so the parser cannot be used as a
 * general-purpose port scanner of public hosts.
 */

const ALLOWED_UPSTREAM_PORTS = new Set([80, 443, 8080, 8443]);
const UPSTREAM_CONNECT_TIMEOUT_MS = 10_000;
/**
 * Memo of validated resolutions. Short-lived: it exists to keep one page
 * load (dozens of subresources on the same few hosts) from re-resolving per
 * request, and REUSING a validated IP is pinning, not a staleness risk — the
 * attacker-controlled record only matters at first resolution.
 */
const RESOLUTION_CACHE_TTL_MS = 30_000;

interface ResolvedTarget {
  ip: string;
  port: number;
}

export class SsrfEgressProxy {
  private readonly logger = new Logger(SsrfEgressProxy.name);
  private server: http.Server | null = null;
  private port: number | null = null;
  private starting: Promise<number> | null = null;
  private readonly openSockets = new Set<net.Socket>();
  private readonly resolutionCache = new Map<string, { ip: string; expiresAt: number }>();
  private readonly allowedPorts: ReadonlySet<number>;

  /** `allowedPorts` is overridable for tests only — production callers use the default. */
  constructor(options?: { allowedPorts?: ReadonlySet<number> }) {
    this.allowedPorts = options?.allowedPorts ?? ALLOWED_UPSTREAM_PORTS;
  }

  /** Idempotent; concurrent callers share one bind. Returns the loopback port. */
  async start(): Promise<number> {
    if (this.port !== null) {
      return this.port;
    }
    if (this.starting) {
      return this.starting;
    }

    this.starting = new Promise<number>((resolve, reject) => {
      const server = http.createServer();

      server.on('connect', (req, clientSocket, head) => {
        this.handleConnect(req, clientSocket as net.Socket, head);
      });
      server.on('request', (req, res) => {
        this.handleRequest(req, res);
      });
      server.on('connection', (socket) => {
        this.openSockets.add(socket);
        socket.on('close', () => this.openSockets.delete(socket));
        // A client error must never bubble to an unhandled 'error' event.
        socket.on('error', () => socket.destroy());
      });
      server.on('clientError', (_err, socket) => {
        socket.destroy();
      });
      server.once('error', (err) => {
        reject(err);
      });

      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          server.close();
          reject(new Error('Egress proxy failed to bind a loopback port'));
          return;
        }
        this.server = server;
        this.port = address.port;
        this.logger.log(`SSRF egress proxy listening on 127.0.0.1:${address.port}`);
        resolve(address.port);
      });
    }).finally(() => {
      this.starting = null;
    });

    return this.starting;
  }

  async close(): Promise<void> {
    const server = this.server;
    this.server = null;
    this.port = null;
    this.resolutionCache.clear();
    if (!server) {
      return;
    }
    for (const socket of this.openSockets) {
      socket.destroy();
    }
    this.openSockets.clear();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }

  /**
   * Validate port + hostname and resolve to the exact IP the connection will
   * use. Throws for anything the SSRF policy rejects. Port is checked FIRST
   * so a disallowed port never costs a DNS lookup.
   */
  private async resolveTarget(rawHost: string, rawPort: string | number): Promise<ResolvedTarget> {
    const port = typeof rawPort === 'number' ? rawPort : parseInt(rawPort, 10);
    if (!Number.isInteger(port) || !this.allowedPorts.has(port)) {
      throw new Error(`Upstream port ${String(rawPort)} is not allowed`);
    }

    // URL/CONNECT authorities carry IPv6 literals in brackets.
    const hostname =
      rawHost.startsWith('[') && rawHost.endsWith(']') ? rawHost.slice(1, -1) : rawHost;
    if (!hostname) {
      throw new Error('Missing upstream host');
    }

    const cached = this.resolutionCache.get(hostname);
    if (cached && cached.expiresAt > Date.now()) {
      return { ip: cached.ip, port };
    }

    const addresses = await resolveAndAssertPublic(hostname);
    const ip = addresses[0];
    this.resolutionCache.set(hostname, { ip, expiresAt: Date.now() + RESOLUTION_CACHE_TTL_MS });
    return { ip, port };
  }

  private dial(target: ResolvedTarget): Promise<net.Socket> {
    return new Promise<net.Socket>((resolve, reject) => {
      const socket = net.connect({ host: target.ip, port: target.port });
      const onTimeout = () => {
        socket.destroy();
        reject(new Error(`Upstream connect timed out (${target.ip}:${target.port})`));
      };
      socket.setTimeout(UPSTREAM_CONNECT_TIMEOUT_MS, onTimeout);
      socket.once('error', reject);
      socket.once('connect', () => {
        socket.setTimeout(0);
        socket.removeListener('error', reject);
        resolve(socket);
      });
    });
  }

  /** CONNECT tunnels: https:// and wss:// (and ws:// — Chromium tunnels those too). */
  private handleConnect(req: http.IncomingMessage, clientSocket: net.Socket, head: Buffer): void {
    clientSocket.on('error', () => clientSocket.destroy());

    void (async () => {
      const authority = req.url ?? '';
      const splitAt = authority.lastIndexOf(':');
      if (splitAt <= 0) {
        throw new Error(`Malformed CONNECT authority: ${authority}`);
      }
      const target = await this.resolveTarget(
        authority.slice(0, splitAt),
        authority.slice(splitAt + 1),
      );

      const upstream = await this.dial(target);
      this.openSockets.add(upstream);
      upstream.on('close', () => this.openSockets.delete(upstream));
      upstream.on('error', () => {
        upstream.destroy();
        clientSocket.destroy();
      });
      clientSocket.on('close', () => upstream.destroy());
      clientSocket.on('error', () => upstream.destroy());

      clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if (head && head.length > 0) {
        upstream.write(head);
      }
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    })().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Blocked CONNECT ${req.url ?? ''}: ${message}`);
      if (clientSocket.writable) {
        clientSocket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      }
      clientSocket.destroy();
    });
  }

  /** Absolute-form plain-HTTP proxying: GET http://host/path HTTP/1.1 */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    void (async () => {
      const rawUrl = req.url ?? '';
      let url: URL;
      try {
        url = new URL(rawUrl); // origin-form ("/path") throws — proxy-only endpoint
      } catch {
        throw new Error(`Not an absolute-form proxy request: ${rawUrl}`);
      }
      if (url.protocol !== 'http:') {
        throw new Error(`Unsupported proxied protocol: ${url.protocol}`);
      }

      const target = await this.resolveTarget(url.hostname, url.port || '80');

      // Strip hop-by-hop headers; pin Host to the ORIGINAL hostname so
      // virtual hosting + redirects behave, while the TCP connection goes to
      // the validated IP.
      const headers: http.OutgoingHttpHeaders = { ...req.headers };
      delete headers['proxy-connection'];
      delete headers['keep-alive'];
      delete headers['upgrade'];
      headers.connection = 'close';
      headers.host = url.host;

      const upstreamReq = http.request({
        host: target.ip,
        port: target.port,
        method: req.method,
        path: `${url.pathname}${url.search}`,
        headers,
        setHost: false,
        timeout: UPSTREAM_CONNECT_TIMEOUT_MS,
      });

      upstreamReq.on('timeout', () => {
        upstreamReq.destroy(new Error('Upstream request timed out'));
      });
      upstreamReq.on('error', (err) => {
        if (!res.headersSent) {
          res.writeHead(502);
        }
        res.end();
        this.logger.debug(`Upstream error for ${rawUrl}: ${err.message}`);
      });
      upstreamReq.on('response', (upstreamRes) => {
        res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
        upstreamRes.pipe(res);
      });

      req.pipe(upstreamReq);
      req.on('error', () => upstreamReq.destroy());
    })().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Blocked proxied request ${req.url ?? ''}: ${message}`);
      if (!res.headersSent) {
        res.writeHead(403, { 'content-type': 'text/plain', connection: 'close' });
      }
      res.end('Forbidden by egress policy');
    });
  }
}
