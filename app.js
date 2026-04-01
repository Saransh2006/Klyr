const STORAGE_KEY = "flow-state-v1";

const defaultCategories = [
  { id: "food", name: "Food", icon: "🍔", color: "#ff9f6b" },
  { id: "travel", name: "Travel", icon: "🚗", color: "#57e3ff" },
  { id: "stationary", name: "Stationary", icon: "📚", color: "#b08cff" },
  { id: "entertainment", name: "Entertainment", icon: "🎮", color: "#7df5b7" }
];

const initialState = { budget: 0, categories: defaultCategories, transactions: [] };

let activeType = "expense";
let activePage = "home";
let state = loadState();
const displayedValues = new WeakMap();

const elements = {
  moneyLeftToday: document.getElementById("moneyLeftToday"),
  moneyLeftMessage: document.getElementById("moneyLeftMessage"),
  budgetUsagePercent: document.getElementById("budgetUsagePercent"),
  totalBalance: document.getElementById("totalBalance"),
  totalIncome: document.getElementById("totalIncome"),
  totalExpense: document.getElementById("totalExpense"),
  todaySpending: document.getElementById("todaySpending"),
  monthlySpending: document.getElementById("monthlySpending"),
  budgetLeft: document.getElementById("budgetLeft"),
  monthlyBudgetValue: document.getElementById("monthlyBudgetValue"),
  remainingBudgetValue: document.getElementById("remainingBudgetValue"),
  budgetTrackFill: document.getElementById("budgetTrackFill"),
  weeklyExpense: document.getElementById("weeklyExpense"),
  analyticsMonthlyExpense: document.getElementById("analyticsMonthlyExpense"),
  topCategory: document.getElementById("topCategory"),
  pieChart: document.getElementById("pieChart"),
  chartLegend: document.getElementById("chartLegend"),
  barsList: document.getElementById("barsList"),
  trendChart: document.getElementById("trendChart"),
  dailyAverage: document.getElementById("dailyAverage"),
  peakDay: document.getElementById("peakDay"),
  forecastDaysLeft: document.getElementById("forecastDaysLeft"),
  forecastMessage: document.getElementById("forecastMessage"),
  forecastAvgSpend: document.getElementById("forecastAvgSpend"),
  forecastDaysRemaining: document.getElementById("forecastDaysRemaining"),
  forecastMonthEnd: document.getElementById("forecastMonthEnd"),
  forecastMeterFill: document.getElementById("forecastMeterFill"),
  analyticsSection: document.getElementById("analyticsSection"),
  homePage: document.getElementById("homePage"),
  insightsPage: document.getElementById("insightsPage"),
  transactionsPage: document.getElementById("transactionsPage"),
  forecastPage: document.getElementById("forecastPage"),
  screen: document.querySelector(".screen"),
  transactionsGroups: document.getElementById("transactionsGroups"),
  transactionModal: document.getElementById("transactionModal"),
  budgetModal: document.getElementById("budgetModal"),
  categoryModal: document.getElementById("categoryModal"),
  transactionForm: document.getElementById("transactionForm"),
  budgetForm: document.getElementById("budgetForm"),
  categoryForm: document.getElementById("categoryForm"),
  categorySelect: document.getElementById("categorySelect"),
  dateInput: document.getElementById("dateInput"),
  amountInput: document.getElementById("amountInput"),
  amountKeypad: document.getElementById("amountKeypad"),
  budgetInput: document.getElementById("budgetInput"),
  typeToggle: document.getElementById("typeToggle"),
  openTransactionModal: document.getElementById("openTransactionModal"),
  settingsButton: document.getElementById("settingsButton"),
  editBudgetButton: document.getElementById("editBudgetButton"),
  openCategoriesButton: document.getElementById("openCategoriesButton"),
  openAnalyticsButton: document.getElementById("openAnalyticsButton"),
  bottomHomeButton: document.getElementById("bottomHomeButton"),
  bottomInsightsButton: document.getElementById("bottomInsightsButton"),
  bottomAddButton: document.getElementById("bottomAddButton"),
  bottomTransactionsButton: document.getElementById("bottomTransactionsButton"),
  bottomForecastButton: document.getElementById("bottomForecastButton"),
  transactionItemTemplate: document.getElementById("transactionItemTemplate")
};

