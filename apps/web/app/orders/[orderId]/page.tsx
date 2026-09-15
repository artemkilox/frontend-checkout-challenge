import { OrderScreen } from '@/features/order/OrderScreen';

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderScreen orderId={orderId} />;
}
