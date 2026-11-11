// DEMO ONLY: reads DEMO entries and displays them in the activity list.
// It never changes the displayed account balance.
(() => {
  const SUPABASE_URL = 'https://yetpcbynwvyiaaypgdtv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_spZvWCy6iGEmBhUVZW5yYg_tXhCZbb2';
  const ACTIVITY_SELECTOR = '#activity';
  let client;
  let channel;
  let refreshInProgress = false;

  function loadSupabase() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase SDK failed to load'));
      document.head.appendChild(script);
    });
  }

  function formatAmount(amount, currency) {
    const value = Number(amount);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    return '−' + formatted;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'DEMO';
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date) + ' · DEMO';
  }

  async function refreshDemoHistory() {
    if (!client || refreshInProgress) return;
    refreshInProgress = true;
    try {
      const { data, error } = await client
        .from('demo_transactions')
        .select('amount,currency,transaction_date')
        .eq('status', 'DEMO')
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (error) throw error;
      const activity = document.querySelector(ACTIVITY_SELECTOR);
      if (!activity) return;

      activity.querySelectorAll('.supabase-demo-row').forEach(row => row.remove());

      (data || []).forEach(tx => {
        const row = document.createElement('div');
        row.className = 'transaction supabase-demo-row';

        const icon = document.createElement('div');
        icon.className = 'tx-icon';
        icon.textContent = '🪙';

        const main = document.createElement('div');
        main.className = 'tx-main';

        const title = document.createElement('div');
        title.className = 'tx-title';
        title.textContent = 'TikTok Coins · DEMO';

        const date = document.createElement('div');
        date.className = 'tx-date';
        date.textContent = formatDate(tx.transaction_date);

        const amount = document.createElement('div');
        amount.className = 'tx-amount negative';
        amount.textContent = formatAmount(tx.amount, tx.currency);

        main.append(title, date);
        row.append(icon, main, amount);
        activity.insertBefore(row, activity.firstChild);
      });
    } catch (error) {
      console.error('[DEMO history] Could not load demo transactions:', error);
    } finally {
      refreshInProgress = false;
    }
  }

  async function init() {
    try {
      const sdk = await loadSupabase();
      client = sdk.createClient(SUPABASE_URL, SUPABASE_KEY);
      await refreshDemoHistory();

      channel = client
        .channel('demo-transactions-live')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'demo_transactions',
          filter: 'status=eq.DEMO'
        }, () => refreshDemoHistory())
        .subscribe();
    } catch (error) {
      console.error('[DEMO history] Initialization failed:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('beforeunload', () => {
    if (client && channel) client.removeChannel(channel);
  });
})();
