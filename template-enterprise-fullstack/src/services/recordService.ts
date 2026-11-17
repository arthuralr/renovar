import { api } from '../api/apiClient';

export interface EnterpriseRecord {
  id: string;
  entity_name: string;
  status: string;
  metadata: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const recordService = {
  async getAll(): Promise<EnterpriseRecord[]> {
    const res = await api.get<{ ok: boolean; data: EnterpriseRecord[] }>('/api/records');
    return res.data || [];
  },

  async save(record: {
    id: string;
    entityName: string;
    status: string;
    metadata: Record<string, any>;
  }): Promise<EnterpriseRecord> {
    const res = await api.post<{ ok: boolean; data: EnterpriseRecord }>('/api/records', record);
    return res.data;
  },

  async delete(id: string): Promise<boolean> {
    const res = await api.delete<{ ok: boolean }>(`/api/records/${id}`);
    return res.ok;
  },
};
