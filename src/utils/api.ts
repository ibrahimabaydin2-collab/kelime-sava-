import { BACKUP_TOKEN } from './tokenBackup';

const DEPLOYED_APP_URL = "https://ais-pre-vzpmai7eoao3e226nj2zhy-132556631899.europe-west2.run.app";
const DEV_APP_URL = "https://ais-dev-vzpmai7eoao3e226nj2zhy-132556631899.europe-west2.run.app";

export function getBaseUrl(): string {
  return DEV_APP_URL;
}

export function getApiUrl(endpoint: string): string {
  const base = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${base}${cleanEndpoint}`;
  
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
