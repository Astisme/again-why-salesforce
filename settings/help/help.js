class HelpAws extends HTMLElement {
  static get observedAttributes() {
    return ['href', 'target', 'rel'];
  }

  constructor() {
    super();
    const tpl = document.getElementById('help-template');
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(tpl.content.cloneNode(true));
    this._anchor = shadow.querySelector('a.button');
const linkEl = document.createElement('link');
linkEl.setAttribute('rel', 'stylesheet');
linkEl.setAttribute('href', new URL('./help.css', import.meta.url));
this.shadowRoot.appendChild(linkEl);
  }


  connectedCallback() {
    // On first connect, sync any attributes already set on the host
    this._syncLink();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    // Whenever href, target, or rel changes, re-sync the anchor
    if (oldValue !== newValue) {
      this._syncLink();
    }
  }

  _syncLink() {
    // Read host attributes or fall back to sensible defaults
    const href  = this.getAttribute('href')  ?? '#';
    const target = this.getAttribute('target') ?? "_blank";
    const rel    = this.getAttribute('rel');

    this._anchor.setAttribute('href', href);

    if (target !== null) {
      this._anchor.setAttribute('target', target);
    } else {
      this._anchor.removeAttribute('target');
    }

    if (rel !== null) {
      this._anchor.setAttribute('rel', rel);
    } else {
      this._anchor.removeAttribute('rel');
    }
  }
}

customElements.define('help-aws', HelpAws);