bootstrap();

function bootstrap() {
  elements.dateInput.value = formatDateInput(new Date());
  bindEvents();
  renderCategorySelect();
  setActivePage("home");
  render();

  if (!state.budget) {
    openBudgetModal();
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

function bindEvents() {
  elements.openTransactionModal.addEventListener("click", () => {
    openTransactionEntry(activeType);
  });

  elements.settingsButton.addEventListener("click", () => {
    openBudgetModal();
  });

  elements.editBudgetButton.addEventListener("click", () => {
    openBudgetModal();
  });

  elements.openCategoriesButton.addEventListener("click", () => openModal(elements.categoryModal));
  elements.openAnalyticsButton.addEventListener("click", () => setActivePage("insights"));
  elements.bottomHomeButton?.addEventListener("click", () => setActivePage("home"));
  elements.bottomInsightsButton?.addEventListener("click", () => setActivePage("insights"));
  elements.bottomAddButton?.addEventListener("click", () => openTransactionEntry("expense"));
  elements.bottomTransactionsButton?.addEventListener("click", () => setActivePage("transactions"));
  elements.bottomForecastButton?.addEventListener("click", () => setActivePage("forecast"));
  elements.transactionsGroups?.addEventListener("click", (event) => {
    const button = event.target.closest(".transaction-item__delete");
    if (!button) {
      return;
    }
    deleteTransaction(button.dataset.transactionId);
  });
  elements.amountKeypad?.addEventListener("click", (event) => {
    const button = event.target.closest(".keypad__key");
    if (!button) {
      return;
    }
    const keypadValue = button.dataset.keypadValue;
    const keypadAction = button.dataset.keypadAction;
    handleAmountKeypad(keypadValue, keypadAction);
  });
  document.querySelectorAll("[data-amount-preset]").forEach((button) => {
    button.addEventListener("click", () => applyAmountPreset(button.dataset.amountPreset));
  });

  document.querySelectorAll("[data-open-transaction-type]").forEach((button) => {
    button.addEventListener("click", () => openTransactionEntry(button.dataset.openTransactionType || "expense"));
  });

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.closeModal)?.close());
  });

  elements.typeToggle.addEventListener("click", (event) => {
    const button = event.target.closest("[data-type]");
    if (button) {
      setActiveType(button.dataset.type);
    }
  });

  elements.transactionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.transactionForm);
    const amount = Number(formData.get("amount"));
    const categoryId = String(formData.get("categoryId"));
    const note = String(formData.get("note") || "").trim();
    const date = String(formData.get("date"));

    if (!amount || amount <= 0) {
      elements.amountInput.focus();
      return;
    }

    state.transactions.unshift({
      id: crypto.randomUUID(),
      amount,
      categoryId,
      note,
      date,
      type: activeType,
      createdAt: new Date().toISOString()
    });

    persist();
    render();
    elements.transactionModal.close();
  });

  elements.budgetForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(new FormData(elements.budgetForm).get("budget"));
    state.budget = amount > 0 ? amount : 0;
    persist();
    render();
    elements.budgetModal.close();
  });

  elements.categoryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(elements.categoryForm);
    const name = String(formData.get("name") || "").trim();
    const icon = String(formData.get("icon") || "").trim() || "✨";
    const color = String(formData.get("color") || "#c8ff3d");

    if (!name) {
      return;
    }

    state.categories.push({ id: slugify(name), name, icon, color });
    persist();
    renderCategorySelect();
    render();
    elements.categoryForm.reset();
    document.getElementById("categoryColorInput").value = "#c8ff3d";
    elements.categoryModal.close();
  });
}

function render() {
  const metrics = getMetrics();
  renderDashboard(metrics);
  renderAnalytics(metrics);
  renderForecast(metrics);
  renderTransactions();
}

