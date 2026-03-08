/**
 * N1Panel SMM Panel API Integration Service
 * Handles communication with N1Panel.com API for Telegram reactions
 */

export interface N1PanelService {
  service: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill?: boolean;
  cancel?: boolean;
  description?: string;
}

export interface N1PanelOrderResponse {
  order?: number;
  error?: string;
}

export interface N1PanelStatusResponse {
  charge?: string;
  start_count?: string;
  status?: string;
  remains?: string;
  currency?: string;
  error?: string;
}

export interface N1PanelBalanceResponse {
  balance?: string;
  currency?: string;
  error?: string;
}

export class N1PanelAPIService {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Make a request to the N1Panel API
   */
  private async makeRequest(params: Record<string, any>): Promise<any> {
    const formData = new URLSearchParams();
    formData.append('key', this.apiKey);
    
    for (const [key, value] of Object.entries(params)) {
      formData.append(key, String(value));
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('N1Panel API request failed:', error);
      throw error;
    }
  }

  /**
   * Get all available services from N1Panel
   */
  async getServices(): Promise<N1PanelService[]> {
    const response = await this.makeRequest({ action: 'services' });
    return response || [];
  }

  /**
   * Get services filtered by category (e.g., "Telegram")
   */
  async getTelegramServices(): Promise<N1PanelService[]> {
    const services = await this.getServices();
    return services.filter(s => 
      s.category?.toLowerCase().includes('telegram') || 
      s.name?.toLowerCase().includes('telegram')
    );
  }

  /**
   * Place an order for Telegram reactions
   */
  async placeOrder(serviceId: number, link: string, quantity: number): Promise<N1PanelOrderResponse> {
    const params = {
      action: 'add',
      service: serviceId,
      link: link,
      quantity: quantity,
    };

    return await this.makeRequest(params);
  }

  /**
   * Get order status by order ID
   */
  async getOrderStatus(orderId: number): Promise<N1PanelStatusResponse> {
    const params = {
      action: 'status',
      order: orderId,
    };

    return await this.makeRequest(params);
  }

  /**
   * Get status for multiple orders
   */
  async getMultipleOrderStatus(orderIds: number[]): Promise<any> {
    const params = {
      action: 'status',
      orders: orderIds.join(','),
    };

    return await this.makeRequest(params);
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<N1PanelBalanceResponse> {
    const params = {
      action: 'balance',
    };

    return await this.makeRequest(params);
  }

  /**
   * Refill an order (if supported by service)
   */
  async refillOrder(orderId: number): Promise<any> {
    const params = {
      action: 'refill',
      order: orderId,
    };

    return await this.makeRequest(params);
  }

  /**
   * Cancel orders (if supported by service)
   */
  async cancelOrders(orderIds: number[]): Promise<any> {
    const params = {
      action: 'cancel',
      orders: orderIds.join(','),
    };

    return await this.makeRequest(params);
  }
}

/**
 * Create an N1Panel API service instance from settings
 */
export function createN1PanelService(apiUrl: string, apiKey: string): N1PanelAPIService {
  return new N1PanelAPIService(apiUrl, apiKey);
}
