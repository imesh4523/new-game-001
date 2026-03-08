/**
 * User Agent Parser
 * Extracts browser name, version, device type, device model, and operating system from user agent strings
 */

export interface ParsedUserAgent {
  browserName: string;
  browserVersion: string;
  deviceType: string;
  deviceModel: string;
  operatingSystem: string;
}

export interface DeviceFingerprint {
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  timezone: string;
  language: string;
}

export function parseUserAgent(userAgent: string | undefined, fingerprint?: DeviceFingerprint): ParsedUserAgent {
  if (!userAgent) {
    return {
      browserName: 'Unknown',
      browserVersion: 'Unknown', 
      deviceType: 'Unknown',
      deviceModel: 'Unknown',
      operatingSystem: 'Unknown'
    };
  }

  const ua = userAgent.toLowerCase();
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let deviceType = 'Desktop';
  let deviceModel = 'Unknown';
  let operatingSystem = 'Unknown';

  // Device Type Detection (check tablets first)
  if (/tablet|ipad/.test(ua) || (/android/.test(ua) && !/mobile/.test(ua))) {
    deviceType = 'Tablet';
  } else if (/mobile|android|iphone|ipod|blackberry|iemobile|windows phone/.test(ua)) {
    deviceType = 'Mobile';
  }

  // Device Model Detection
  // iPhone Models (based on iPhone identifier patterns)
  if (/iphone/.test(ua)) {
    // Try to extract iPhone model from user agent
    if (/iphone\s*(\d+[,_]\d+)/.test(ua)) {
      const modelMatch = ua.match(/iphone\s*(\d+[,_]\d+)/);
      if (modelMatch) {
        const identifier = modelMatch[1].replace(/[,_]/g, ',');
        deviceModel = mapIPhoneIdentifier(identifier);
      }
    } else if (fingerprint) {
      // Use screen dimensions for iPhone detection when specific model not available
      deviceModel = detectIPhoneByScreen(fingerprint.screenWidth, fingerprint.screenHeight, fingerprint.pixelRatio);
    } else {
      // Generic iPhone detection when specific model not available
      deviceModel = 'iPhone';
    }
  }
  // iPad Models
  else if (/ipad/.test(ua)) {
    if (/ipad\s*(\d+[,_]\d+)/.test(ua)) {
      const modelMatch = ua.match(/ipad\s*(\d+[,_]\d+)/);
      if (modelMatch) {
        const identifier = modelMatch[1].replace(/[,_]/g, ',');
        deviceModel = mapIPadIdentifier(identifier);
      }
    } else {
      deviceModel = 'iPad';
    }
  }
  // Android Devices (try to extract manufacturer and model)
  else if (/android/.test(ua)) {
    // Common patterns: "SM-G998B" (Samsung), "Pixel 6", etc.
    const androidModelMatch = ua.match(/android.*;\s*([^;)]+)\s*build/i) || 
                             ua.match(/android.*;\s*([^;)]+)\)/i);
    
    if (androidModelMatch && androidModelMatch[1]) {
      let model = androidModelMatch[1].trim();
      
      // Clean up common patterns
      model = model.replace(/^\s*build\/.*$/i, '').trim();
      
      // Map Samsung models
      if (/sm-[a-z]\d{3}/.test(model)) {
        deviceModel = mapSamsungModel(model);
      }
      // Google Pixel
      else if (/pixel/i.test(model)) {
        deviceModel = mapPixelModel(model);
      }
      // OnePlus models
      else if (/oneplus|oppo|cph\d{4}|realme/i.test(model)) {
        deviceModel = mapOnePlusOPPOModel(model);
      }
      // Other models - take first 2-3 words
      else if (model && model.length > 2) {
        deviceModel = model.split(/\s+/).slice(0, 2).join(' ');
      } else {
        deviceModel = 'Android Device';
      }
    } else {
      deviceModel = 'Android Device';
    }
  }
  // Desktop/Laptop
  else if (/windows|mac os|linux|cros/.test(ua)) {
    deviceModel = 'Desktop/Laptop';
  }

  // Operating System Detection (improved with more patterns)
  if (/windows nt/.test(ua)) {
    const winMatch = ua.match(/windows nt ([\d.]+)/);
    const version = winMatch ? winMatch[1] : '';
    switch (version) {
      case '10.0': 
        // Windows 11 also reports as NT 10.0, but we'll just call it Windows 10/11
        operatingSystem = 'Windows 10/11'; 
        break;
      case '6.3': operatingSystem = 'Windows 8.1'; break;
      case '6.2': operatingSystem = 'Windows 8'; break;
      case '6.1': operatingSystem = 'Windows 7'; break;
      case '6.0': operatingSystem = 'Windows Vista'; break;
      case '5.1': operatingSystem = 'Windows XP'; break;
      default: operatingSystem = 'Windows';
    }
  } else if (/windows/.test(ua)) {
    // Fallback for Windows if NT pattern doesn't match
    operatingSystem = 'Windows';
  } else if (/mac os x|macintosh/.test(ua)) {
    const macMatch = ua.match(/mac os x ([\d_]+)/);
    if (macMatch) {
      operatingSystem = `macOS ${macMatch[1].replace(/_/g, '.')}`;
    } else {
      operatingSystem = 'macOS';
    }
  } else if (/android/.test(ua)) {
    const androidMatch = ua.match(/android ([\d.]+)/);
    operatingSystem = androidMatch ? `Android ${androidMatch[1]}` : 'Android';
  } else if (/iphone os/.test(ua)) {
    const iosMatch = ua.match(/iphone os ([\d_]+)/);
    operatingSystem = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  } else if (/ipad.*os/.test(ua) || /ipad/.test(ua)) {
    const iosMatch = ua.match(/os ([\d_]+)/);
    operatingSystem = iosMatch ? `iPadOS ${iosMatch[1].replace(/_/g, '.')}` : 'iPadOS';
  } else if (/cros/.test(ua)) {
    // Chrome OS
    operatingSystem = 'Chrome OS';
  } else if (/ubuntu/.test(ua)) {
    operatingSystem = 'Ubuntu';
  } else if (/debian/.test(ua)) {
    operatingSystem = 'Debian';
  } else if (/fedora/.test(ua)) {
    operatingSystem = 'Fedora';
  } else if (/linux/.test(ua) || /x11/.test(ua)) {
    operatingSystem = 'Linux';
  } else if (/freebsd/.test(ua)) {
    operatingSystem = 'FreeBSD';
  } else if (/openbsd/.test(ua)) {
    operatingSystem = 'OpenBSD';
  } else if (/sunos/.test(ua)) {
    operatingSystem = 'Solaris';
  } else if (/nintendo|playstation|xbox/.test(ua)) {
    operatingSystem = 'Gaming Console';
  } else if (/bot|crawler|spider|scraper/.test(ua)) {
    operatingSystem = 'Bot/Crawler';
  }

  // Browser Detection (order matters - check more specific first)
  if (/crios\//.test(ua)) {
    // Chrome on iOS
    browserName = 'Chrome';
    const chromeMatch = ua.match(/crios\/([\d.]+)/);
    browserVersion = chromeMatch ? chromeMatch[1] : 'Unknown';
  } else if (/edgios\//.test(ua)) {
    // Edge on iOS
    browserName = 'Microsoft Edge';
    const edgeMatch = ua.match(/edgios\/([\d.]+)/);
    browserVersion = edgeMatch ? edgeMatch[1] : 'Unknown';
  } else if (/fxios\//.test(ua)) {
    // Firefox on iOS
    browserName = 'Firefox';
    const firefoxMatch = ua.match(/fxios\/([\d.]+)/);
    browserVersion = firefoxMatch ? firefoxMatch[1] : 'Unknown';
  } else if (/edg\//.test(ua)) {
    // Edge on desktop
    browserName = 'Microsoft Edge';
    const edgeMatch = ua.match(/edg\/([\d.]+)/);
    browserVersion = edgeMatch ? edgeMatch[1] : 'Unknown';
  } else if (/edge\//.test(ua)) {
    // Legacy Edge
    browserName = 'Microsoft Edge (Legacy)';
    const edgeMatch = ua.match(/edge\/([\d.]+)/);
    browserVersion = edgeMatch ? edgeMatch[1] : 'Unknown';
  } else if (/chrome\//.test(ua) && !/chromium/.test(ua)) {
    browserName = 'Chrome';
    const chromeMatch = ua.match(/chrome\/([\d.]+)/);
    browserVersion = chromeMatch ? chromeMatch[1] : 'Unknown';
  } else if (/firefox\//.test(ua)) {
    browserName = 'Firefox';
    const firefoxMatch = ua.match(/firefox\/([\d.]+)/);
    browserVersion = firefoxMatch ? firefoxMatch[1] : 'Unknown';
  } else if (/safari\//.test(ua) && !/chrome/.test(ua) && !/crios/.test(ua)) {
    browserName = 'Safari';
    const safariMatch = ua.match(/version\/([\d.]+)/);
    browserVersion = safariMatch ? safariMatch[1] : 'Unknown';
  } else if (/opera|opr\//.test(ua)) {
    browserName = 'Opera';
    const operaMatch = ua.match(/(opera|opr)\/([\d.]+)/);
    browserVersion = operaMatch ? operaMatch[2] : 'Unknown';
  } else if (/msie|trident/.test(ua)) {
    browserName = 'Internet Explorer';
    const ieMatch = ua.match(/(msie|rv:)([\d.]+)/);
    browserVersion = ieMatch ? ieMatch[2] : 'Unknown';
  } else if (/brave/.test(ua)) {
    browserName = 'Brave';
    const braveMatch = ua.match(/brave\/([\d.]+)/);
    browserVersion = braveMatch ? braveMatch[1] : 'Unknown';
  } else if (/vivaldi/.test(ua)) {
    browserName = 'Vivaldi';
    const vivaldiMatch = ua.match(/vivaldi\/([\d.]+)/);
    browserVersion = vivaldiMatch ? vivaldiMatch[1] : 'Unknown';
  }

  return {
    browserName,
    browserVersion,
    deviceType,
    deviceModel,
    operatingSystem
  };
}

