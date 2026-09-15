export type Money = number;

export type Product = {
  id: string;
  sku: string;
  title: string;
  description: string;
  price: Money;
  currency: 'RUB';
  stock: number;
};

export type CartItem = {
  productId: string;
  title: string;
  unitPrice: Money;
  quantity: number;
  lineTotal: Money;
};

export type Cart = {
  id: string;
  version: number;
  items: CartItem[];
  quantity: number;
  subtotal: Money;
  currency: 'RUB';
};

export type Address = {
  city: string;
  street: string;
  house: string;
  apartment?: string;
};

export type Delivery =
  | { method: 'pickup'; pickupPointId: 'point-center' | 'point-north' }
  | { method: 'courier'; address: Address };

export type PaymentMethod = 'card' | 'cash_on_delivery';

export type Customer = {
  name: string;
  email: string;
  phone: string;
};

export type PickupPoint = {
  id: string;
  title: string;
  address: string;
};

export type DeliveryOption = {
  id: 'pickup' | 'courier';
  title: string;
  price: Money;
  freeFrom: Money | null;
  pickupPoints: PickupPoint[];
};

export type PaymentOption = {
  id: PaymentMethod;
  title: string;
};

export type CheckoutOptions = {
  cart: Cart;
  deliveryMethods: DeliveryOption[];
  paymentMethods: PaymentOption[];
};

export type Quote = {
  id: string;
  cartVersion: number;
  items: CartItem[];
  delivery: Delivery;
  subtotal: Money;
  shipping: Money;
  total: Money;
  currency: 'RUB';
  expiresAt: string;
};

export type OrderStatus = 'awaiting_payment' | 'paid' | 'confirmed';
export type OrderPaymentStatus = 'unpaid' | 'pending' | 'succeeded' | 'failed' | 'cancelled';

export type Order = {
  id: string;
  number: string;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: PaymentMethod;
  customer: Customer;
  items: CartItem[];
  delivery: Delivery;
  subtotal: Money;
  shipping: Money;
  total: Money;
  currency: 'RUB';
  createdAt: string;
};

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

export type Payment = {
  id: string;
  orderId: string;
  status: PaymentStatus;
  amount: Money;
  currency: 'RUB';
  createdAt: string;
  failureCode: 'CARD_DECLINED' | null;
};

export type PaymentScenario = 'success' | 'decline' | 'cancel';

export type Simulation = {
  id: string;
  paymentId: string;
  scenario: PaymentScenario;
  status: PaymentStatus;
};

export type SandboxCard = {
  id: string;
  title: string;
  maskedNumber: string;
  scenario: 'success' | 'decline';
};

export type Sandbox = {
  settlementDelayMs: number;
  cards: SandboxCard[];
};

export type Session = {
  id: string;
  token: string;
  cart: Cart;
};

export type SessionInfo = {
  id: string;
  cartId: string;
};

export type CreateOrderBody = {
  quoteId: string;
  customer: Customer;
  paymentMethod: PaymentMethod;
};

export type SetCartItemBody = {
  quantity: number;
};

export type QuoteBody = {
  cartVersion: number;
  delivery: Delivery;
};
