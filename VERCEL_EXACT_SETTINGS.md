# 🎯 ТОЧНЫЕ НАСТРОЙКИ ДЛЯ VERCEL ДЕПЛОЯ

## ПРЯМАЯ ССЫЛКА ДЛЯ СОЗДАНИЯ ПРОЕКТА:
👉 **https://vercel.com/new**

## НАСТРОЙКИ ПРОЕКТА (КОПИРУЙТЕ ТОЧНО):

### 1. Import Git Repository
```
Repository: 1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm
Branch: main
```

### 2. Configure Project
```
Project Name: nano-crm
Framework Preset: Other
Root Directory: ./
```

### 3. Build and Output Settings
```
Build Command: npm run vercel-build
Output Directory: (оставить пустым)
Install Command: npm install
```

### 4. Environment Variables (Опционально)
```
OPENAI_API_KEY=your_key_here
NODE_ENV=production
```

### 5. Advanced Settings
```
Node.js Version: 18.x
```

## ОЖИДАЕМЫЙ РЕЗУЛЬТАТ:

После деплоя проект будет доступен по адресу:
- **Production**: https://nano-crm.vercel.app
- **Preview**: https://nano-crm-git-main-1rokoko.vercel.app

## ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ:

```bash
# Проверка здоровья
curl https://nano-crm.vercel.app/healthz

# Должен вернуть:
{"status":"ok","version":"1.0.0","environment":"vercel","service":"nano-crm"}
```

## ЕСЛИ ДЕПЛОЙ НЕ УДАЛСЯ:

1. Проверьте логи в Vercel Dashboard
2. Убедитесь что Build Command: `npm run vercel-build`
3. Проверьте что Framework: `Other`
4. Node.js Version должна быть 18.x

## АВТОМАТИЧЕСКОЕ ТЕСТИРОВАНИЕ:

После успешного деплоя запустите:
```bash
./tests/production-test.sh https://nano-crm.vercel.app
```