function renderDashboard(metrics) {
  setAnimatedText(elements.totalBalance, formatCurrency(metrics.balance));
  setAnimatedText(elements.totalIncome, formatCurrency(metrics.totalIncome));
  setAnimatedText(elements.totalExpense, formatCurrency(metrics.totalExpense));
  setAnimatedText(elements.todaySpending, formatCurrency(metrics.todayExpense));
  setAnimatedText(elements.monthlySpending, formatCurrency(metrics.monthExpense));
  setAnimatedText(elements.budgetLeft, formatCurrency(metrics.remainingBudget));
  setAnimatedText(elements.monthlyBudgetValue, formatCurrency(state.budget));
  setAnimatedText(elements.remainingBudgetValue, formatCurrency(metrics.remainingBudget));
  setAnimatedText(elements.budgetUsagePercent, `${Math.min(999, Math.round(metrics.budgetUsedPercent))}%`);
  elements.budgetTrackFill.style.width = `${Math.min(metrics.budgetUsedPercent, 100)}%`;

  const budgetAngle = `${Math.min(metrics.budgetUsedPercent, 100) * 3.6}deg`;
  document.querySelector(".progress-ring").style.background =
    `conic-gradient(#c8ff3d 0deg ${budgetAngle}, rgba(255,255,255,0.08) ${budgetAngle} 360deg), linear-gradient(180deg, rgba(200, 255, 61, 0.18), rgba(255, 255, 255, 0.03))`;

  setAnimatedText(elements.moneyLeftToday, formatCurrency(metrics.moneyLeftToday));
  elements.moneyLeftMessage.textContent = getMoneyLeftMessage(metrics);
}

function renderAnalytics(metrics) {
  setAnimatedText(elements.weeklyExpense, formatCurrency(metrics.weekExpense));
  setAnimatedText(elements.analyticsMonthlyExpense, formatCurrency(metrics.monthExpense));
  setAnimatedText(elements.topCategory, metrics.topCategory ? `${metrics.topCategory.icon} ${metrics.topCategory.name}` : "-");
  renderCategoryBars(metrics);
  renderTrend(metrics);

  if (!metrics.categoryTotals.length) {
    elements.pieChart.style.background =
      "radial-gradient(circle, rgba(255,255,255,0.1) 24%, transparent 25%), conic-gradient(rgba(255,255,255,0.14) 0deg 360deg)";
    elements.chartLegend.innerHTML = '<p class="empty-state">Add some expenses to unlock category insights.</p>';
    return;
  }

  let currentAngle = 0;
  const segments = metrics.categoryTotals.map((item) => {
    const start = currentAngle;
    const sweep = (item.total / metrics.monthExpense) * 360;
    currentAngle += sweep;
    return `${item.color} ${start}deg ${currentAngle}deg`;
  });

  elements.pieChart.style.background =
    `radial-gradient(circle, rgba(7, 17, 30, 1) 24%, transparent 25%), conic-gradient(${segments.join(", ")})`;

  elements.chartLegend.innerHTML = "";
  metrics.categoryTotals.forEach((item) => {
    const legend = document.createElement("div");
    legend.className = "legend-item";
    legend.innerHTML = `
      <div class="legend-label">
        <span class="legend-swatch" style="background:${item.color}"></span>
        <span>${item.icon} ${item.name}</span>
      </div>
      <strong>${Math.round(item.percent)}%</strong>
    `;
    elements.chartLegend.appendChild(legend);
  });
}

