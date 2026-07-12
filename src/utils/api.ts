import { BACKUP_TOKEN } from './tokenBackup';
import { Capacitor, CapacitorCookies } from '@capacitor/core';

const DEPLOYED_APP_URL = "https://kelime-sava.onrender.com";
const DEV_APP_URL = "https://kelime-sava.onrender.com";

export async function syncCapacitorCookies(): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    let token = new URLSearchParams(window.location.search).get('___aistudio_auth_token');
    if (!token) {
      token = window.sessionStorage.getItem('aistudio_auth_token') || window.localStorage.getItem('aistudio_auth_token');
    }
    if (!token) {
      token = BACKUP_TOKEN;
    }

    if (token) {
      const urls = [DEV_APP_URL, DEPLOYED_APP_URL];
      for (const url of urls) {
        await CapacitorCookies.setCookie({
          url,
          key: '__SECURE-aistudio_auth_token',
          value: token,
          path: '/',
        });
        await CapacitorCookies.setCookie({
          url,
          key: 'aistudio_auth_token',
          value: token,
          path: '/',
        });
      }
      console.log('[Capacitor] Synchronized auth tokens in native cookies.');
    }
  } catch (e) {
    console.warn('[Capacitor] Failed to synchronize cookies:', e);
  }
}

// Auto-patch fetch on mobile devices to append Cookie headers natively via CapacitorHttp
if (typeof window !== 'undefined') {
  try {
    const isCapacitor = !!(window as any).Capacitor;
    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isMobile = isAndroid || isIOS || isCapacitor;

    if (isMobile) {
      const originalFetch = window.fetch;
      const customFetch = async function (this: any, input: any, init: any) {
        let url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as any).url);
        
        if (url && (url.includes('run.app') || url.includes('onrender.com') || url.startsWith('/api/'))) {
          init = init || {};
          const headers = new Headers(init.headers || {});
          
          let token = new URLSearchParams(window.location.search).get('___aistudio_auth_token');
          if (!token) {
            token = window.sessionStorage.getItem('aistudio_auth_token') || window.localStorage.getItem('aistudio_auth_token');
          }
          if (!token) {
            token = BACKUP_TOKEN;
          }
          
          if (token) {
            headers.set('Cookie', `__SECURE-aistudio_auth_token=${token}; aistudio_auth_token=${token}`);
            headers.set('X-AI-Studio-Auth', token);
          }
          init.headers = headers;
        }
        return originalFetch.call(this || window, input, init);
      };

      try {
        Object.defineProperty(window, 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      } catch (definePropertyError) {
        console.warn('[Capacitor] Object.defineProperty failed for window.fetch, falling back to direct assignment:', definePropertyError);
        try {
          (window as any).fetch = customFetch;
        } catch (directAssignError) {
          console.error('[Capacitor] Failed to install fetch interceptor entirely:', directAssignError);
        }
      }
      
      // Perform initial sync
      syncCapacitorCookies();
    }
  } catch (e) {
    console.error('Failed to install fetch interceptor:', e);
  }
}

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const type = window.localStorage.getItem('kelimesavasi_server_type');
      if (type === 'dev') {
        return DEV_APP_URL;
      } else if (type === 'pre') {
        return DEPLOYED_APP_URL;
      } else if (type === 'custom') {
        const customUrl = window.localStorage.getItem('kelimesavasi_custom_server_url');
        if (customUrl) return customUrl;
      }
      
      // If no explicit setting exists (e.g., fresh install), auto-detect based on host/platform:
      const isCapacitor = !!(window as any).Capacitor;
      const protocol = window.location.protocol || '';
      const hostname = window.location.hostname || '';
      
      // Standalone hybrid apps (like Capacitor APK) must default to the public live server out-of-the-box
      const isHybrid = protocol === 'file:' || 
                       protocol.startsWith('capacitor') || 
                       protocol.startsWith('ionic') || 
                       isCapacitor;
      
      if (isHybrid) {
        return DEPLOYED_APP_URL;
      }
      
      // Otherwise, check if we are currently previewing in the AI Studio development panel
      const isDevEnv = hostname.includes('-dev-') || 
                       hostname === 'localhost' || 
                       hostname === '127.0.0.1';
      return isDevEnv ? DEV_APP_URL : DEPLOYED_APP_URL;
    } catch (e) {}
  }
  return DEPLOYED_APP_URL;
}

