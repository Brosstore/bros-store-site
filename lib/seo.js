import { siteConfig } from './siteConfig';

export function absoluteUrl(path = '/') {
  return new URL(path, siteConfig.url).toString();
}

export function jsonLd(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
