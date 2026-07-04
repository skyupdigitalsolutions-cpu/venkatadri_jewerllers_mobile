import { api, ApiResponse } from './api';

export type ShopPaymentInfo = {
  shopName: string;
  shopCode: string;
  ownerName: string;
  email?: string;
  phone: string;
  upiId?: string;
  upiPayeeName?: string;
  bankName?: string;
  qrCodeUrl?: string;
  adminPhoto?: string | null;
};

export type ScreenshotAsset = {
  uri: string;
  type?: string;
  fileName?: string;
};

export async function getShopPaymentInfo(): Promise<ShopPaymentInfo> {
  const response = await api.get<ApiResponse<ShopPaymentInfo>>('/api/auth/shop-payment-info');
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || 'Failed to load payment info');
  }
  return response.data.data;
}

export async function submitPaymentProof(params: {
  schemeId: string;
  monthNumber?: number;
  utrNumber?: string;
  userNote?: string;
  screenshot?: ScreenshotAsset | null;
}): Promise<string> {
  const { schemeId, monthNumber, utrNumber, userNote, screenshot } = params;

  // Build FormData so we can attach the screenshot file if present
  const form = new FormData();
  form.append('schemeId', schemeId);
  if (monthNumber != null) form.append('monthNumber', String(monthNumber));
  if (utrNumber?.trim()) form.append('utrNumber', utrNumber.trim());
  if (userNote?.trim()) form.append('userNote', userNote.trim());
  if (screenshot?.uri) {
    // React Native FormData accepts this object literal shape
    form.append('screenshot', {
      uri: screenshot.uri,
      type: screenshot.type ?? 'image/jpeg',
      name: screenshot.fileName ?? 'payment_proof.jpg',
    } as unknown as Blob);
  }

  const response = await api.post<ApiResponse<unknown>>('/api/payments/submit', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to submit payment');
  }
  return response.data.message || 'Payment proof submitted!';
}