function renderCategoryBars(metrics) {
  if (!elements.barsList) {
    return;
  }

  if (!metrics.categoryTotals.length) {
    elements.barsList.innerHTML = '<p class="empty-state">Log a few expenses to unlock category comparisons.</p>';
    return;
  }

  elements.barsList.innerHTML = "";
  metrics.categoryTotals.forEach((item) => {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <div class="bar-row__head">
        <strong>${item.icon} ${item.name}</strong>
        <span>${formatCurrency(item.total)}</span>
      </div>
      <div class="bar-track">
        <div class="bar-track__fill" style="width:${Math.max(item.percent, 6)}%; background:${item.color}"></div>
      </div>
    `;
    elements.barsList.appendChild(row);
  });
}

function renderTrend(metrics) {
  if (!elements.trendChart || !elements.dailyAverage || !elements.peakDay) {
    return;
  }

  setAnimatedText(elements.dailyAverage, formatCurrency(metrics.dailyAverage));
  setAnimatedText(
    elements.peakDay,
    metrics.peakDayEntry.total ? `${formatDayLabel(metrics.peakDayEntry.date)} • ${formatCurrency(metrics.peakDayEntry.total)}` : "-"
  );

  if (!metrics.dailyTotals.length) {
    elements.trendChart.innerHTML = '<p class="empty-state">Daily trends will appear once you have spending across multiple days.</p>';
    return;
  }

  const maxTotal = Math.max(...metrics.dailyTotals.map((item) => item.total), 1);
  elements.trendChart.innerHTML = "";
  metrics.dailyTotals.forEach((item) => {
    const bar = document.createElement("div");
    bar.className = "trend-bar";
    bar.style.height = `${Math.max((item.total / maxTotal) * 100, 12)}%`;
    bar.title = `${formatDayLabel(item.date)}: ${formatCurrency(item.total)}`;
    bar.innerHTML = `<span>${new Date(item.date).getDate()}</span>`;
    elements.trendChart.appendChild(bar);
  });
}

function renderForecast(metrics) {
  if (!elements.forecastDaysLeft) {
    return;
  }

  setAnimatedText(elements.forecastAvgSpend, formatCurrency(metrics.dailyAverage));
  setAnimatedText(elements.forecastDaysRemaining, String(metrics.daysLeftIncludingToday));
  setAnimatedText(elements.forecastMonthEnd, formatCurrency(metrics.projectedMonthEnd));

  const runwayDays = Math.max(metrics.forecastDaysLeft, 0);
  setAnimatedText(elements.forecastDaysLeft, `${runwayDays} days`);

  if (!state.budget || metrics.monthExpense === 0) {
    elements.forecastMessage.textContent = "Add a few expenses to see whether your current pace will last through month end.";
    elements.forecastMeterFill.style.width = "0%";
    return;
  }

  const coveragePercent = Math.min((runwayDays / Math.max(metrics.daysLeftIncludingToday, 1)) * 100, 100);
  elements.forecastMeterFill.style.width = `${coveragePercent}%`;

  if (runwayDays >= metrics.daysLeftIncludingToday) {
    elements.forecastMessage.textContent = "You're on track to make your budget last through the month at your current pace.";
  } else if (runwayDays > 0) {
    elements.forecastMessage.textContent = `At this pace, your budget may run short about ${metrics.daysLeftIncludingToday - runwayDays} day(s) before month end.`;
  } else {
    elements.forecastMessage.textContent = "Your current pace is too high for the remaining budget. A lighter spend now will help recover the month.";
  }
}

function renderTransactions() {
  elements.transactionsGroups.innerHTML = "";

  if (!state.transactions.length) {
    elements.transactionsGroups.innerHTML = '<p class="empty-state">No transactions yet. Tap + to log your first spend in under five seconds.</p>';
    return;
  }

  state.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((transaction) => {
      const node = elements.transactionItemTemplate.content.firstElementChild.cloneNode(true);
      const category = getCategoryById(transaction.categoryId);
      const title = node.querySelector(".transaction-item__title");
      const amount = node.querySelector(".transaction-item__amount");
      const meta = node.querySelector(".transaction-item__meta");
      const icon = node.querySelector(".transaction-item__icon");

      title.textContent = category ? `${category.icon} ${category.name}` : transaction.categoryId;
      amount.textContent = `${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}`;
      amount.classList.add(transaction.type === "income" ? "transaction-item__amount--income" : "transaction-item__amount--expense");
      meta.textContent = [formatReadableDate(transaction.date), transaction.note].filter(Boolean).join(" • ");
      icon.textContent = category?.icon || "•";
      icon.style.background = category?.color || "#57e3ff";

      elements.transactionsList.appendChild(node);
    });
}

function renderCategorySelect() {
  elements.categorySelect.innerHTML = "";
  state.categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = `${category.icon} ${category.name}`;
    elements.categorySelect.appendChild(option);
  });
}

function getMetrics() {
  const now = new Date();
  const today = formatDateInput(now);
  const monthKey = today.slice(0, 7);
  const startOfWeek = getStartOfWeek(now);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeftIncludingToday = Math.max(daysInMonth - now.getDate() + 1, 1);

  const totalIncome = state.transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = state.transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const monthTransactions = state.transactions.filter((item) => item.type === "expense" && item.date.startsWith(monthKey));
  const monthExpense = monthTransactions.reduce((sum, item) => sum + item.amount, 0);
  const todayExpense = monthTransactions.filter((item) => item.date === today).reduce((sum, item) => sum + item.amount, 0);
  const weekExpense = state.transactions
    .filter((item) => item.type === "expense" && new Date(item.date) >= startOfWeek)
    .reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = Math.max(state.budget - monthExpense, 0);

  const categoryTotals = state.categories
    .map((category) => {
      const total = monthTransactions.filter((item) => item.categoryId === category.id).reduce((sum, item) => sum + item.amount, 0);
      return { ...category, total, percent: monthExpense ? (total / monthExpense) * 100 : 0 };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const dailyTotalsMap = new Map();
  monthTransactions.forEach((item) => {
    dailyTotalsMap.set(item.date, (dailyTotalsMap.get(item.date) || 0) + item.amount);
  });

  const dailyTotals = Array.from(dailyTotalsMap.entries())
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, total]) => ({ date, total }));

  const peakDayEntry = dailyTotals.reduce((peak, item) => (item.total > peak.total ? item : peak), { date: "", total: 0 });
  const dailyAverage = dailyTotals.length ? monthExpense / dailyTotals.length : 0;
  const projectedMonthExpense = dailyAverage * daysInMonth;
  const projectedMonthEnd = state.budget ? state.budget - projectedMonthExpense : 0;
  const forecastDaysLeft = dailyAverage > 0 ? Math.floor(remainingBudget / dailyAverage) : daysLeftIncludingToday;

  // Today's allowance is based on the budget position at the start of today,
  // then reduced by what has already been spent today.
  const remainingBeforeTodaySpend = Math.max(state.budget - (monthExpense - todayExpense), 0);
  const dailyAllowance = state.budget ? remainingBeforeTodaySpend / daysLeftIncludingToday : 0;
  const moneyLeftToday = Math.max(dailyAllowance - todayExpense, 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    monthExpense,
    todayExpense,
    weekExpense,
    remainingBudget,
    dailyAllowance,
    moneyLeftToday,
    budgetUsedPercent: state.budget ? (monthExpense / state.budget) * 100 : 0,
    categoryTotals,
    dailyTotals,
    dailyAverage,
    peakDayEntry,
    projectedMonthExpense,
    projectedMonthEnd,
    forecastDaysLeft,
    daysLeftIncludingToday,
    topCategory: categoryTotals[0] || null
  };
}

function getMoneyLeftMessage(metrics) {
  if (!state.budget) {
    return "Set your monthly budget to unlock your daily spend guide.";
  }
  if (metrics.remainingBudget <= 0) {
    return "You've exhausted this month's budget. Log income or raise the budget to reset your runway.";
  }
  if (metrics.moneyLeftToday <= 0) {
    return "You've used today's spending allowance. Keeping the rest of the day light will protect the month.";
  }
  if (metrics.todayExpense > 0) {
    return `${formatCurrency(metrics.moneyLeftToday)} left for today. You're still within today's plan.`;
  }
  return `You have ${formatCurrency(metrics.dailyAllowance)} available to spend today and stay on track for the month.`;
}

function openTransactionEntry(type) {
  elements.transactionForm.reset();
  elements.amountInput.value = "";
  elements.dateInput.value = formatDateInput(new Date());
  renderCategorySelect();
  setActiveType(type);
  openModal(elements.transactionModal);
}

function openBudgetModal() {
  if (!elements.budgetModal || !elements.budgetInput) {
    return;
  }
  elements.budgetInput.value = state.budget ? String(state.budget) : "";
  openModal(elements.budgetModal);
  requestAnimationFrame(() => {
    elements.budgetInput.focus();
    elements.budgetInput.select?.();
  });
}

function scrollToAnalytics() {
  setActivePage("insights");
}

function setActivePage(page) {
  activePage = page;
  elements.homePage?.classList.toggle("app-page--hidden", page !== "home");
  elements.insightsPage?.classList.toggle("app-page--hidden", page !== "insights");
  elements.bottomHomeButton?.classList.toggle("bottom-nav__item--active", page === "home");
  elements.bottomInsightsButton?.classList.toggle("bottom-nav__item--active", page === "insights");
  if (elements.screen) {
    elements.screen.scrollTo({ top: 0, behavior: "auto" });
  }
}

function getCategoryById(id) {
  return state.categories.find((category) => category.id === id);
}

function setActiveType(type) {
  activeType = type;
  document.querySelectorAll("[data-type]").forEach((button) => {
    button.classList.toggle("type-toggle__button--active", button.dataset.type === type);
  });
}

function openModal(modal) {
  if (!modal || modal.open) {
    return;
  }
  if (typeof modal.showModal === "function") {
    modal.showModal();
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(initialState);
    }
    const parsed = JSON.parse(raw);
    return {
      budget: Number(parsed.budget) || 0,
      categories: Array.isArray(parsed.categories) && parsed.categories.length ? parsed.categories : structuredClone(defaultCategories),
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions.map((item) => ({ ...item, amount: Number(item.amount) || 0 })) : []
    };
  } catch {
    return structuredClone(initialState);
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatReadableDate(dateString) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(dateString));
}

function getStartOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function slugify(value) {
  const base = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = base || `category-${Math.floor(Math.random() * 10000)}`;
  return state.categories.some((category) => category.id === slug) ? `${slug}-${Date.now().toString().slice(-4)}` : slug;
}

function renderTransactions() {
  elements.transactionsGroups.innerHTML = "";

  if (!state.transactions.length) {
    elements.transactionsGroups.innerHTML = '<p class="empty-state">No transactions yet. Tap + to log your first spend in under five seconds.</p>';
    return;
  }

  const sortedTransactions = state.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date) || new Date(b.createdAt) - new Date(a.createdAt));

  const monthGroups = groupTransactionsByMonth(sortedTransactions);

  monthGroups.forEach((monthGroup) => {
    const monthSection = document.createElement("section");
    monthSection.className = "transaction-month";
    monthSection.innerHTML = `<div class="transaction-month__header"><div><p class="transaction-month__eyebrow">${monthGroup.count} entries</p><h4>${monthGroup.label}</h4></div><span>${formatSignedAmount(monthGroup.total)}</span></div>`;

    monthGroup.days.forEach((dayGroup) => {
      const daySection = document.createElement("div");
      daySection.className = "transaction-day";
      daySection.innerHTML = `<div class="transaction-day__header"><strong>${dayGroup.label}</strong><span>${formatSignedAmount(dayGroup.total)}</span></div>`;

      const list = document.createElement("div");
      list.className = "transactions-list";

      dayGroup.items.forEach((transaction) => {
        const node = elements.transactionItemTemplate.content.firstElementChild.cloneNode(true);
        const category = getCategoryById(transaction.categoryId);
        const title = node.querySelector(".transaction-item__title");
        const amount = node.querySelector(".transaction-item__amount");
        const meta = node.querySelector(".transaction-item__meta");
        const icon = node.querySelector(".transaction-item__icon");
        const deleteButton = node.querySelector(".transaction-item__delete");

        title.textContent = category ? `${category.icon} ${category.name}` : transaction.categoryId;
        amount.textContent = `${transaction.type === "income" ? "+" : "-"}${formatCurrency(transaction.amount)}`;
        amount.classList.add(transaction.type === "income" ? "transaction-item__amount--income" : "transaction-item__amount--expense");
        meta.textContent = [formatReadableDate(transaction.date), transaction.note].filter(Boolean).join(" • ");
        icon.textContent = category?.icon || "•";
        icon.style.background = category?.color || "#57e3ff";
        deleteButton.dataset.transactionId = transaction.id;
        list.appendChild(node);
      });

      daySection.appendChild(list);
      monthSection.appendChild(daySection);
    });

    elements.transactionsGroups.appendChild(monthSection);
  });
}

function setActivePage(page) {
  activePage = page;
  elements.homePage?.classList.toggle("app-page--hidden", page !== "home");
  elements.insightsPage?.classList.toggle("app-page--hidden", page !== "insights");
  elements.transactionsPage?.classList.toggle("app-page--hidden", page !== "transactions");
  elements.forecastPage?.classList.toggle("app-page--hidden", page !== "forecast");
  elements.homePage?.classList.toggle("app-page--active", page === "home");
  elements.insightsPage?.classList.toggle("app-page--active", page === "insights");
  elements.transactionsPage?.classList.toggle("app-page--active", page === "transactions");
  elements.forecastPage?.classList.toggle("app-page--active", page === "forecast");
  elements.bottomHomeButton?.classList.toggle("bottom-nav__item--active", page === "home");
  elements.bottomInsightsButton?.classList.toggle("bottom-nav__item--active", page === "insights");
  elements.bottomTransactionsButton?.classList.toggle("bottom-nav__item--active", page === "transactions");
  elements.bottomForecastButton?.classList.toggle("bottom-nav__item--active", page === "forecast");
  if (elements.screen) {
    elements.screen.scrollTo({ top: 0, behavior: "auto" });
  }
}

function groupTransactionsByMonth(transactions) {
  const monthMap = new Map();

  transactions.forEach((transaction) => {
    const date = new Date(transaction.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(date),
        total: 0,
        days: new Map()
      });
    }

    const monthGroup = monthMap.get(monthKey);
    monthGroup.total += transaction.type === "expense" ? transaction.amount : -transaction.amount;

    if (!monthGroup.days.has(transaction.date)) {
      monthGroup.days.set(transaction.date, {
        label: formatDayLabel(transaction.date),
        total: 0,
        items: []
      });
    }

    const dayGroup = monthGroup.days.get(transaction.date);
    dayGroup.total += transaction.type === "expense" ? transaction.amount : -transaction.amount;
    dayGroup.items.push(transaction);
  });

  return Array.from(monthMap.values()).map((monthGroup) => ({
    label: monthGroup.label,
    total: monthGroup.total,
    count: Array.from(monthGroup.days.values()).reduce((sum, day) => sum + day.items.length, 0),
    days: Array.from(monthGroup.days.values())
  }));
}

function formatDayLabel(dateString) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(dateString));
}

function formatSignedAmount(value) {
  const sign = value > 0 ? "-" : value < 0 ? "+" : "";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

function deleteTransaction(transactionId) {
  if (!transactionId) {
    return;
  }
  state.transactions = state.transactions.filter((transaction) => transaction.id !== transactionId);
  persist();
  render();
}

function handleAmountKeypad(keypadValue, keypadAction) {
  const current = elements.amountInput.value || "";
  if (keypadAction === "clear") {
    elements.amountInput.value = "";
    return;
  }
  if (keypadAction === "backspace") {
    elements.amountInput.value = current.slice(0, -1);
    return;
  }
  if (!keypadValue) {
    return;
  }
  elements.amountInput.value = current === "0" ? keypadValue : `${current}${keypadValue}`;
}

function applyAmountPreset(preset) {
  const value = Number(preset);
  const current = Number(elements.amountInput.value || 0);
  elements.amountInput.value = String(current + value);
}

function setAnimatedText(element, nextValue) {
  if (!element) {
    return;
  }
  const previousValue = displayedValues.get(element);
  if (previousValue !== undefined && previousValue !== nextValue) {
    element.classList.remove("value-pop");
    void element.offsetWidth;
    element.classList.add("value-pop");
  }
  element.textContent = nextValue;
  displayedValues.set(element, nextValue);
}
