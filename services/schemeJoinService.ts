import { api } from './api';

export type JoinRequest = {
  _id: string;
  planType?: 'Type1' | 'Type2';
  monthlyAmount?: number;
  startDate?: string;
  endDate?: string;
  totalMonths?: number;
  status: 'pending' | 'approved' | 'rejected' | 'awaiting_payment' | 'payment_verified';
  userNote?: string;
  adminNote?: string;
  template?: { name: string; monthlyAmount: number } | null;
  scheme?: { schemeId: string; monthlyAmount: number } | null;
  schemeCreated?: { schemeId: string; status: string; currentMonth: number; totalGramsAccumulated: number } | null;
  createdAt: string;
};

export async function getMyJoinRequests(): Promise<JoinRequest[]> {
  const res = await api.get('/api/scheme-join/my');
  return res.data.data ?? [];
}

export async function createTypeRequest(params: {
  planType: 'Type1' | 'Type2';
  monthlyAmount: number;
  startDate: string;
  endDate: string;
  termsAccepted: boolean;
  userNote?: string;
}): Promise<string> {
  const res = await api.post('/api/scheme-join/request-type', params);
  return res.data.message ?? 'Request submitted!';
}

export async function cancelJoinRequest(id: string): Promise<void> {
  await api.delete(`/api/scheme-join/${id}`);
}
