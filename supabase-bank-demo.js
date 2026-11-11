
// DEMO ONLY: displays simulated TikTok purchases.
// No real bank account, card, or funds are accessed or modified.
(() => {
  const SUPABASE_URL = 'https://yetpcbynwvyiaaypgdtv.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_spZvWCy6iGEmBhUVZW5yYg_tXhCZbb2';

  const INITIAL_DEMO_BALANCE = 24580.00;
  const ACTIVITY_SELECTOR = '#activity';
  const BALANCE_SELECTOR = '#balance';

  let client;
  let channel;
  let refreshInProgress = false;
  let balanceHidden = false;
  let currentBalance = INITIAL_DEMO_BALANCE;

  function loadSupabase() {
    if (window.supabase?.createClient) {
      return Promise.resolve(window.supabase);
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-supabase-sdk]');

      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.dataset.supabaseSdk = 'true';
      script.onload = () => resolve(window.supabase);
      script.onerror = () => reject(new Error('Supabase SDK failed to load'));
      document.head.appendChild(script);
    });
  }

  function formatUSD(value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function renderBalance() {
    const balanceElement = document.querySelector(BALANCE_SELECTOR);
    if (!balanceElement) return;

    balanceElement.textContent = balanceHidden
      ? '••••••••'
      : formatUSD(currentBalance);
  }

  function formatAmount(amount) {
    const value = Number(amount);
    return '−' + formatUSD(value);
  }

  function formatDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'DEMO';

    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date) + ' · DEMO';
  }

  function createTikTokIcon() {
    const icon = document.createElement('div');
    icon.className = 'tx-icon';
    icon.style.background = '#050505';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.overflow = 'hidden';

    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');

    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '25');
    svg.setAttribute('height', '25');

    const cyan = document.createElementNS(svgNS, 'path');
    cyan.setAttribute('d', 'M14 3v11.2a4.2 4.2 0 1 1-3-4V7.1a7.1 7.1 0 1 0 6 7V9.4c1.2.9 2.6 1.4 4 1.5V7.5c-3.4-.2-5.5-1.8-7-4.5Z');
    cyan.setAttribute('fill', '#25F4EE');
    cyan.setAttribute('transform', 'translate(-1 0)');

    const pink = document.createElementNS(svgNS, 'path');
    pink.setAttribute('d', 'M14 3v11.2a4.2 4.2 0 1 1-3-4V7.1a7.1 7.1 0 1 0 6 7V9.4c1.2.9 2.6 1.4 4 1.5V7.5c-3.4-.2-5.5-1.8-7-4.5Z');
    pink.setAttribute('fill', '#FE2C55');
    pink.setAttribute('transform', 'translate(1 0)');

    const white = document.createElementNS(svgNS, 'path');
    white.setAttribute('d', 'M14 3v11.2a4.2 4.2 0 1 1-3-4V7.1a7.1 7.1 0 1 0 6 7V9.4c1.2.9 2.6 1.4 4 1.5V7.5c-3.4-.2-5.5-1.8-7-4.5Z');
    white.setAttribute('fill', '#FFFFFF');

    svg.append(cyan, pink, white);
    icon.appendChild(svg);

    return icon;
  }

  function createTransactionRow(tx) {
    const row = document.createElement('div');
    row.className = 'transaction supabase-demo-row';

    const icon = createTikTokIcon();

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
    amount.textContent = formatAmount(tx.amount);

    main.append(title, date);
    row.append(icon, main, amount);

    return row;
  }

  async function fetchAllDemoTransactions() {
    const allTransactions = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const { data, error } = await client
        .from('demo_transactions')
        .select('id,amount,currency,transaction_date')
        .eq('status', 'DEMO')
        .eq('currency', 'USD')
        .order('transaction_date', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      const page = data || [];
      allTransactions.push(...page);

      if (page.length < pageSize) break;
      offset += pageSize;
    }

    return allTransactions;
  }

  async function refreshDemoHistory() {
    if (!client || refreshInProgress) return;

    refreshInProgress = true;

    try {
      const transactions = await fetchAllDemoTransactions();

      // Recalculate from the complete DEMO purchase history.
      const totalSpent = transactions.reduce((sum, tx) => {
        const amount = Number(tx.amount);
        return Number.isFinite(amount) && amount > 0
          ? sum + amount
          : sum;
      }, 0);

      currentBalance = INITIAL_DEMO_BALANCE - totalSpent;
      renderBalance();

      // Replace only rows created by this DEMO script.
      const activity = document.querySelector(ACTIVITY_SELECTOR);
      if (!activity) return;

      activity.querySelectorAll('.supabase-demo-row').forEach(row => row.remove());

      // Keep newest transactions first without reversing their order.
      const fragment = document.createDocumentFragment();

      transactions.forEach(tx => {
        fragment.appendChild(createTransactionRow(tx));
      });

      activity.insertBefore(fragment, activity.firstChild);

      console.info(
        '[DEMO] Balance recalculated:',
        formatUSD(currentBalance)
      );
    } catch (error) {
      console.error('[DEMO] Could not refresh history or balance:', error);
    } finally {
      refreshInProgress = false;
    }
  }

  function setupBalanceToggle() {
    const toggle = document.querySelector('#toggleBalance');
    if (!toggle) return;

    // The original page handler runs first; this handler restores
    // the correctly formatted DEMO balance afterwards.
    toggle.addEventListener('click', () => {
      const balanceElement = document.querySelector(BALANCE_SELECTOR);

      if (balanceElement) {
        balanceHidden = balanceElement.textContent.includes('•');
      }

      renderBalance();
    });
  }

  async function init() {
    try {
      setupBalanceToggle();

      // Show the initial DEMO balance while transactions are loading.
      renderBalance();

      const sdk = await loadSupabase();

      if (!sdk?.createClient) {
        throw new Error('Supabase SDK unavailable');
      }

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
      console.error('[DEMO] Initialization failed:', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('beforeunload', () => {
    if (client && channel) {
      client.removeChannel(channel);
    }
  });
})();
