import { api, ApiResponse } from './api';

export type GoldRateData = {
  _id: string;
  ratePerGram: number;
  date: string;
  source?: string;
};

export async function getTodayGoldRate(): Promise<GoldRateData | null> {
  try {
    const response = await api.get<ApiResponse<GoldRateData>>('/api/goldrate/user/today');
    if (!response.data.success) return null;
    return response.data.data ?? null;
  } catch {
    return null;
  }
}
