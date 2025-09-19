const fetchHotDeals = async () => {
  const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://webhook:8090';
  const response = await fetch(`${baseUrl}/webhook/deals/hot`);
  if (!response.ok) {
    throw new Error(`Scheduler failed with status ${response.status}`);
  }
  const payload = await response.json();
  console.log(`[Scheduler] Hot deals: ${JSON.stringify(payload.deals || [])}`);
};

const run = async () => {
  const intervalMinutes = Number(process.env.SCHEDULER_INTERVAL_MINUTES || 15);
  try {
    await fetchHotDeals();
  } catch (error) {
    console.error('[Scheduler] Initial run failed', error);
  }

  setInterval(async () => {
    try {
      await fetchHotDeals();
    } catch (error) {
      console.error('[Scheduler] Polling failed', error);
    }
  }, intervalMinutes * 60 * 1000);
};

run();
