import { defineContentScript, createShadowRootUi } from '#imports';
import { createApp } from 'vue';
import ToDo from '../views/ToDoIndex.vue';
import '../assets/tailwind.css'; // Import tailwind styles
import { setupContentMessageListeners } from '../messaging/content';

export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: 'ui',
  async main(ctx) {
    let uiRef: { current: any } = { current: null };
    let isMounted = { value: false };

    setupContentMessageListeners(uiRef, isMounted);

    uiRef.current = await createShadowRootUi(ctx, {
      name: 'action-copilot-shadow-root',
      position: 'overlay',
      anchor: 'body',
      append: 'last',
      zIndex: 2147483647,
      onMount: (container, shadow, shadowHost) => {
        const app = createApp(ToDo);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
  }
});