import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "/api",
});

export const createIssue = (text) => api.post("/ai/create-issue", { text });

export const composeProjectIssue = (payload) =>
  api.post("/ai/create-issue", payload);

export const getProjects = () => api.get("/projects");

export const previewProjectContext = (projectKey, params = {}) =>
  api.get(`/projects/${projectKey}/context-preview`, { params });

export const updateIssue = (text) => api.post("/ai/update-issue", { text });

export const deleteIssueAI = (text) => api.post("/ai/delete-issue", { text });

export const generateReport = (payload) => api.post("/ai/generate-report", payload);

export const searchIssues = (params) => api.get("/jira/issues", { params });

export const searchIssuesWithAI = (text) =>
  api.post("/ai/search-issues", { text });

export default api;
