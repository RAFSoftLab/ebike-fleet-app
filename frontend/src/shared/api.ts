import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";

let accessToken: string | null = localStorage.getItem("access_token");

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem("access_token", token);
  } else {
    localStorage.removeItem("access_token");
  }
};

const instance: AxiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true, // needed for refresh cookie
});

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

instance.interceptors.response.use(
  (resp) => resp,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        await new Promise<void>((resolve) => pendingRequests.push(resolve));
        return instance(original);
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshResp = await instance.post("/auth/refresh");
        const newToken = (refreshResp.data as any)?.access_token as string;
        setAccessToken(newToken);
        pendingRequests.forEach((resolve) => resolve());
        pendingRequests = [];
        return instance(original);
      } catch (e) {
        pendingRequests = [];
        setAccessToken(null);
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export const api = instance;

