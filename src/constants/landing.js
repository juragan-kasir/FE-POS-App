export const SECTION_IDS = Object.freeze({
  content: "konten",
  platform: "platform",
  pos: "kasir",
  assistant: "asisten-ai",
  about: "tentang",
  problems: "masalah",
  stories: "cerita"
});

const toAnchor = (sectionId) => `#${sectionId}`;

export const PRODUCT_MENU_ITEMS = Object.freeze([
  {
    id: "pos",
    titleKey: "landing.nav.product.pos.title",
    descriptionKey: "landing.nav.product.pos.description",
    href: toAnchor(SECTION_IDS.pos)
  },
  {
    id: "assistant",
    titleKey: "landing.nav.product.assistant.title",
    descriptionKey: "landing.nav.product.assistant.description",
    href: toAnchor(SECTION_IDS.assistant)
  },
  {
    id: "platform",
    titleKey: "landing.nav.product.platform.title",
    descriptionKey: "landing.nav.product.platform.description",
    href: toAnchor(SECTION_IDS.platform)
  }
]);

export const NAV_LINKS = Object.freeze([
  { id: "solutions", labelKey: "landing.nav.solutions", href: toAnchor(SECTION_IDS.problems) },
  { id: "about", labelKey: "landing.nav.about", href: toAnchor(SECTION_IDS.about) }
]);

export const FOOTER_LINKS = Object.freeze([
  {
    id: "platform",
    labelKey: "landing.nav.product.platform.title",
    href: toAnchor(SECTION_IDS.platform)
  },
  { id: "pos", labelKey: "landing.nav.product.pos.title", href: toAnchor(SECTION_IDS.pos) },
  {
    id: "assistant",
    labelKey: "landing.nav.product.assistant.title",
    href: toAnchor(SECTION_IDS.assistant)
  },
  ...NAV_LINKS
]);

export const HERO_ASSURANCE_KEYS = Object.freeze([
  "landing.hero.assurance.install",
  "landing.hero.assurance.training",
  "landing.hero.assurance.support"
]);

export const SAMPLE_RECEIPT = Object.freeze({
  lines: [
    { id: "coffee", labelKey: "landing.receipt.item.coffee", amount: 24000 },
    { id: "rice", labelKey: "landing.receipt.item.rice", amount: 32000 },
    { id: "banana", labelKey: "landing.receipt.item.banana", amount: 18000 },
    { id: "pandan", labelKey: "landing.receipt.item.pandan", amount: 27000 }
  ],
  subtotal: 101000,
  tax: 11110,
  total: 112110
});

export const TRUST_FACTS = Object.freeze([
  { id: "rupiah", titleKey: "landing.trust.rupiah.title", bodyKey: "landing.trust.rupiah.body" },
  { id: "qris", titleKey: "landing.trust.qris.title", bodyKey: "landing.trust.qris.body" },
  { id: "printer", titleKey: "landing.trust.printer.title", bodyKey: "landing.trust.printer.body" },
  {
    id: "whatsapp",
    titleKey: "landing.trust.whatsapp.title",
    bodyKey: "landing.trust.whatsapp.body"
  },
  {
    id: "language",
    titleKey: "landing.trust.language.title",
    bodyKey: "landing.trust.language.body"
  }
]);

export const PLATFORM_STATUS = Object.freeze({ available: "available", guided: "guided" });

export const PLATFORM_CAPABILITIES = Object.freeze([
  {
    id: "pos",
    titleKey: "landing.platform.pos.title",
    bodyKey: "landing.platform.pos.body",
    statusKey: "landing.platform.status.available",
    status: PLATFORM_STATUS.available
  },
  {
    id: "operations",
    titleKey: "landing.platform.operations.title",
    bodyKey: "landing.platform.operations.body",
    statusKey: "landing.platform.status.available",
    status: PLATFORM_STATUS.available
  },
  {
    id: "insights",
    titleKey: "landing.platform.insights.title",
    bodyKey: "landing.platform.insights.body",
    statusKey: "landing.platform.status.available",
    status: PLATFORM_STATUS.available
  },
  {
    id: "assistant",
    titleKey: "landing.platform.assistant.title",
    bodyKey: "landing.platform.assistant.body",
    statusKey: "landing.platform.assistant.status",
    status: PLATFORM_STATUS.guided
  },
  {
    id: "support",
    titleKey: "landing.platform.support.title",
    bodyKey: "landing.platform.support.body",
    statusKey: "landing.platform.status.included",
    status: PLATFORM_STATUS.available
  }
]);