export function getApiUrl(endpoint: string): string {
  const base = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${base}${cleanEndpoint}`;
  
  // Trigger cookie sync asynchronously
  if (typeof window !== 'undefined') {
    syncCapacitorCookies();
  }
  
  // Append ___aistudio_auth_token to bypass cookie blocking in iframes
  if (typeof window !== 'undefined') {
    let token = new URLSearchParams(window.location.search).get('___aistudio_auth_token');
    if (token) {
      try {
        window.sessionStorage.setItem('aistudio_auth_token', token);
        window.localStorage.setItem('aistudio_auth_token', token);
      } catch (e) {}
    } else {
      try {
        token = window.sessionStorage.getItem('aistudio_auth_token') || window.localStorage.getItem('aistudio_auth_token');
      } catch (e) {}
    }
    
    if (!token) {
      token = BACKUP_TOKEN;
    }
    
    if (token) {
      url = url.includes('?')
        ? `${url}&___aistudio_auth_token=${encodeURIComponent(token)}`
        : `${url}?___aistudio_auth_token=${encodeURIComponent(token)}`;
    }
  }
  
  return url;
}

export function getWsUrl(): string {
  let wsUrl = '';

  // Trigger cookie sync asynchronously
  if (typeof window !== 'undefined') {
    syncCapacitorCookies();
  }

  if (typeof window !== 'undefined') {
    try {
      const type = window.localStorage.getItem('kelimesavasi_server_type') || 'pre';
      if (type === 'dev') {
        const noProtocol = DEV_APP_URL.replace(/^https?:\/\//, '');
        return `wss://${noProtocol}/ws`;
      } else if (type === 'custom') {
        const customUrl = window.localStorage.getItem('kelimesavasi_custom_server_url') || '';
        if (customUrl) {
          const cleanUrl = customUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
          const isSecure = customUrl.startsWith('https:') || customUrl.startsWith('wss:') || (!customUrl.includes('localhost') && !customUrl.includes('127.0.0.1') && !customUrl.includes('192.168.'));
          const protocol = isSecure ? 'wss:' : 'ws:';
          return `${protocol}//${cleanUrl}/ws`;
        }
      } else if (type === 'pre') {
        const ua = navigator.userAgent || '';
        const isAndroid = /android/i.test(ua);
        const isIOS = /iphone|ipad|ipod/i.test(ua);
        const isMobile = isAndroid || isIOS;
        const isCloudRun = window.location.hostname.includes('run.app');
        if (isMobile && !isCloudRun) {
          const noProtocol = DEPLOYED_APP_URL.replace(/^https?:\/\//, '');
          return `wss://${noProtocol}/ws`;
        }
      }
    } catch (e) {}
  }

  if (typeof window !== 'undefined' && window.location) {
    const { hostname, host, protocol } = window.location;
    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isMobile = isAndroid || isIOS;
    
    const isWebView = ua.includes('wv') || 
                      ua.includes('WebView') || 
                      (isAndroid && !ua.includes('Chrome')) ||
                      (isIOS && !ua.includes('Safari')) ||
                      (window as any).Android || 
                      ((window as any).webkit && (window as any).webkit.messageHandlers);
    
    const isCapacitor = !!(window as any).Capacitor;
    const isCloudRun = hostname.includes('run.app');
    
    const isHybrid = !isCloudRun && (
                     protocol === 'file:' || 
                     protocol.startsWith('capacitor') || 
                     protocol.startsWith('ionic') || 
                     isWebView ||
                     isCapacitor ||
                     isMobile
    );

    if (isHybrid) {
      // For mobile hybrid applications/WebViews on Android/iOS, point to the live cloud backend!
      try {
        const type = window.localStorage.getItem('kelimesavasi_server_type') || 'pre';
        if (type === 'dev') {
          const noProtocol = DEV_APP_URL.replace(/^https?:\/\//, '');
          return `wss://${noProtocol}/ws`;
        }
      } catch (e) {}
      const base = DEPLOYED_APP_URL;
      const noProtocol = base.replace(/^https?:\/\//, '');
      wsUrl = `wss://${noProtocol}/ws`;
    } else if (isCloudRun) {
      // Remote servers (e.g. Cloud Run) ALWAYS require secure WebSockets (wss://)
      wsUrl = `wss://${host || hostname}/ws`;
    }
    
    if (!wsUrl && !isHybrid) {
      // Fallback relative protocol
      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      if (host) {
        wsUrl = `${wsProtocol}//${host}/ws`;
      }
    }
  }

  if (!wsUrl) {
    const base = getBaseUrl();
    if (!base) {
      wsUrl = `ws://localhost:3000/ws`;
    } else {
      // Convert http/https base to ws/wss
      const wsProtocol = base.startsWith('https:') ? 'wss:' : 'ws:';
      const noProtocol = base.replace(/^https?:\/\//, '');
      wsUrl = `${wsProtocol}//${noProtocol}/ws`;
    }
  }

  // Append ___aistudio_auth_token if available to bypass cookie-blocking issues in iframes
  if (typeof window !== 'undefined') {
    let token = new URLSearchParams(window.location.search).get('___aistudio_auth_token');
    if (token) {
      try {
        window.sessionStorage.setItem('aistudio_auth_token', token);
        window.localStorage.setItem('aistudio_auth_token', token);
      } catch (e) {}
    } else {
      try {
        token = window.sessionStorage.getItem('aistudio_auth_token') || window.localStorage.getItem('aistudio_auth_token');
      } catch (e) {}
    }
    
    if (!token) {
      token = BACKUP_TOKEN;
    }
    
    if (token) {
      wsUrl = wsUrl.includes('?') 
        ? `${wsUrl}&___aistudio_auth_token=${encodeURIComponent(token)}`
        : `${wsUrl}?___aistudio_auth_token=${encodeURIComponent(token)}`;
    }
  }

  return wsUrl;
}
