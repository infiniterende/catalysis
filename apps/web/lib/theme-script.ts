export const THEME_KEY = 'catalysis-theme';

/**
 * Runs before first paint, inlined in <head>. A saved choice wins; otherwise the
 * theme follows the system setting.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;
