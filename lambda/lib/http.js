'use strict';

// Minimal HTTP client on Node's built-in modules, so the skill has no extra
// dependencies and works on any Alexa-hosted Node.js runtime.
const https = require('https');
const http = require('http');

const MAX_REDIRECTS = 3;

function request(url, { method = 'GET', headers = {}, body, timeoutMs = 2500 } = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const lib = target.protocol === 'http:' ? http : https;
    const payload = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const allHeaders = { 'User-Agent': 'makealexa-dashboard/1.0', ...headers };
    if (payload !== undefined) {
      allHeaders['Content-Type'] = allHeaders['Content-Type'] || 'application/json';
      allHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = lib.request(target, { method, headers: allHeaders }, (res) => {
      const { statusCode, headers: resHeaders } = res;
      if (statusCode >= 300 && statusCode < 400 && resHeaders.location && method === 'GET') {
        res.resume();
        if (redirects >= MAX_REDIRECTS) return reject(new Error(`Too many redirects from ${target.host}`));
        const next = new URL(resHeaders.location, target).toString();
        return resolve(request(next, { method, headers, timeoutMs }, redirects + 1));
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (statusCode >= 200 && statusCode < 300) resolve(text);
        else reject(new Error(`HTTP ${statusCode} from ${target.host}`));
      });
      res.on('error', reject);
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Timed out after ${timeoutMs}ms: ${target.host}`)));
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

async function getJson(url, options) {
  return JSON.parse(await request(url, options));
}

module.exports = { request, getJson };