// Helper function to map iPhone identifiers to model names
function mapIPhoneIdentifier(identifier: string): string {
  const models: { [key: string]: string } = {
    '8,1': 'iPhone 6s',
    '8,2': 'iPhone 6s Plus',
    '8,4': 'iPhone SE (1st gen)',
    '9,1': 'iPhone 7',
    '9,2': 'iPhone 7 Plus',
    '9,3': 'iPhone 7',
    '9,4': 'iPhone 7 Plus',
    '10,1': 'iPhone 8',
    '10,2': 'iPhone 8 Plus',
    '10,3': 'iPhone X',
    '10,4': 'iPhone 8',
    '10,5': 'iPhone 8 Plus',
    '10,6': 'iPhone X',
    '11,2': 'iPhone XS',
    '11,4': 'iPhone XS Max',
    '11,6': 'iPhone XS Max',
    '11,8': 'iPhone XR',
    '12,1': 'iPhone 11',
    '12,3': 'iPhone 11 Pro',
    '12,5': 'iPhone 11 Pro Max',
    '12,8': 'iPhone SE (2nd gen)',
    '13,1': 'iPhone 12 Mini',
    '13,2': 'iPhone 12',
    '13,3': 'iPhone 12 Pro',
    '13,4': 'iPhone 12 Pro Max',
    '14,2': 'iPhone 13 Pro',
    '14,3': 'iPhone 13 Pro Max',
    '14,4': 'iPhone 13 Mini',
    '14,5': 'iPhone 13',
    '14,6': 'iPhone SE (3rd gen)',
    '14,7': 'iPhone 14',
    '14,8': 'iPhone 14 Plus',
    '15,2': 'iPhone 14 Pro',
    '15,3': 'iPhone 14 Pro Max',
    '15,4': 'iPhone 15',
    '15,5': 'iPhone 15 Plus',
    '16,1': 'iPhone 15 Pro',
    '16,2': 'iPhone 15 Pro Max',
  };
  
  return models[identifier] || `iPhone (${identifier})`;
}

