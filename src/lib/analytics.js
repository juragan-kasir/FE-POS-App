const GTAG_SCRIPT_URL = "https://www.googletagmanager.com/gtag/js";
const CONSULT_CLICK_EVENT = "consult_click";

export const CONSULT_PLACEMENT = Object.freeze({
  page: "page",
  closing: "closing",
  floating: "floating"
});

const pushToDataLayer = function () {
  window.dataLayer.push(arguments);
};

export const loadAnalytics = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = pushToDataLayer;
  window.gtag("js", new Date());
  window.gtag("config", measurementId);

  const script = document.createElement("script");
  script.async = true;
  script.src = `${GTAG_SCRIPT_URL}?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
};

export const trackConsultClick = (channel, placement) => {
  window.gtag?.("event", CONSULT_CLICK_EVENT, { channel, placement });
};
