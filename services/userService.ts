import { api, ApiResponse } from './api';

export type Scheme = {
  _id: string;
  schemeId: string;
  monthlyAmount: number;
  startDate: string;
  dueDay?: number;
  totalMonths: number;
  currentMonth: number;
  totalGramsAccumulated: number;
  totalAmountAccumulated?: number;
  status: 'active' | 'complete' | 'early_exit' | 'pending';
  description?: string;
  planType?: 'Type1' | 'Type2';
  completionDate?: string | null;
};

export type Payment = {
  _id: string;
  paymentId?: string;
  scheme?: { _id: string; schemeId: string; monthlyAmount: number; startDate: string } | null;
  monthNumber: number;
  amount: number;
  goldRateOnPaymentDay: number;
  gramsAdded: number;
  paidDate?: string | null;
  dueDate?: string | null;
  status: 'paid' | 'pending' | 'overdue' | 'awaiting_verification' | 'rejected';
  paymentMode?: string;
  screenshotUrl?: string;
  utrNumber?: string;
  userNote?: string;
  rejectionReason?: string;
  createdAt?: string;
};

export type UserProfile = {
  _id: string;
  userId?: string;
  name: string;
  phone: string;
  email?: string;
  shopCode?: string;
  status?: string;
  address?: string;
  occupation?: string;
  dateOfBirth?: string | null;
  userPhoto?: string | null;
  schemes?: Scheme[];
  payments?: Payment[];
};

export async function getMyProfile(): Promise<UserProfile> {
  const response = await api.get<ApiResponse<UserProfile>>('/api/users/me');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to load profile');
  }
  return response.data.data;
}

export async function refreshUserProfile(): Promise<UserProfile> {
  return getMyProfile();
}
