// Website-wide translator powered by the Google Website Translator widget.
// It works by setting the `googtrans` cookie Google's script reads on load,
// then reloading the page — no per-string translation files to maintain.
// These helpers are called once, globally, from App.jsx (not from
// LanguageSwitcher itself) so the banner-hiding watcher runs on EVERY route
// — including Login/Register/Admin/Seller/SuperAdmin pages, which don't
// render the main Navbar (where LanguageSwitcher normally lives).
export const COOKIE_NAME = 'googtrans';

export const getCurrentLangCode = () => {
  const match = document.cookie.match(/googtrans=\/en\/(\w+)/);
  return match ? match[1] : 'en';
};

export const setLanguageCookie = (code) => {
  const value = code === 'en' ? '' : `/en/${code}`;
  const expires = code === 'en' ? 'Thu, 01 Jan 1970 00:00:00 UTC' : '';
  const base = `${COOKIE_NAME}=${value};path=/;${expires ? `expires=${expires};` : ''}`;
  document.cookie = base;
  document.cookie = `${base}domain=${window.location.hostname}`;
};

let scriptLoadStarted = false;

export const loadGoogleTranslateScript = () => {
  if (scriptLoadStarted || window.google?.translate) return;
  scriptLoadStarted = true;

  window.googleTranslateElementInit = () => {
    // eslint-disable-next-line no-new
    new window.google.translate.TranslateElement(
      { pageLanguage: 'en', autoDisplay: false },
      'google_translate_element'
    );
  };

  const script = document.createElement('script');
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  script.async = true;
  document.body.appendChild(script);
};

// The banner Google injects sometimes sets its own inline styles after our
// stylesheet has already applied, winning the cascade race. Watching for it
// and force-hiding it in JS is the reliable fix instead of trusting CSS alone.
export const startBannerWatcher = () => {
  const suppress = () => {
    document.querySelectorAll('.goog-te-banner-frame, iframe.skiptranslate').forEach(el => {
      el.style.display = 'none';
      el.style.height = '0';
    });
    document.body.style.top = '0px';
    document.body.style.position = document.body.style.position === 'fixed' ? 'static' : document.body.style.position;
  };
  suppress();
  const observer = new MutationObserver(suppress);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  return observer;
};
