import { request } from '../client';
import { apiPaths } from '../paths';
import type { Payment, PaymentScenario, Simulation } from '../types';

export function getPayment(paymentId: string, token: string, signal?: AbortSignal) {
  return request<Payment>({
    method: 'GET',
    path: apiPaths.payment(paymentId),
    token,
    signal,
  });
}

export function createPaymentSimulation(
  paymentId: string,
  scenario: PaymentScenario,
  token: string,
  signal?: AbortSignal,
) {
  return request<Simulation>({
    method: 'POST',
    path: apiPaths.paymentSimulations(paymentId),
    token,
    body: { scenario },
    signal,
  });
}

export function getPaymentSimulation(paymentId: string, simulationId: string, token: string) {
  return request<Simulation>({
    method: 'GET',
    path: apiPaths.paymentSimulation(paymentId, simulationId),
    token,
  });
}