// Helper function to map iPad identifiers to model names
function mapIPadIdentifier(identifier: string): string {
  const models: { [key: string]: string } = {
    '6,11': 'iPad (5th gen)',
    '6,12': 'iPad (5th gen)',
    '7,5': 'iPad (6th gen)',
    '7,6': 'iPad (6th gen)',
    '7,11': 'iPad (7th gen)',
    '7,12': 'iPad (7th gen)',
    '11,6': 'iPad (8th gen)',
    '11,7': 'iPad (8th gen)',
    '12,1': 'iPad (9th gen)',
    '12,2': 'iPad (9th gen)',
    '13,18': 'iPad (10th gen)',
    '13,19': 'iPad (10th gen)',
    '6,3': 'iPad Pro 9.7"',
    '6,4': 'iPad Pro 9.7"',
    '6,7': 'iPad Pro 12.9" (1st gen)',
    '6,8': 'iPad Pro 12.9" (1st gen)',
    '7,1': 'iPad Pro 12.9" (2nd gen)',
    '7,2': 'iPad Pro 12.9" (2nd gen)',
    '7,3': 'iPad Pro 10.5"',
    '7,4': 'iPad Pro 10.5"',
    '8,1': 'iPad Pro 11" (1st gen)',
    '8,2': 'iPad Pro 11" (1st gen)',
    '8,3': 'iPad Pro 11" (1st gen)',
    '8,4': 'iPad Pro 11" (1st gen)',
    '8,5': 'iPad Pro 12.9" (3rd gen)',
    '8,6': 'iPad Pro 12.9" (3rd gen)',
    '8,7': 'iPad Pro 12.9" (3rd gen)',
    '8,8': 'iPad Pro 12.9" (3rd gen)',
    '8,9': 'iPad Pro 11" (2nd gen)',
    '8,10': 'iPad Pro 11" (2nd gen)',
    '8,11': 'iPad Pro 12.9" (4th gen)',
    '8,12': 'iPad Pro 12.9" (4th gen)',
    '13,4': 'iPad Pro 11" (3rd gen)',
    '13,5': 'iPad Pro 11" (3rd gen)',
    '13,6': 'iPad Pro 11" (3rd gen)',
    '13,7': 'iPad Pro 11" (3rd gen)',
    '13,8': 'iPad Pro 12.9" (5th gen)',
    '13,9': 'iPad Pro 12.9" (5th gen)',
    '13,10': 'iPad Pro 12.9" (5th gen)',
    '13,11': 'iPad Pro 12.9" (5th gen)',
    '14,3': 'iPad Pro 11" (4th gen)',
    '14,4': 'iPad Pro 11" (4th gen)',
    '14,5': 'iPad Pro 12.9" (6th gen)',
    '14,6': 'iPad Pro 12.9" (6th gen)',
    '5,1': 'iPad Mini 4',
    '5,2': 'iPad Mini 4',
    '11,1': 'iPad Mini (5th gen)',
    '11,2': 'iPad Mini (5th gen)',
    '14,1': 'iPad Mini (6th gen)',
    '14,2': 'iPad Mini (6th gen)',
    '5,3': 'iPad Air 2',
    '5,4': 'iPad Air 2',
    '11,3': 'iPad Air (3rd gen)',
    '11,4': 'iPad Air (3rd gen)',
    '13,1': 'iPad Air (4th gen)',
    '13,2': 'iPad Air (4th gen)',
    '13,16': 'iPad Air (5th gen)',
    '13,17': 'iPad Air (5th gen)',
  };
  
  return models[identifier] || `iPad (${identifier})`;
}

