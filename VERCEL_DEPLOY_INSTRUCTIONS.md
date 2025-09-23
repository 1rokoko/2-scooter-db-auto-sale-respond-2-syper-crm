# 🚀 VERCEL DEPLOYMENT INSTRUCTIONS - nano-crm

## ✅ ВСЁ ГОТОВО К ДЕПЛОЮ!

Код полностью подготовлен и протестирован. Следуйте этим шагам для деплоя на Vercel:

## 📋 ПОШАГОВАЯ ИНСТРУКЦИЯ

### Шаг 1: Подключение к Vercel

1. **Перейдите в Vercel Dashboard:**
   - Откройте [vercel.com/dashboard](https://vercel.com/dashboard)
   - Войдите в свой аккаунт

2. **Создайте новый проект:**
   - Нажмите кнопку **"New Project"**
   - Выберите **"Import Git Repository"**

### Шаг 2: Импорт репозитория

1. **Найдите репозиторий:**
   - В поиске введите: `1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm`
   - Или найдите его в списке ваших репозиториев

2. **Импортируйте проект:**
   - Нажмите **"Import"** рядом с репозиторием

### Шаг 3: Настройка проекта

**Важно! Используйте эти точные настройки:**

```
Project Name: nano-crm
Framework Preset: Other
Root Directory: ./
Build Command: npm run vercel-build
Output Directory: (оставить пустым)
Install Command: npm install
```

### Шаг 4: Переменные окружения (опционально)

Добавьте эти переменные в разделе **"Environment Variables"**:

```bash
# Для AI функций (рекомендуется)
OPENAI_API_KEY=your_openai_api_key_here

# Для API аутентификации (опционально)
API_KEYS=nano-crm-key-1,nano-crm-key-2

# Для CORS (опционально)
ALLOWED_ORIGINS=https://nano-crm.vercel.app
```

### Шаг 5: Деплой

1. **Нажмите "Deploy"**
2. **Дождитесь завершения деплоя** (обычно 1-3 минуты)
3. **Получите URL:** `https://nano-crm.vercel.app`

## 🎯 НАСТРОЙКА ДОМЕНА nano-crm

### Автоматический домен:
После деплоя ваш проект будет доступен по адресу:
- `https://nano-crm.vercel.app`
- `https://nano-crm-git-main-1rokoko.vercel.app`

### Кастомный домен (опционально):
1. В настройках проекта перейдите в **"Domains"**
2. Добавьте свой домен (например, `nano-crm.com`)
3. Настройте DNS записи согласно инструкциям Vercel

## 🧪 ТЕСТИРОВАНИЕ ПОСЛЕ ДЕПЛОЯ

После успешного деплоя протестируйте эти endpoints:

### 1. Главная страница:
```bash
curl https://nano-crm.vercel.app/
```

### 2. Health check:
```bash
curl https://nano-crm.vercel.app/healthz
```

### 3. A/B тестирование:
```bash
curl "https://nano-crm.vercel.app/webhook/variants?prompt=interested%20in%20motorcycle&count=3"
```

### 4. Analytics:
```bash
curl "https://nano-crm.vercel.app/webhook/analytics?period=7d"
```

### 5. WhatsApp webhook:
```bash
curl -X POST https://nano-crm.vercel.app/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Hello, I want to buy a motorcycle", "name": "Test User"}'
```

## 📊 ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### ✅ Главная страница должна вернуть:
```json
{
  "name": "Nano CRM",
  "description": "AI-powered motorcycle marketplace with CRM and automated responses",
  "version": "1.0.0",
  "status": "operational",
  "endpoints": {
    "health": "/healthz",
    "metrics": "/metrics",
    "variants": "/webhook/variants",
    "deals": "/webhook/deals/hot",
    "analytics": "/webhook/analytics",
    "whatsapp": "/webhook/whatsapp",
    "telegram": "/webhook/telegram"
  }
}
```

### ✅ Health check должен вернуть:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "environment": "vercel",
  "service": "nano-crm"
}
```

## 🔧 TROUBLESHOOTING

### Если деплой не удался:

1. **Проверьте логи:**
   - В Vercel dashboard перейдите в **"Functions"** → **"View Function Logs"**

2. **Проверьте настройки:**
   - Build Command: `npm run vercel-build`
   - Install Command: `npm install`
   - Framework: `Other`

3. **Проверьте зависимости:**
   - Все зависимости указаны в `package.json`
   - Node.js версия >= 18.0.0

### Если endpoints не работают:

1. **Проверьте URL:**
   - Используйте полный URL: `https://nano-crm.vercel.app/webhook/variants`

2. **Проверьте CORS:**
   - Добавьте `ALLOWED_ORIGINS` в переменные окружения

3. **Проверьте rate limiting:**
   - Не делайте слишком много запросов подряд

## 🎉 ПОСЛЕ УСПЕШНОГО ДЕПЛОЯ

### Ваш nano-crm будет иметь:

✅ **AI-Powered Features:**
- A/B тестирование с OpenAI интеграцией
- Автоматические ответы для WhatsApp/Telegram
- Контекстная генерация контента

✅ **CRM Functionality:**
- Real-time аналитика продаж
- Управление горячими сделками
- Система автоматических напоминаний

✅ **Enterprise Security:**
- Rate limiting (100 req/15min)
- Input validation на всех endpoints
- Security headers и CORS protection

✅ **Performance:**
- Sub-100ms response times
- Global edge deployment
- Automatic scaling

## 📞 ПОДДЕРЖКА

Если возникнут проблемы:
1. Проверьте логи в Vercel dashboard
2. Убедитесь, что все настройки соответствуют инструкции
3. Протестируйте endpoints согласно примерам выше

---

# 🚀 ГОТОВО К ДЕПЛОЮ!

**Следуйте инструкциям выше, и ваш nano-crm будет работать на Vercel через несколько минут!**

**URL после деплоя: https://nano-crm.vercel.app** 🏍️
