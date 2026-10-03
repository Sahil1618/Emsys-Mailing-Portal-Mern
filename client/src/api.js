// import axios from 'axios';
// export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
// api.interceptors.request.use(c=>{const t=localStorage.getItem('adminToken');if(t)c.headers.Authorization=`Bearer ${t}`;return c;});
// export function isAdmin(){return !!localStorage.getItem('adminToken');}


import axios from 'axios';
export const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});
api.interceptors.request.use(c=>{const t=localStorage.getItem('adminToken');if(t)c.headers.Authorization=`Bearer ${t}`;return c;});
// Only admin-protected routes (Manage Entities) can return 401 now. If the admin session expires,
// clear the token and tell the app so it can show the login screen again.
api.interceptors.response.use(r=>r,err=>{
  if(err.response?.status===401&&!String(err.config?.url||'').includes('/auth/login')){
    localStorage.removeItem('adminToken');
    window.dispatchEvent(new Event('admin-expired'));
  }
  return Promise.reject(err);
});
export function isAdmin(){return !!localStorage.getItem('adminToken');}