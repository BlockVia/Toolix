# Toolix Website - Railway Deployment Guide

This guide explains how to deploy the Toolix subscription website to [Railway.app](https://railway.app), connect a custom domain, and ensure the Stripe payments and dynamic code generation work correctly in production.

## 1. Prerequisites
- A GitHub account
- A Railway account (linked to GitHub)
- Your Stripe account (Live keys for production)

## 2. Prepare the Code
The application is already optimized for Railway deployment:
- `server.js` uses dynamic `PORT` allocation (`process.env.PORT || 3000`).
- The Stripe success/cancel URLs dynamically read the `Host` header to redirect correctly in production.
- A `railway.toml` file is included to instruct Railway to use NPM.

## 3. Deployment Steps

### Step 3.1: Push to GitHub
Upload the `website` folder and the `generated_codes.json` file to a new GitHub repository.
*Note: Make sure the path references map correctly in your repo so `server.js` can find the codes JSON file.*

### Step 3.2: Create a Railway Project
1. Go to your [Railway Dashboard](https://railway.app/dashboard).
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select the repository you just created.
4. Railway will automatically detect the Node.js environment via `railway.toml` and start building.

### Step 3.3: Set Environment Variables (Optional but Recommended)
In your Railway project panel:
1. Click on your service → **Variables**.
2. Add your **Live Stripe Secret Key**:
   `STRIPE_SECRET_KEY` = `sk_live_...`
   *(You'll need to update `server.js` to read from `process.env.STRIPE_SECRET_KEY` instead of the hardcoded test key when you are ready for real payments).*

## 4. Connecting a Custom Domain

Once the app is deployed on Railway, you'll want to add your custom domain (e.g., `toolix.com`):

1. In the Railway dashboard, click on your service.
2. Go to the **Settings** tab.
3. Scroll down to **Networking** → **Domains**.
4. Click **Custom Domain** and enter your domain name.
5. Railway will provide DNS records (e.g., a `CNAME` or `A` record).
6. Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add the DNS records provided by Railway.
7. Once DNS propagates (usually a few minutes), your website will be live at your custom domain with automatic SSL (HTTPS).

## 5. Persistent Storage for `generated_codes.json`

**⚠️ CRITICAL WARNING FOR PRODUCTION:**
Railway uses ephemeral containers. This means that every time you deploy an update or Railway restarts your container, local file changes (like adding new things to `generated_codes.json`) **will be lost**.

**How to fix this in production:**
Railway offers Persistent Volumes.
1. In Railway, go to your service → **Volumes** → **Add Volume**.
2. Mount the volume to a path in your container (e.g., `/app/data`).
3. Update `server.js` to point `CODES_FILE` to `/app/data/generated_codes.json` instead of `../generated_codes.json`.
4. Update `license_manager.py` locally to sync with your database, or run the Python tool and Website from the exact same environment.

*(For a fully robust production system, consider migrating `generated_codes.json` to a real database like PostgreSQL or Redis, which Railway offers as 1-click plugins).*
