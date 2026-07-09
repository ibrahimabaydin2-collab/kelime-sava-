const DEPLOYED_APP_URL = "https://ais-pre-vzpmai7eoao3e226nj2zhy-132556631899.europe-west2.run.app";

export function getBaseUrl(): string {
  // Check if process.env.APP_URL is injected during build
  const envUrl = typeof process !== 'undefined' && process.env && process.env.APP_URL ? process.env.APP_URL : '';
  
  // If we're in a regular browser environment running on the Cloud Run domain, we can use relative paths
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;
    
    // Regular web browser (on actual domain or dev server)
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return ''; // Relative path works fine
    }
    
    // Localhost with port (e.g., browser dev environment)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port) {
      return ''; // Relative path works fine
    }
    
    // If it's an APK / Hybrid (file protocol, capacitor, ionic, or localhost without port)
    const isHybrid = protocol === 'file:' || 
                     protocol.startsWith('capacitor') || 
                     protocol.startsWith('ionic') || 
                     (hostname === 'localhost' && !port) ||
                     (typeof navigator !== 'undefined' && /android|iphone|ipad/i.test(navigator.userAgent));
                     
    if (isHybrid) {
      // Return the env-injected URL, or fall back to the deployed URL
      const cleanUrl = envUrl || DEPLOYED_APP_URL;
      return cleanUrl.endsWith('/') ? cleanUrl.slice(0, -1) : cleanUrl;
    }
  }
  
  return envUrl || DEPLOYED_APP_URL;
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
