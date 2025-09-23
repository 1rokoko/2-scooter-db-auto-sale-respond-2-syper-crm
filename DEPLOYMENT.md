# Deployment Guide for Vercel

## 🚀 Quick Deploy

This project is ready for deployment on Vercel with the following configuration:

### Environment Variables Required

Set these in your Vercel dashboard:

```bash
# Optional: OpenAI API Key for AI-powered responses
OPENAI_API_KEY=your_openai_api_key_here

# Optional: API Keys for authentication (comma-separated)
API_KEYS=key1,key2,key3

# Optional: Allowed origins for CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Deployment Steps

1. **Connect Repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - Framework Preset: `Other`
   - Build Command: `npm run vercel-build`
   - Output Directory: (leave empty)
   - Install Command: `npm install`

3. **Set Environment Variables**
   - Add the environment variables listed above
   - `OPENAI_API_KEY` is optional but recommended for AI responses

4. **Deploy**
   - Click "Deploy"
   - Your API will be available at `https://your-project.vercel.app`

## 📡 API Endpoints

Once deployed, your API will be available at:

### Core Endpoints
- `GET /healthz` - Health check
- `GET /health` - Detailed health status
- `GET /metrics` - Performance metrics

### Webhook Endpoints
- `GET /webhook/variants` - A/B testing variants
- `GET /webhook/deals/hot` - Hot deals data
- `GET /webhook/analytics` - Analytics data
- `POST /webhook/whatsapp` - WhatsApp webhook
- `POST /webhook/telegram` - Telegram webhook
- `POST /webhook/motorcycle/sync` - Motorcycle sync
- `PUT /webhook/reminders/:id/mark-sent` - Mark reminder sent
- `POST /webhook/messages/send` - Send manual message

### Example Usage

```bash
# Health check
curl https://your-project.vercel.app/healthz

# A/B testing
curl "https://your-project.vercel.app/webhook/variants?prompt=interested%20in%20motorcycle&model=Yamaha&count=3"

# WhatsApp webhook
curl -X POST https://your-project.vercel.app/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Hello", "name": "Test User"}'
```

## 🔧 Configuration

### Security Features
- Rate limiting (100 requests per 15 minutes)
- Input validation on all endpoints
- Security headers (CORS, XSS protection)
- Optional API key authentication

### Performance Features
- Optimized for serverless functions
- Fast response times (<100ms typical)
- Efficient memory usage
- Automatic error handling

### AI Features
- OpenAI integration for dynamic responses
- Fallback templates when AI unavailable
- Context-aware message generation
- Multi-channel support (WhatsApp, Telegram)

## 🧪 Testing Your Deployment

After deployment, test these endpoints:

1. **Health Check**
   ```bash
   curl https://your-project.vercel.app/healthz
   ```

2. **A/B Variants**
   ```bash
   curl "https://your-project.vercel.app/webhook/variants?prompt=test&count=2"
   ```

3. **Analytics**
   ```bash
   curl "https://your-project.vercel.app/webhook/analytics?period=7d"
   ```

4. **WhatsApp Simulation**
   ```bash
   curl -X POST https://your-project.vercel.app/webhook/whatsapp \
     -H "Content-Type: application/json" \
     -d '{"phone": "+1234567890", "message": "Hi, I want to buy a motorcycle"}'
   ```

## 📊 Monitoring

### Built-in Monitoring
- `/metrics` endpoint provides performance data
- `/health` endpoint shows system status
- Request/response logging
- Error tracking

### Vercel Analytics
- Enable Vercel Analytics in your dashboard
- Monitor function performance
- Track usage and errors

## 🔒 Security

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable limits
- Automatic blocking of abusive requests

### Input Validation
- All inputs validated and sanitized
- Proper error messages
- SQL injection prevention

### API Authentication (Optional)
- Set `API_KEYS` environment variable
- Include `X-API-Key` header in requests
- Comma-separated multiple keys supported

## 🚨 Troubleshooting

### Common Issues

1. **Function Timeout**
   - Vercel functions have 30-second timeout
   - Optimize heavy operations
   - Use async/await properly

2. **Memory Limits**
   - Vercel Pro: 1GB memory limit
   - Monitor memory usage via `/metrics`
   - Optimize data structures

3. **Cold Starts**
   - First request may be slower
   - Subsequent requests are fast
   - Consider Vercel Pro for better performance

### Debug Information

Check these endpoints for debugging:
- `/health` - System status
- `/metrics` - Performance metrics
- Vercel function logs in dashboard

## 🎯 Production Checklist

- [ ] Environment variables configured
- [ ] OpenAI API key added (optional)
- [ ] Custom domain configured (optional)
- [ ] Analytics enabled
- [ ] Error monitoring setup
- [ ] Rate limiting tested
- [ ] All endpoints tested
- [ ] Security headers verified

## 📈 Scaling

### Vercel Limits
- **Hobby**: 100GB bandwidth, 100 function invocations/day
- **Pro**: 1TB bandwidth, unlimited functions
- **Enterprise**: Custom limits

### Performance Optimization
- Functions are automatically scaled
- Global edge network
- Automatic caching where appropriate
- Optimized for serverless architecture

Your motorcycle marketplace API is now ready for production! 🏍️