// Helper function to map Samsung model codes to friendly names
function mapSamsungModel(model: string): string {
  const prefix = model.substring(0, 5).toUpperCase();
  
  const samsungModels: { [key: string]: string } = {
    'SM-S911': 'Samsung Galaxy S23',
    'SM-S916': 'Samsung Galaxy S23+',
    'SM-S918': 'Samsung Galaxy S23 Ultra',
    'SM-S921': 'Samsung Galaxy S24',
    'SM-S926': 'Samsung Galaxy S24+',
    'SM-S928': 'Samsung Galaxy S24 Ultra',
    'SM-G991': 'Samsung Galaxy S21',
    'SM-G996': 'Samsung Galaxy S21+',
    'SM-G998': 'Samsung Galaxy S21 Ultra',
    'SM-G981': 'Samsung Galaxy S20',
    'SM-G986': 'Samsung Galaxy S20+',
    'SM-G988': 'Samsung Galaxy S20 Ultra',
    'SM-A525': 'Samsung Galaxy A52',
    'SM-A536': 'Samsung Galaxy A53',
    'SM-A346': 'Samsung Galaxy A34',
    'SM-A546': 'Samsung Galaxy A54',
    'SM-A556': 'Samsung Galaxy A55',
    'SM-N986': 'Samsung Galaxy Note 20 Ultra',
    'SM-N981': 'Samsung Galaxy Note 20',
    'SM-F926': 'Samsung Galaxy Z Fold3',
    'SM-F936': 'Samsung Galaxy Z Fold4',
    'SM-F946': 'Samsung Galaxy Z Fold5',
    'SM-F711': 'Samsung Galaxy Z Flip3',
    'SM-F721': 'Samsung Galaxy Z Flip4',
    'SM-F731': 'Samsung Galaxy Z Flip5',
  };
  
  return samsungModels[prefix] || model;
}

