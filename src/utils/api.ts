const DEPLOYED_APP_URL = "https://ais-pre-vzpmai7eoao3e226nj2zhy-132556631899.europe-west2.run.app";
const DEV_APP_URL = "https://ais-dev-vzpmai7eoao3e226nj2zhy-132556631899.europe-west2.run.app";

export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const type = window.localStorage.getItem('kelimesavasi_server_type') || 'pre';
      if (type === 'dev') {
        return DEV_APP_URL;
      } else if (type === 'custom') {
        const customUrl = window.localStorage.getItem('kelimesavasi_custom_server_url');
        if (customUrl) {
          return customUrl.endsWith('/') ? customUrl.slice(0, -1) : customUrl;
        }
      }
    } catch (e) {}
  }

  // Check if process.env.APP_URL is injected during build
  const envUrl = typeof process !== 'undefined' && process.env && process.env.APP_URL ? process.env.APP_URL : '';
  const fallbackUrl = envUrl || DEPLOYED_APP_URL;
  const cleanFallback = fallbackUrl.endsWith('/') ? fallbackUrl.slice(0, -1) : fallbackUrl;
  
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    
    // If we are on any remote web server (loaded via http/https and not local loopbacks)
    const isRemoteWebServer = (protocol === 'http:' || protocol === 'https:') && 
                              hostname !== 'localhost' && 
                              hostname !== '127.0.0.1' &&
                              !hostname.startsWith('192.168.') &&
                              !hostname.startsWith('10.');
                              
    if (isRemoteWebServer) {
      return ''; // Relative paths are 100% safe and correct on remote domains
    }
    
    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isMobile = isAndroid || isIOS;
    
    // Webview detection (includes common wrapper strings, e.g. "wv", "WebView", or custom Android interface)
    const isWebView = ua.includes('wv') || 
                      ua.includes('WebView') || 
                      (isAndroid && !ua.includes('Chrome')) ||
                      (isIOS && !ua.includes('Safari')) ||
                      (window as any).Android || 
                      ((window as any).webkit && (window as any).webkit.messageHandlers);
    
    const isCapacitor = !!(window as any).Capacitor;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || !hostname;
    
    // In hybrid mobile environment (Capacitor / WebView / file protocol / mobile host layout)
    const isHybrid = protocol === 'file:' || 
                     protocol.startsWith('capacitor') || 
                     protocol.startsWith('ionic') || 
                     isWebView ||
                     isCapacitor ||
                     (isMobile && isLocalhost);
                     
    if (isHybrid) {
      return cleanFallback;
    }
    
    // Regular desktop or mobile development with port (e.g. localhost:3000, 192.168.1.x:3000)
    if (port || hostname.startsWith('192.168.') || hostname.startsWith('10.')) {
      if (window.location.origin && window.location.origin !== 'null') {
        return window.location.origin;
      }
      return ''; // Relative path works fine
    }
  }
  
  return cleanFallback;
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
      } catch (e) {}
    } else {
      try {
        token = window.sessionStorage.getItem('aistudio_auth_token');
      } catch (e) {}
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
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || !hostname;
    
    const isRemote = hostname && 
                     hostname !== 'localhost' && 
                     hostname !== '127.0.0.1' &&
                     !hostname.startsWith('192.168.') &&
                     !hostname.startsWith('10.');

    const isHybrid = !isRemote && (
                     protocol === 'file:' || 
                     protocol.startsWith('capacitor') || 
                     protocol.startsWith('ionic') || 
                     isWebView ||
                     isCapacitor ||
                     (isMobile && isLocalhost)
    );

    if (isHybrid) {
      // For mobile hybrid applications/WebViews on Android/iOS, point to the live cloud backend!
      const base = DEPLOYED_APP_URL;
      const noProtocol = base.replace(/^https?:\/\//, '');
      wsUrl = `wss://${noProtocol}/ws`;
    } else if (hostname) {
      const isRemote = hostname !== 'localhost' && 
                       hostname !== '127.0.0.1' &&
                       !hostname.startsWith('192.168.') &&
                       !hostname.startsWith('10.');
      if (isRemote) {
        // Remote servers (e.g. Cloud Run) ALWAYS require secure WebSockets (wss://)
        wsUrl = `wss://${host || hostname}/ws`;
      }
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
      } catch (e) {}
    } else {
      try {
        token = window.sessionStorage.getItem('aistudio_auth_token');
      } catch (e) {}
    }
    
    if (token) {
      wsUrl = wsUrl.includes('?') 
        ? `${wsUrl}&___aistudio_auth_token=${encodeURIComponent(token)}`
        : `${wsUrl}?___aistudio_auth_token=${encodeURIComponent(token)}`;
    }
  }

  return wsUrl;
}
