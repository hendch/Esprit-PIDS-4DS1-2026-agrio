import axios from 'axios';
import { Platform } from 'react-native';

const API_BASE_URL = 'http://192.168.1.16:8000';

export interface IrrigationDecisionResponse {
  decision: string;
}

export interface DashboardData {
  weather: any[] | null;
  moisture: { moisture_percent: number; status: string; history?: any[] } | null;
  usage_today: number | null;
  usage_history?: { history: any[]; water_saved_pct: number } | null;
}

export interface ScheduleRequest {
  field_id: string;
  target_date: string;
  start_time: string;
  duration_minutes: number;
  water_volume: number;
}

export const irrigationApi = {
  checkIrrigation: async (crop: string, lat: number, lon: number): Promise<IrrigationDecisionResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/v1/irrigation/check`, {
        crop,
        lat,
        lon
      });
      return response.data;
    } catch (error) {
      console.error('Error checking irrigation API:', error);
      throw error;
    }
  },

  getDashboardData: async (): Promise<DashboardData> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/irrigation/dashboard`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  createSchedule: async (data: ScheduleRequest): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/irrigation/schedule`, data);
    } catch (error) {
      console.error('Error creating schedule:', error);
      throw error;
    }
  },

  getAutonomousState: async (): Promise<{ autonomous: boolean }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/irrigation/autonomous`);
      return response.data;
    } catch (error) {
      console.error('Error fetching autonomous state:', error);
      throw error;
    }
  },

  setAutonomousState: async (autonomous: boolean): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/irrigation/autonomous`, { autonomous });
    } catch (error) {
      console.error('Error setting autonomous state:', error);
      throw error;
    }
  },

  getSchedules: async (): Promise<{ schedules: any[] }> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/v1/irrigation/schedules`);
      return response.data;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
  }
};