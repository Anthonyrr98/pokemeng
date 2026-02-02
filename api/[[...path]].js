/**
 * Vercel Serverless 入口：将 /api/* 请求转发到 Express 后端
 * 前端 VITE_BACKEND_URL 应设为你的 Vercel 域名，例如 https://xxx.vercel.app
 * 这样请求会发到 https://xxx.vercel.app/api/health、/api/auth/register 等
 */
const app = require('../backend/index');

module.exports = (req, res) => {
  app(req, res);
};
