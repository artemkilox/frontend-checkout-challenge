export const apiPaths = {
  root: '/api',
  sessions: '/api/sessions',
  session: (sessionId: string) => `/api/sessions/${sessionId}`,
  products: '/api/products',
  sandbox: '/api/sandbox',
  cart: '/api/cart',
  cartItem: (productId: string) => `/api/cart/items/${productId}`,
  checkoutOptions: '/api/checkout/options',
  quotes: '/api/quotes',
  quote: (quoteId: string) => `/api/quotes/${quoteId}`,
  orders: '/api/orders',
  order: (orderId: string) => `/api/orders/${orderId}`,
  orderPayments: (orderId: string) => `/api/orders/${orderId}/payments`,
  payment: (paymentId: string) => `/api/payments/${paymentId}`,
  paymentSimulations: (paymentId: string) => `/api/payments/${paymentId}/simulations`,
  paymentSimulation: (paymentId: string, simulationId: string) =>
    `/api/payments/${paymentId}/simulations/${simulationId}`,
} as const;
