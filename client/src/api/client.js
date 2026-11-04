// In development, Vite proxies "/api" to the backend (see vite.config.js), so no env var is needed.
// In production (Vercel/Netlify), set VITE_API_URL to the deployed backend's URL,
// e.g. https://nexora-api.onrender.com — no trailing slash.
const BASE_URL = `${import.meta.env.VITE_API_URL || ""}/api`;

// If the server says our login is no longer valid (expired token, deleted account), clear it and go to the login page.
// A wrong password at the login form is also a 401, so that one request is excluded.
function handleUnauthorized(res, path) {
  if (res.status === 401 && path !== "/auth/login") {
    localStorage.removeItem("nexora_auth");
    window.location.href = "/login";
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    handleUnauthorized(res, path);
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

// Multipart upload (the browser sets the Content-Type boundary itself, so we must NOT set it)
async function upload(path, formData, token) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    handleUnauthorized(res, path);
    throw new Error(data.message || `Upload failed (${res.status})`);
  }
  return data;
}

// Downloads need the JWT, so a plain <a href> can't be used — fetch the bytes and save them.
async function download(path, token, filename = "file") {
  const res = await fetch(`${BASE_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) {
    handleUnauthorized(res, path);
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Download failed (${res.status})`);
  }
  const blobUrl = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}

export const api = {
  upload,
  download,
  get: (path, token) => request(path, { method: "GET", token }),
  post: (path, body, token) => request(path, { method: "POST", body, token }),
  put: (path, body, token) => request(path, { method: "PUT", body, token }),
  del: (path, token) => request(path, { method: "DELETE", token }),
};
