import { html } from '../../npm/hybrids/src/template/index.js';

const __vite_glob_0_23 = {
  render: () => html`
    <template layout="block">
      <ui-text color="primary" type="body-s"><slot></slot></ui-text>
    </template>
  `.css`
    ui-text {
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-decoration-color: var(--color-quaternary);
      overflow-wrap: break-word;
    }

    @media (hover: hover) {
      ui-text:hover {
        text-decoration-color: var(--color-brand-primary);
      }
    }
  `,
};

export { __vite_glob_0_23 as default };
