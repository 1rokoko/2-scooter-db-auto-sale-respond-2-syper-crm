# 🚀 MANUAL DEPLOYMENT STEPS FOR nano-crm

## IMMEDIATE ACTION REQUIRED

Since automated CLI deployment requires authentication, please follow these steps for manual deployment:

### Step 1: Open Vercel Dashboard
1. Go to: https://vercel.com/dashboard
2. Click "New Project"

### Step 2: Import Repository
1. Find repository: `1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm`
2. Click "Import"

### Step 3: Configure Project (CRITICAL SETTINGS)
```
Project Name: nano-crm
Framework Preset: Other
Root Directory: ./
Build Command: npm run vercel-build
Output Directory: (leave empty)
Install Command: npm install
Node.js Version: 18.x
```

### Step 4: Environment Variables (Optional but Recommended)
```
OPENAI_API_KEY=your_openai_api_key_here
API_KEYS=nano-crm-prod-key
ALLOWED_ORIGINS=https://nano-crm.vercel.app
```

### Step 5: Deploy
1. Click "Deploy"
2. Wait for completion (2-4 minutes)
3. Get URL: https://nano-crm.vercel.app

## EXPECTED DEPLOYMENT RESULT

After successful deployment, the following URL should be accessible:
- **Production URL**: https://nano-crm.vercel.app
- **Health Check**: https://nano-crm.vercel.app/healthz
- **API Documentation**: https://nano-crm.vercel.app/

## VERIFICATION COMMANDS

Once deployed, run these commands to verify:

```bash
# Health check
curl https://nano-crm.vercel.app/healthz

# Welcome page
curl https://nano-crm.vercel.app/

# A/B testing
curl "https://nano-crm.vercel.app/webhook/variants?prompt=test&count=2"

# Full production test
./tests/production-test.sh https://nano-crm.vercel.app
```

## TROUBLESHOOTING

If deployment fails:
1. Check build logs in Vercel dashboard
2. Verify build command: `npm run vercel-build`
3. Ensure Node.js version is 18.x
4. Check that all dependencies are in package.json

## NEXT STEPS

After manual deployment:
1. Verify the URL is accessible
2. Run comprehensive production tests
3. Fix any issues found
4. Redeploy if necessary
5. Validate all functionality works correctly
