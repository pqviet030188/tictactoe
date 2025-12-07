import { createRequest } from './requests';
import type { ComputeRequest, ComputeResponse } from '../types';

// Game API functions
export const gameApi = {
  async computeMove(data: ComputeRequest): Promise<ComputeResponse> {
    const request = createRequest<ComputeRequest, ComputeResponse>('/Computation', 'POST');
    request.setPayload(data);
    const response = await request.send({
      payload: data,
    });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Computation failed');
    }
    
    return response.data!;
  }
};