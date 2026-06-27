import express from 'express';
import path from 'path';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://aqifyxsimhqayfjwzzwj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Some database operations may fail.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());

  // Proxy /supabase to the actual Supabase project
  // MUST be before express.json() to prevent body from being consumed
  if (SUPABASE_URL) {
    app.use(
      '/supabase',
      createProxyMiddleware({
        target: SUPABASE_URL,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          '^/supabase': '', // remove /supabase prefix when forwarding
        },
        on: {
          proxyReq: (proxyReq, req, res) => {
            if (proxyReq.path.startsWith('/auth/v1/')) {
              proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
              // If there's no auth header, or it has dummy-anon-key, inject the real anon key
              if (!req.headers.authorization || req.headers.authorization.includes('dummy-anon-key') || req.headers.authorization === `Bearer sb_publishable_Qdmf44q1ASJboY1_AZoOVQ_YfYrWvcB`) {
                // Actually GoTrue needs the anon key in Bearer for anon requests
                // Wait, if it's a login request, the user doesn't have a session JWT yet.
                // The Supabase client sends the anon key as the Bearer token for login.
                proxyReq.setHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
              }
            } else if (proxyReq.path.startsWith('/rest/v1/') || proxyReq.path.startsWith('/graphql/v1/') || proxyReq.path.startsWith('/storage/v1/') || proxyReq.path.startsWith('/realtime/v1/')) {
              proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
              if (!req.headers.authorization || req.headers.authorization.includes('dummy-anon-key')) {
                proxyReq.setHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
              }
            }
          },
          proxyReqWs: (proxyReq, req, socket, options, head) => {
            proxyReq.setHeader('apikey', SUPABASE_ANON_KEY);
          }
        }
      })
    );
  }

  app.use(express.json());

  // Initialize server-side Supabase client lazily
  let serverSupabase: any = null;
  const getServerSupabase = () => {
    if (!serverSupabase) {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing database credentials in server environment');
      }
      serverSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    }
    return serverSupabase;
  };

  app.post('/api/db/insert', async (req, res) => {
    const { table, record } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Insert] Inserting into ${table}`, record);
      const { data, error } = await db.from(table).insert(record).select();
      if (error) {
        if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
          console.error(`[Server DB Insert Error] ${table}`, error);
        }
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Insert Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/update', async (req, res) => {
    const { table, matchColumn, matchValue, updates } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Update] Updating ${table} where ${matchColumn}=${matchValue}`, updates);
      const { data, error } = await db.from(table).update(updates).eq(matchColumn, matchValue).select();
      if (error) {
        if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
          console.error(`[Server DB Update Error] ${table}`, error);
        }
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Update Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/upsert', async (req, res) => {
    const { table, record } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Upsert] Upserting into ${table}`, record);
      const { data, error } = await db.from(table).upsert(record).select();
      if (error) {
        if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
          console.error(`[Server DB Upsert Error] ${table}`, error);
        }
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      if (!['activity_logs', 'notifications', 'analytics_snapshots', 'login_logs'].includes(table)) {
        console.error(`[Server DB Upsert Exception] ${table}`, err);
      }
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  app.post('/api/db/delete', async (req, res) => {
    const { table, matchColumn, matchValue } = req.body;
    try {
      const db = getServerSupabase();
      console.log(`[Server DB Delete] Deleting from ${table} where ${matchColumn}=${matchValue}`);
      const { error } = await db.from(table).delete().eq(matchColumn, matchValue);
      if (error) {
        console.error(`[Server DB Delete Error] ${table}`, error);
        return res.status(400).json({ success: false, error: error.message });
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error(`[Server DB Delete Exception] ${table}`, err);
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
