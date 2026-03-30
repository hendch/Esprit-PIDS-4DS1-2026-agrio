import axios from "axios";

import { useUserStore } from "../userStore/userStore";

import { getApiBaseUrl } from "./apiBaseUrl";

export const API_TIMEOUT_MS = 8000;

export const httpClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: API_TIMEOUT_MS,
});

httpClient.interceptors.request.use((config) => {
  const token = useUserStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
