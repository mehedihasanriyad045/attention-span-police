import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  outDir: process.env.ASP_E2E ? '.output-e2e' : '.output',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: ({ browser, manifestVersion }) => {
    const firefox = browser === 'firefox';
    const base = {
      name: 'Attention Span Police',
      short_name: 'ASP',
      description: 'Your attention span has been reported missing. Focus missions, interrogations for distractions, and local investigation reports.',
      action: { default_title: 'Attention Span Police' },
    };
    if (firefox) {
      return {
        ...base,
        permissions: ['storage', 'alarms', 'webRequest', 'webRequestBlocking'],
        optional_permissions: ['*://*/*'],
        browser_specific_settings: { gecko: { id: 'attention-span-police@asp.local', strict_min_version: '115.0', data_collection_permissions: { required: ['none'] } } as any },
        web_accessible_resources: manifestVersion === 2 ? ['interrogation.html'] : undefined,
      } as any;
    }
    return {
      ...base,
      permissions: ['storage', 'alarms', 'declarativeNetRequestWithHostAccess'],
      optional_host_permissions: ['*://*/*'],
      // E2E builds pre-grant host access because automation cannot click the permission prompt.
      ...(process.env.ASP_E2E ? { host_permissions: ['*://*/*'] } : {}),
      web_accessible_resources: [{ resources: ['interrogation.html'], matches: ['<all_urls>'] }],
    };
  },
});
