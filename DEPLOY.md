# 🚀 ClarityAI — Complete Deployment Guide

> **Goal:** Is app ko free ya minimum cost mein production mein deploy karna.  
> **Recommended Stack:** Vercel (frontend + API) + Turso (database) — dono ke free tiers kaafi hain.

---

## 📋 Table of Contents

1. [Prerequisites — Pehle Ye Sab Chahiye](#1-prerequisites)
2. [Step 1 — Turso Database Setup (Free)](#2-step-1--turso-database-setup)
3. [Step 2 — GitHub OAuth App Setup](#3-step-2--github-oauth-setup)
4. [Step 3 — Sarvam AI API Key](#4-step-3--sarvam-ai-api-key)
5. [Step 4 — Code Mein Kya Changes Karne Hain](#5-step-4--code-changes)
6. [Step 5 — Vercel Par Deploy Karna](#6-step-5--vercel-deployment)
7. [Step 6 — Environment Variables Vercel Mein Set Karna](#7-step-6--environment-variables)
8. [Step 7 — Database Schema Push Karna](#8-step-7--database-schema)
9. [Deployment Cost Breakdown](#9-cost-breakdown)
10. [Common Errors aur Unke Fixes](#10-common-errors)
11. [Custom Domain Add Karna (Optional)](#11-custom-domain)

---

## 1. Prerequisites

Ye sab pehle se hona chahiye ya install karna padega:

| Cheez | Kyun Chahiye | Link |
|---|---|---|
| Node.js 18+ | App run karne ke liye | [nodejs.org](https://nodejs.org) |
| Git | Code push karne ke liye | [git-scm.com](https://git-scm.com) |
| GitHub Account | Code host + OAuth ke liye | [github.com](https://github.com) |
| Vercel Account | Free hosting ke liye | [vercel.com](https://vercel.com) |
| Turso Account | Free database ke liye | [turso.tech](https://turso.tech) |
| Sarvam AI Key | AI model ke liye | [sarvam.ai](https://sarvam.ai) |

---

## 2. Step 1 — Turso Database Setup

Turso ek free SQLite cloud database hai jo is app ke liye perfect hai.

### Turso CLI Install Karo

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
winget install turso
```

### Login aur Database Banao

```bash
# Login karo
turso auth login

# Naya database banao (naam apna rakh sakte ho)
turso db create clarityai-db

# Database ka URL lo
turso db show clarityai-db --url
# Output kuch aisa hoga: libsql://clarityai-db-username.turso.io

# Auth token banao
turso db tokens create clarityai-db
# Ye ek lamba token string dega — ise copy karke rakh lo
```

> ✅ In dono values ko kahi safe jagah note karo:
> - `TURSO_DATABASE_URL` = `libsql://clarityai-db-username.turso.io`
> - `TURSO_AUTH_TOKEN` = `eyJ...` (lamba token)

---

## 3. Step 2 — GitHub OAuth Setup

NextAuth ke liye GitHub OAuth app banana padega jisse users login kar sakein.

### GitHub Par OAuth App Banao

1. GitHub.com par jao → **Settings** → **Developer settings** → **OAuth Apps**
2. Click karo **"New OAuth App"**
3. Fill karo:
   - **Application name:** `ClarityAI`
   - **Homepage URL:** `https://your-app-name.vercel.app` *(baad mein update hoga)*
   - **Authorization callback URL:** `https://your-app-name.vercel.app/api/auth/callback/github`
4. Click **"Register application"**
5. **Client ID** copy karo → ye `GITHUB_ID` hoga
6. **"Generate a new client secret"** click karo → ye `GITHUB_SECRET` hoga

> ⚠️ **Important:** Jab Vercel par deploy hoga, tab callback URL update karna padega actual domain ke saath.

---

## 4. Step 3 — Sarvam AI API Key

1. [sarvam.ai](https://sarvam.ai) par jao
2. Account banao / login karo
3. Dashboard mein API Keys section mein jao
4. Naya key generate karo
5. Copy karo — ye `SARVAM_API_KEY` hoga

---

## 5. Step 4 — Code Changes

> **Good news:** Bahut zyada changes nahi karni hain. Mostly environment variables ka kaam hai. Lekin kuch important cheezein check karni hain.

### 4.1 — `next.config.js` / `next.config.ts` Check Karo

Is file mein ensure karo ki koi hardcoded localhost URLs nahi hain:

```javascript
// next.config.ts — ye hona chahiye
const nextConfig = {
  // Agar images use kar rahe ho bahar se
  images: {
    domains: ['avatars.githubusercontent.com'], // GitHub profile pics ke liye
  },
};

export default nextConfig;
```

### 4.2 — `prisma/schema.prisma` Check Karo

File ko open karo aur ensure karo ki provider `sqlite` ya `libsql` hai (Turso ke liye):

```prisma
// prisma/schema.prisma — ye EXACTLY aisa hona chahiye
datasource db {
  provider     = "sqlite"       // ✅ sqlite hona chahiye
  url          = env("TURSO_DATABASE_URL")
  authToken    = env("TURSO_AUTH_TOKEN")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}
```

> ⚠️ Agar `provider = "postgresql"` ya kuch aur hai, tab Turso ke saath kaam nahi karega. `sqlite` karo.

### 4.3 — `lib/sarvam.ts` Mein Base URL Check Karo

```typescript
// lib/sarvam.ts mein check karo ki URL hardcoded nahi hai
// Aisa hona chahiye:
const SARVAM_BASE_URL = process.env.SARVAM_BASE_URL || 'https://api.sarvam.ai';
```

### 4.4 — `package.json` Mein Build Script Check Karo

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",       // ✅ ye hona chahiye
    "start": "next start",       // ✅ ye hona chahiye
    "postinstall": "prisma generate"  // ✅ Add karo agar nahi hai
  }
}
```

**`postinstall` script add karo** — Vercel deploy ke time Prisma client auto-generate ho jayega:

```bash
# package.json mein scripts section mein add karo:
"postinstall": "prisma generate"
```

### 4.5 — `.gitignore` Check Karo

Ensure karo ki sensitive files git mein nahi ja rahi:

```gitignore
# .gitignore mein ye sab hona chahiye
.env
.env.local
.env.production
node_modules/
.next/
```

---

## 6. Step 5 — Vercel Par Deploy Karna

### Option A: Vercel Dashboard (Sabse Aasaan — Recommended)

1. **[vercel.com](https://vercel.com)** par jao aur GitHub se login karo
2. Click karo **"Add New Project"**
3. **"Import Git Repository"** select karo
4. Apna `clarityai` repository select karo
5. Framework **Next.js** automatically detect ho jayega
6. **"Deploy"** click karo — pehli baar kuch errors aayenge (environment variables missing hain), ye normal hai
7. Deployment ke baad next step mein env vars add karenge

### Option B: Vercel CLI (Terminal Se)

```bash
# Vercel CLI install karo
npm install -g vercel

# Project folder mein jao
cd clarityai

# Deploy karo
vercel

# Poochega:
# Set up and deploy? → Y
# Which scope? → apna account select karo
# Link to existing project? → N
# Project name? → clarityai (ya jo chahiye)
# In which directory is your code? → ./

# Production deploy ke liye
vercel --prod
```

---

## 7. Step 6 — Environment Variables Vercel Mein Set Karna

Ye **sabse important step** hai. Vercel Dashboard mein:

1. Apna project open karo
2. **Settings** tab par jao
3. **Environment Variables** click karo
4. Ek-ek karke ye sab add karo:

| Variable Name | Value | Environment |
|---|---|---|
| `SARVAM_API_KEY` | Sarvam se mila API key | Production, Preview, Development |
| `TURSO_DATABASE_URL` | `libsql://clarityai-db-username.turso.io` | Production, Preview, Development |
| `TURSO_AUTH_TOKEN` | Turso se mila token | Production, Preview, Development |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Production |
| `NEXTAUTH_URL` | `http://localhost:3000` | Development |
| `NEXTAUTH_SECRET` | Random strong string (neeche dekho) | Production, Preview, Development |
| `GITHUB_ID` | GitHub OAuth Client ID | Production, Preview, Development |
| `GITHUB_SECRET` | GitHub OAuth Client Secret | Production, Preview, Development |
| `ADMIN_EMAILS` | `youremail@gmail.com` | Production, Preview, Development |

### `NEXTAUTH_SECRET` Generate Karna

```bash
# Terminal mein run karo — ek random secure string milega
openssl rand -base64 32

# Ya agar openssl nahi hai:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### `NEXTAUTH_URL` Important Note

```
# Local development ke liye:
NEXTAUTH_URL=http://localhost:3000

# Vercel par production ke liye:
NEXTAUTH_URL=https://clarityai-xyz.vercel.app
# (apna actual Vercel domain yahan daalo)
```

### Sab Variables Add Karne Ke Baad

Vercel par **Redeploy** karo:
- Deployments tab → Latest deployment → **"Redeploy"** button

---

## 8. Step 7 — Database Schema Push Karna

Ye step locally run karna padega ek baar — ye Turso database mein tables banayega.

```bash
# Pehle local .env.local file mein Turso credentials add karo
# .env.local file:
TURSO_DATABASE_URL=libsql://clarityai-db-username.turso.io
TURSO_AUTH_TOKEN=eyJ...your-token...

# Phir ye commands run karo:
cd clarityai

# Prisma client generate karo
npx prisma generate

# Database mein schema push karo
npx prisma db push

# Successful hone par output kuch aisa hoga:
# ✔ Generated Prisma Client
# The following migration(s) have been applied...
# ✔ Database schema was successfully pushed
```

> ✅ Ab database ready hai! Tables ban gayi hain Turso cloud mein.

---

## 9. Cost Breakdown

### Completely Free Setup

| Service | Free Tier | Tumhari Zaroorat |
|---|---|---|
| **Vercel** | 100GB bandwidth/month, unlimited deploys | ✅ Free tier kaafi hai |
| **Turso** | 500 databases, 9GB storage, 1B rows/month | ✅ Free tier kaafi hai |
| **GitHub** | Unlimited public/private repos | ✅ Free |
| **NextAuth** | Open source, free | ✅ Free |

### Paid Services

| Service | Cost | Alternatives |
|---|---|---|
| **Sarvam AI** | Pay per use (check sarvam.ai pricing) | — |

> 💡 **Cost Control Tip:** Tumne already 48-hour rate limiting implement kiya hai (2 chats per user). Ye API costs ko control karta hai. Admin bypass bhi hai tumhare liye.

---

## 10. Common Errors

### Error: `NEXTAUTH_URL` mismatch

```
Error: Invalid URL
```

**Fix:** Vercel mein `NEXTAUTH_URL` exactly apne domain ke saath match karo. `https://` include karo, trailing slash mat dalo.

---

### Error: Prisma Client not found

```
Error: Cannot find module '.prisma/client'
```

**Fix:** `package.json` mein `postinstall` script add karo:
```json
"postinstall": "prisma generate"
```

---

### Error: Database connection failed

```
Error: LibsqlError: Server returned HTTP status 401
```

**Fix:** `TURSO_AUTH_TOKEN` expired ho gaya hoga ya galat hai. Naya token banao:
```bash
turso db tokens create clarityai-db
```
Aur Vercel mein update karo.

---

### Error: GitHub OAuth callback mismatch

```
Error: redirect_uri_mismatch
```

**Fix:** GitHub OAuth App settings mein callback URL update karo:
- Jao: GitHub → Settings → Developer Settings → OAuth Apps → ClarityAI
- **Authorization callback URL** update karo:
  ```
  https://your-actual-domain.vercel.app/api/auth/callback/github
  ```

---

### Error: Build failed — `Type errors`

```
Type error: ...
```

**Fix Option 1:** `next.config.ts` mein TypeScript errors ignore karo for now:
```typescript
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,  // Temporary fix
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};
```

---

### App Deploy Ho Gaya But Login Kaam Nahi Kar Raha

**Checklist:**
1. ✅ `NEXTAUTH_URL` correct domain hai?
2. ✅ `NEXTAUTH_SECRET` set hai?
3. ✅ `GITHUB_ID` aur `GITHUB_SECRET` correct hain?
4. ✅ GitHub OAuth App callback URL updated hai?
5. ✅ Vercel redeploy kiya env vars add karne ke baad?

---

## 11. Custom Domain

Agar tumhara apna domain hai (e.g., `clarityai.in`):

1. Vercel Dashboard → Project → **Settings** → **Domains**
2. **"Add Domain"** click karo
3. Domain enter karo: `clarityai.in`
4. Vercel tumhe DNS records dega (A record ya CNAME)
5. Apne domain registrar (GoDaddy, Namecheap, etc.) mein ye DNS records add karo
6. **Environment Variables mein update karo:**
   - `NEXTAUTH_URL` = `https://clarityai.in`
7. **GitHub OAuth App mein update karo:**
   - Callback URL = `https://clarityai.in/api/auth/callback/github`
8. Redeploy karo

> 🕐 DNS propagation mein 10 min to 48 hours lag sakte hain.

---

## 🎯 Final Deployment Checklist

Ye sab tick karo deploy karne se pehle:

- [ ] Turso database banaya aur URL + token note kiya
- [ ] GitHub OAuth App banaya, Client ID + Secret note kiya
- [ ] Sarvam AI API key li
- [ ] `package.json` mein `"postinstall": "prisma generate"` add kiya
- [ ] `prisma/schema.prisma` mein provider `sqlite` hai
- [ ] Code GitHub par push kiya
- [ ] Vercel par project import kiya
- [ ] Vercel mein sab environment variables add kiye
- [ ] `NEXTAUTH_SECRET` generate kiya aur add kiya
- [ ] Locally `npx prisma db push` run kiya
- [ ] Vercel par redeploy kiya
- [ ] GitHub OAuth callback URL updated kiya with actual Vercel domain
- [ ] Login test kiya
- [ ] Ek decision session test kiya

---

## 🆘 Help Chahiye?

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Turso Docs:** [docs.turso.tech](https://docs.turso.tech)
- **NextAuth Docs:** [next-auth.js.org](https://next-auth.js.org)
- **Prisma + Turso Guide:** [prisma.io/docs/guides/database/turso](https://www.prisma.io/docs/guides/database/turso)

---

*Made with ❤️ for ClarityAI deployment*