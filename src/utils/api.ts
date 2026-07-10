const DEPLOYED_APP_URL = "https://ais-pre-vzpmai7eoao3e226nj2zhy-132556631899.europe-west2.run.app";

export function getBaseUrl(): string {
  // Check if process.env.APP_URL is injected during build
  const envUrl = typeof process !== 'undefined' && process.env && process.env.APP_URL ? process.env.APP_URL : '';
  const fallbackUrl = envUrl || DEPLOYED_APP_URL;
  const cleanFallback = fallbackUrl.endsWith('/') ? fallbackUrl.slice(0, -1) : fallbackUrl;
  
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    const ua = navigator.userAgent || '';
    
    // Detect mobile device/emulator and WebView environment indicators
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    
    // Webview detection (includes common wrapper strings, e.g. "wv", "WebView", or custom Android interface)
    const isWebView = ua.includes('wv') || 
                      ua.includes('WebView') || 
                      (isAndroid && !ua.includes('Chrome')) ||
                      (isIOS && !ua.includes('Safari')) ||
                      (window as any).Android || 
                      ((window as any).webkit && (window as any).webkit.messageHandlers);
    
    const isCapacitor = !!(window as any).Capacitor;
    
    // If we are in a hybrid / mobile container (local files, capacitor protocol, native ionic, or localhost with a mobile agent)
    const isHybrid = protocol === 'file:' || 
                     protocol.startsWith('capacitor') || 
                     protocol.startsWith('ionic') || 
                     isWebView ||
                     isCapacitor ||
                     ((hostname === 'localhost' || hostname === '127.0.0.1') && (isAndroid || isIOS));
                     
    if (isHybrid) {
      return cleanFallback;
    }
    
    // Regular web browser (on actual domain or dev server)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return ''; // Relative path works fine
    }
    
    // Localhost with port (desktop browser development environment)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port) {
      return ''; // Relative path works fine
    }
  }
  
  return cleanFallback;
}

export function getApiUrl(endpoint: string): string {
  const base = getBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${cleanEndpoint}`;
}

export function getWsUrl(): string {
  const base = getBaseUrl();
  if (!base) {
    // Relative protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  // Convert http/https base to ws/wss
  const wsProtocol = base.startsWith('https:') ? 'wss:' : 'ws:';
  const noProtocol = base.replace(/^https?:\/\//, '');
  return `${wsProtocol}//${noProtocol}/ws`;
}
