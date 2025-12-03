/**
 * Simple event bus for real-time communication between components
 */

type EventCallback = (data?: any) => void;

class EventBus {
  private events: { [key: string]: EventCallback[] } = {};

  on(event: string, callback: EventCallback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: EventCallback) {
    if (!this.events[event]) return;
    
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, data?: any) {
    if (!this.events[event]) return;
    
    this.events[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event callback for ${event}:`, error);
      }
    });
  }

  // Product-related events
  emitProductAdded(product: any) {
    this.emit('product:added', product);
  }

  emitProductUpdated(product: any) {
    this.emit('product:updated', product);
  }

  emitProductDeleted(productId: string) {
    this.emit('product:deleted', productId);
  }

  emitStockUpdated(productId: string, newStock: number) {
    this.emit('stock:updated', { productId, newStock });
  }

  // Listeners
  onProductAdded(callback: (product: any) => void) {
    this.on('product:added', callback);
  }

  onProductUpdated(callback: (product: any) => void) {
    this.on('product:updated', callback);
  }

  onProductDeleted(callback: (productId: string) => void) {
    this.on('product:deleted', callback);
  }

  onStockUpdated(callback: (data: { productId: string, newStock: number }) => void) {
    this.on('stock:updated', callback);
  }
}

// Create singleton instance
export const eventBus = new EventBus();

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).eventBus = eventBus;
}