// Helper function to detect iPhone model by screen dimensions
function detectIPhoneByScreen(width: number, height: number, pixelRatio: number): string {
  const key = `${width}x${height}@${pixelRatio}`;
  
  const iosModels: { [key: string]: string } = {
    '320x568@2': 'iPhone SE (1st gen)',
    '375x667@2': 'iPhone SE (2022)',
    '375x812@3': 'iPhone 13 Mini',
    '390x844@3': 'iPhone 14',
    '393x852@3': 'iPhone 15',
    '414x896@2': 'iPhone 11',
    '414x896@3': 'iPhone 11 Pro Max',
    '428x926@3': 'iPhone 14 Pro Max',
    '430x932@3': 'iPhone 15 Pro Max',
  };
  
  return iosModels[key] || 'iPhone';
}

// Helper function to map Google Pixel models
function mapPixelModel(model: string): string {
  const lowerModel = model.toLowerCase();
  
  if (/pixel\s*8\s*pro/i.test(lowerModel)) {
    return 'Google Pixel 8 Pro';
  } else if (/pixel\s*8/i.test(lowerModel)) {
    return 'Google Pixel 8';
  } else if (/pixel\s*7\s*pro/i.test(lowerModel)) {
    return 'Google Pixel 7 Pro';
  } else if (/pixel\s*7a/i.test(lowerModel)) {
    return 'Google Pixel 7a';
  } else if (/pixel\s*7/i.test(lowerModel)) {
    return 'Google Pixel 7';
  } else if (/pixel\s*6\s*pro/i.test(lowerModel)) {
    return 'Google Pixel 6 Pro';
  } else if (/pixel\s*6a/i.test(lowerModel)) {
    return 'Google Pixel 6a';
  } else if (/pixel\s*6/i.test(lowerModel)) {
    return 'Google Pixel 6';
  }
  
  return model.split(/\s+/).slice(0, 3).join(' ');
}

// Helper function to map OnePlus/OPPO/Realme models
function mapOnePlusOPPOModel(model: string): string {
  const lowerModel = model.toLowerCase();
  
  if (/oneplus\s*11/i.test(lowerModel)) {
    return 'OnePlus 11';
  } else if (/oneplus\s*10\s*pro/i.test(lowerModel)) {
    return 'OnePlus 10 Pro';
  } else if (/oneplus\s*10t/i.test(lowerModel)) {
    return 'OnePlus 10T';
  } else if (/oneplus\s*9\s*pro/i.test(lowerModel)) {
    return 'OnePlus 9 Pro';
  } else if (/oneplus\s*9/i.test(lowerModel)) {
    return 'OnePlus 9';
  } else if (/oppo\s*find\s*x5\s*pro/i.test(lowerModel)) {
    return 'OPPO Find X5 Pro';
  } else if (/oppo\s*reno\s*8\s*pro/i.test(lowerModel)) {
    return 'OPPO Reno 8 Pro';
  } else if (/realme\s*gt/i.test(lowerModel)) {
    return 'Realme GT';
  } else if (/realme/i.test(lowerModel)) {
    return model.split(/\s+/).slice(0, 3).join(' ');
  }
  
  return model.split(/\s+/).slice(0, 2).join(' ');
}
