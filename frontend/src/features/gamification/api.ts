import { httpClient } from '../../core/api/httpClient';
import type {
  AwardLoginResponse,
  CompleteTaskResponse,
  GamificationDashboard,
  LeaderboardEntry,
} from './types';

export const getDashboard = (): Promise<GamificationDashboard> =>
  httpClient.get('/api/v1/gamification/dashboard').then(r => r.data);

export const awardLogin = (): Promise<AwardLoginResponse> =>
  httpClient.post('/api/v1/gamification/login').then(r => r.data);

export const completeTask = (task_key: string): Promise<CompleteTaskResponse> =>
  httpClient.post(`/api/v1/gamification/tasks/${task_key}/complete`).then(r => r.data);

export const getLeaderboard = (): Promise<LeaderboardEntry[]> =>
  httpClient.get('/api/v1/gamification/leaderboard').then(r => r.data);
