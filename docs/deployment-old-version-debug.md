# Debugging: Old Version Showing in Deployment

Use this checklist when the deployed site shows an old version instead of your latest code.

---

## Fix it now (do these in order)

### Step 1: Confirm Vercel is using FIBERATLAS

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Open your Fiber Atlas project
3. **Settings → Git** → check "Connected Git Repository"
4. It must show **`sooflight/FIBERATLAS`** (all caps)
5. If it shows `FiberAtlas` or anything else → **Disconnect** and **Import** from `sooflight/FIBERATLAS`

### Step 2: Redeploy with cache cleared

1. Go to **Deployments**
2. Click the **⋮** menu on the latest deployment
3. Click **Redeploy**
4. **Enable "Clear build cache"** (critical)
5. Click Redeploy

### Step 3: Wait and hard-refresh

1. Wait for the build to finish (2–5 min)
2. Open your site in an **incognito/private window** or hard-refresh (Cmd+Shift+R)

---

## Detailed checklist

## 1. Which GitHub repo is Vercel connected to?

You have two remotes:

- `origin` → `https://github.com/sooflight/FiberAtlas.git`
- `fiberatlas` → `https://github.com/sooflight/FIBERATLAS.git`

**Action:** In Vercel Dashboard → Project Settings → Git, confirm the connected repository is `sooflight/FIBERATLAS` (the one you pushed to).

If it’s connected to `FiberAtlas` or another repo, deployments will use that repo’s code, not your latest.

---

## 2. Which branch does Vercel deploy?

**Action:** In Vercel Dashboard → Project Settings → Git, check the Production Branch (often `main`).

Ensure you’re pushing to that branch. Your latest commit is on `main`.

---

## 3. Did the latest push trigger a deploy?

**Action:** In Vercel Dashboard → Deployments, check the most recent deployment:

- Commit hash (should match `e03196e` or later)
- Status (Building, Ready, Error)
- Build logs for errors

If the latest commit isn’t deployed, trigger a redeploy: Deployments → ⋮ on latest → Redeploy.

---

## 4. Build cache

Vercel may reuse cached build output.

**Action:** Redeploy with cache cleared:

- Deployments → ⋮ on latest → Redeploy
- Enable **“Clear build cache”** before redeploying

---

## 5. CDN / browser cache

Even if the deployment is new, users may see old assets from cache.

**Action:**

- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or open the site in an incognito/private window
- Check response headers for `Cache-Control` and `ETag`

---

## 6. Multiple Vercel projects

Your README mentions two projects: public (`www`) and admin (`admin`).

**Action:** Confirm which project URL you’re checking. Each project deploys independently; one may be updated while the other is not.

---

## 7. Environment variables

Wrong or missing env vars can change behavior (e.g. `VITE_ENABLE_ADMIN`).

**Action:** In Vercel → Project Settings → Environment Variables, verify values for the environment you’re testing (Production/Preview).

---

## Quick verification

```bash
# Confirm latest commit
git log -1 --oneline

# Confirm FIBERATLAS has it
git fetch fiberatlas
git log fiberatlas/main -1 --oneline
```

If both show the same commit, the repo is up to date. The problem is likely in Vercel (wrong repo, branch, cache, or project).