export const POS_VIEWS = Object.freeze([
  {
    id: "cashier",
    tabKey: "landing.pos.view.cashier.tab",
    titleKey: "landing.pos.view.cashier.title",
    altKey: "landing.pos.view.cashier.alt",
    pointKeys: [
      "landing.pos.view.cashier.point1",
      "landing.pos.view.cashier.point2",
      "landing.pos.view.cashier.point3"
    ]
  },
  {
    id: "products",
    tabKey: "landing.pos.view.products.tab",
    titleKey: "landing.pos.view.products.title",
    altKey: "landing.pos.view.products.alt",
    pointKeys: [
      "landing.pos.view.products.point1",
      "landing.pos.view.products.point2",
      "landing.pos.view.products.point3"
    ]
  },
  {
    id: "dashboard",
    tabKey: "landing.pos.view.dashboard.tab",
    titleKey: "landing.pos.view.dashboard.title",
    altKey: "landing.pos.view.dashboard.alt",
    pointKeys: [
      "landing.pos.view.dashboard.point1",
      "landing.pos.view.dashboard.point2",
      "landing.pos.view.dashboard.point3"
    ]
  }
]);

export const POS_EXTRA_FEATURE_KEYS = Object.freeze([
  "landing.pos.extra.kitchen",
  "landing.pos.extra.qr",
  "landing.pos.extra.split",
  "landing.pos.extra.stock",
  "landing.pos.extra.recipe",
  "landing.pos.extra.member",
  "landing.pos.extra.shift",
  "landing.pos.extra.multiStore"
]);

export const CHAT_SENDER = Object.freeze({ owner: "owner", assistant: "assistant" });

export const CHAT_MESSAGES = Object.freeze([
  { id: "ask-sales", sender: CHAT_SENDER.owner, textKey: "landing.assistant.chat.askSales" },
  {
    id: "reply-sales",
    sender: CHAT_SENDER.assistant,
    textKey: "landing.assistant.chat.replySales"
  },
  { id: "ask-best", sender: CHAT_SENDER.owner, textKey: "landing.assistant.chat.askBest" },
  { id: "reply-best", sender: CHAT_SENDER.assistant, textKey: "landing.assistant.chat.replyBest" }
]);

export const ASSISTANT_TOPIC_KEYS = Object.freeze([
  "landing.assistant.topic.summary",
  "landing.assistant.topic.sales",
  "landing.assistant.topic.bestSellers",
  "landing.assistant.topic.stock"
]);

export const SUPPORT_STEPS = Object.freeze([
  {
    id: "consult",
    titleKey: "landing.support.consult.title",
    bodyKey: "landing.support.consult.body"
  },
  { id: "setup", titleKey: "landing.support.setup.title", bodyKey: "landing.support.setup.body" },
  {
    id: "training",
    titleKey: "landing.support.training.title",
    bodyKey: "landing.support.training.body"
  },
  { id: "daily", titleKey: "landing.support.daily.title", bodyKey: "landing.support.daily.body" },
  {
    id: "ongoing",
    titleKey: "landing.support.ongoing.title",
    bodyKey: "landing.support.ongoing.body"
  }
]);

export const BUSINESS_PROBLEMS = Object.freeze([
  {
    id: "sales",
    problemKey: "landing.problems.sales.problem",
    answerKey: "landing.problems.sales.answer"
  },
  {
    id: "manual",
    problemKey: "landing.problems.manual.problem",
    answerKey: "landing.problems.manual.answer"
  },
  {
    id: "stock",
    problemKey: "landing.problems.stock.problem",
    answerKey: "landing.problems.stock.answer"
  },
  {
    id: "menu",
    problemKey: "landing.problems.menu.problem",
    answerKey: "landing.problems.menu.answer"
  },
  {
    id: "time",
    problemKey: "landing.problems.time.problem",
    answerKey: "landing.problems.time.answer"
  }
]);

export const CUSTOMER_STORIES = Object.freeze([]);
