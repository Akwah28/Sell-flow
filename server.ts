import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for server-side subdomain lookup
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Helper to validate clean storefront slugs
function isStorefrontSlug(path: string): boolean {
  if (!path) return false;
  if (path.includes('.')) return false;
  const reserved = ['assets', 'api', 'dashboard', 'products', 'leads', 'followups', 'orders', 'reviews', 'settings', 'index.html'];
  if (reserved.includes(path.toLowerCase())) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(path);
}

// Helper to extract subdomain from request host
function getSubdomainFromHost(host: string | undefined): string | null {
  if (!host) return null;
  const hostWithoutPort = host.toLowerCase().trim().split(':')[0];
  
  // Custom Domain Subdomain Extraction
  const mainDomain = "mysellflow.store";
  if (hostWithoutPort.endsWith(mainDomain)) {
    const sIndex = hostWithoutPort.lastIndexOf(mainDomain);
    const subPart = hostWithoutPort.substring(0, sIndex);
    const cleanSub = subPart.replace(/\.$/, '').trim();
    
    if (!cleanSub) return null; // Root domain
    
    // Check reserved names
    const reserved = ['www', 'admin', 'api', 'app', 'sales', 'dashboard', 'support', 'mail', 'blog'];
    if (reserved.includes(cleanSub)) return null;
    
    if (isStorefrontSlug(cleanSub)) {
      return cleanSub;
    }
  }
  
  // Local Development Subdomain Extraction
  if (hostWithoutPort.endsWith('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length > 1) {
      const sub = parts[0].trim();
      const reserved = ['www', 'admin', 'api', 'localhost'];
      if (!reserved.includes(sub) && isStorefrontSlug(sub)) {
        return sub;
      }
    }
  }
  
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Send WhatsApp Message via Meta Graph API
  app.post("/api/whatsapp/send", async (req, res) => {
    const { to, message, token, phoneId } = req.body;

    const accessToken = token || process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = phoneId || process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
      return res.status(500).json({ 
        error: "WhatsApp API credentials are not configured in environment variables." 
      });
    }

    // Clean phone number (Meta expects digits only, usually with country code)
    const cleanTo = to.replace(/[^0-9]/g, '');

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanTo,
            type: "text",
            text: {
              preview_url: false,
              body: message,
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error("WhatsApp API Error:", data);
        return res.status(response.status).json(data);
      }

      res.json({ success: true, data });
    } catch (error) {
      console.error("Internal Server Error:", error);
      res.status(500).json({ error: "Failed to send WhatsApp message" });
    }
  });

  // API Route: Send Email Notification
  app.post("/api/notifications/email", async (req, res) => {
    const { to, subject, html } = req.body;

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM;

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error("SMTP Configuration Missing");
      return res.status(500).json({ 
        error: "Email notifications are not configured. Please check SMTP settings." 
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpFrom || smtpUser,
        to,
        subject,
        html,
      });

      console.log("Email sent: %s", info.messageId);
      res.json({ success: true, messageId: info.messageId });
    } catch (error) {
      console.error("Email Sending Error:", error);
      res.status(500).json({ error: "Failed to send email notification" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    app.get("*", async (req, res) => {
      // Extract subdomain from request host
      const host = req.headers.host;
      const subdomain = getSubdomainFromHost(host);
      
      if (subdomain) {
        console.log(`[Subdomain Gateway] Routing subdomain host: "${subdomain}"`);
        try {
          // Query slugs collection for this storefront owner
          const slugDocRef = doc(db, 'slugs', subdomain);
          const slugSnap = await getDoc(slugDocRef);
          
          if (!slugSnap.exists()) {
            console.log(`[Subdomain Gateway] Storefront slug "${subdomain}" not found in Firestore.`);
            // Return professional 404 HTML
            return res.status(404).send(`
              <!doctype html>
              <html lang="en">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>Store Not Found | mysellflow</title>
                  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet">
                  <script src="https://cdn.tailwindcss.com"></script>
                  <style>
                    body { font-family: 'Plus Jakarta Sans', sans-serif; }
                  </style>
                </head>
                <body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-6">
                  <div class="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl text-center space-y-6">
                    <div class="mx-auto w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center border border-red-500/20 text-3xl font-black italic">
                      !
                    </div>
                    <div class="space-y-2">
                      <h1 class="text-2xl font-black uppercase tracking-tight italic">Storefront Offline</h1>
                      <p class="text-slate-400 text-sm leading-relaxed">
                        The storefront <span class="text-sky-400 font-bold font-mono">${subdomain}</span> does not exist or has been deactivated on our marketplace system.
                      </p>
                    </div>
                    <div class="pt-4 border-t border-slate-800">
                      <p class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">SaaS Storefront Infrastructure</p>
                      <a href="https://mysellflow.store" class="mt-4 inline-block w-full bg-white hover:bg-slate-100 text-slate-950 font-black uppercase tracking-wider text-xs py-3.5 rounded-xl transition-all shadow-lg">
                        Create Your Own Storefront
                      </a>
                    </div>
                  </div>
                </body>
              </html>
            `);
          }
          
          const { ownerId } = slugSnap.data();
          const bizSnap = await getDoc(doc(db, 'businesses', ownerId));
          
          if (bizSnap.exists()) {
            const businessData = bizSnap.data();
            const storeName = businessData.name || "My Storefront";
            const storeDesc = businessData.description || "Welcome to our store.";
            const metaTitle = businessData.metaTitle || `${storeName} | Storefront`;
            const metaDesc = businessData.metaDescription || storeDesc;
            
            // Serve index.html dynamically replacing metadata for maximum SEO optimization!
            const htmlPath = path.join(distPath, "index.html");
            let htmlContent = fs.readFileSync(htmlPath, "utf-8");
            
            // Dynamically inject target store meta tags into <head>
            htmlContent = htmlContent.replace(/<title>.*?<\/title>/, `<title>${metaTitle}</title>`);
            
            const metaTags = `
              <title>${metaTitle}</title>
              <meta name="description" content="${metaDesc}" />
              <meta property="og:title" content="${metaTitle}" />
              <meta property="og:description" content="${metaDesc}" />
              <meta property="og:type" content="website" />
              <meta name="twitter:card" content="summary_large_image" />
            `;
            htmlContent = htmlContent.replace("<head>", `<head>${metaTags}`);
            
            return res.send(htmlContent);
          }
        } catch (error) {
          console.error(`[Subdomain Gateway] Lookup exception:`, error);
        }
      }
      
      // Default: Fallback to normal dashboard Single Page Application
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
