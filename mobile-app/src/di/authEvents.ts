/**
 * Event Emitter đơn giản để xử lý các sự kiện xác thực
 * Dùng để Interceptor notify App khi cần logout
 */

type AuthEventListener = (event: AuthEvent) => void;

export interface AuthEvent {
  type: 'LOGIN_SUCCESS' | 'LOGOUT' | 'TOKEN_EXPIRED' | 'REFRESH_FAILED';
  payload?: any;
}

class AuthEventEmitter {
  private listeners: AuthEventListener[] = [];

  /**
   * Subscribe to auth events
   */
  subscribe(listener: AuthEventListener): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit auth event
   */
  emit(event: AuthEvent): void {
    console.log(`📢 AuthEvent emitted:`, event.type);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('❌ Error in auth event listener:', error);
      }
    });
  }
}

export const authEventEmitter = new AuthEventEmitter();
