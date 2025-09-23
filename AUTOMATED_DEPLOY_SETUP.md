# 🤖 AUTOMATED DEPLOYMENT SETUP

## Option 1: Manual Vercel Dashboard Deployment (RECOMMENDED)

### Quick Steps:
1. **Go to**: https://vercel.com/new
2. **Import**: `1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm`
3. **Configure**:
   - Project Name: `nano-crm`
   - Framework: `Other`
   - Build Command: `npm run vercel-build`
   - Install Command: `npm install`
4. **Deploy**

### Expected Result:
- URL: https://nano-crm.vercel.app
- Deployment time: 2-4 minutes

## Option 2: GitHub Actions Automation

### Setup GitHub Secrets:
1. Go to repository settings → Secrets and variables → Actions
2. Add these secrets:
   ```
   VERCEL_TOKEN=your_vercel_token
   VERCEL_ORG_ID=your_org_id
   VERCEL_PROJECT_ID=your_project_id
   ```

### Get Vercel Credentials:
1. **Vercel Token**: https://vercel.com/account/tokens
2. **Org ID**: Run `vercel org ls` or check Vercel dashboard
3. **Project ID**: Created after first manual deployment

### Trigger Deployment:
```bash
git push origin main
```

## Option 3: Direct CLI Deployment (If Authenticated)

### Prerequisites:
```bash
npm install -g vercel
vercel login
```

### Deploy:
```bash
vercel --prod --name nano-crm
```

## MONITORING DEPLOYMENT

### Use our monitoring script:
```bash
./monitor-deployment.sh https://nano-crm.vercel.app
```

This will:
- Wait for deployment to become available
- Run comprehensive production tests
- Report success/failure status

## VERIFICATION CHECKLIST

After deployment, verify:
- [ ] https://nano-crm.vercel.app/ loads
- [ ] https://nano-crm.vercel.app/healthz returns `{"status": "ok"}`
- [ ] All API endpoints respond correctly
- [ ] Performance is acceptable (< 5s response times)
- [ ] Security headers are present
- [ ] AI functionality works

## TROUBLESHOOTING

### Common Issues:
1. **Build fails**: Check `npm run vercel-build` works locally
2. **Function timeout**: Increase timeout in vercel.json
3. **Dependencies missing**: Verify package.json includes all deps
4. **Environment variables**: Add required env vars in Vercel dashboard

### Debug Commands:
```bash
# Test build locally
npm run vercel-build

# Test production script
./tests/production-test.sh https://nano-crm.vercel.app

# Check deployment status
curl https://nano-crm.vercel.app/healthz
```
