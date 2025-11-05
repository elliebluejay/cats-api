import { LitElement, html, css } from "lit";

export class CatsApi extends LitElement {
  static get properties() {
    return {
      images: { type: Array },
      allImages: { type: Array },
      page: { type: Number },
      perPage: { type: Number },
      loading: { type: Boolean },
      theme: { type: String },
      modalImage: { type: Object },
      modalOpen: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.images = [];
    this.allImages = [];
    this.page = 1;
    this.perPage = 12;
    this.loading = true;
    this.theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    this.modalImage = null;
    this.modalOpen = false;
    this.observer = null;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        background-color: var(--background);
        color: var(--text);
        font-family: sans-serif;
        padding: 1rem;
      }

      :host([theme="dark"]) {
        --background: #0f172a;
        --text: #f8fafc;
        --card-bg: #27539a;
      }

      :host([theme="light"]) {
        --background: #f8fafc;
        --text: #0f172a;
        --card-bg: #5b9ee1;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
      }

      .card {
        background-color: var(--card-bg);
        border-radius: 0.75rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .card:hover {
        transform: scale(1.03);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }

      .card img {
        width: 100%;
        height: 200px;
        object-fit: cover;
        cursor: pointer;
        display: block;
      }

      .card-info {
        padding: 0.5rem 1rem;
      }

      .author {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
      }

      .author img {
        width: 30px;
        height: 30px;
        border-radius: 50%;
      }

      .actions {
        display: flex;
        justify-content: space-around;
        padding: 0.5rem;
        border-top: 1px solid #ccc;
      }

      button {
        cursor: pointer;
        background: none;
        border: none;
        font-size: 1.1rem;
      }

      .load-more {
        display: block;
        margin: 2rem auto;
        padding: 0.5rem 1rem;
        font-weight: bold;
        cursor: pointer;
      }

      /* Modal / Lightbox */
      .modal {
        display: none;
        position: fixed;
        z-index: 999;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.8);
        justify-content: center;
        align-items: center;
        padding: 1rem;
      }

      .modal.open {
        display: flex;
      }

      .modal-content {
        max-width: 90%;
        max-height: 90%;
        position: relative;
        border-radius: 0.5rem;
        overflow: hidden;
        background-color: var(--card-bg);
        padding: 0.5rem;
      }

      .modal-content img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 0.5rem;
      }

      .modal-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        font-size: 1.5rem;
        cursor: pointer;
        background: none;
        border: none;
        color: var(--text);
      }

      @media(max-width: 600px){
        .grid {
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        }

        .card img {
          height: 150px;
        }
      }
    `;
  }

  firstUpdated() {
    this.loadData();
  }

  async loadData() {
    try {
      const res = await fetch(new URL("./data.json", import.meta.url).href);
      const data = await res.json();
      this.allImages = data.images || [];
      this.loading = false;
      this.loadPage();
    } catch (err) {
      console.error("Failed to load data.json", err);
      this.loading = false;
    }
  }

  loadPage() {
    const start = (this.page - 1) * this.perPage;
    const end = start + this.perPage;
    this.images = [...this.images, ...this.allImages.slice(start, end)];
    this.page++;
    this.requestUpdate();
    this.setupLazyLoad();
  }

  setupLazyLoad() {
    if (!this.observer) {
      this.observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src && img.src !== img.dataset.src) {
              img.src = img.dataset.src;
            }
            this.observer.unobserve(img);
          }
        });
      }, { rootMargin: "100px" });
    }

    this.shadowRoot.querySelectorAll('img[data-src]').forEach(img => {
      // Ensure placeholder src is visible immediately
      if (!img.src) img.src = img.dataset.src;
      this.observer.observe(img);
    });
  }

  openModal(image) {
    this.modalImage = image;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.modalImage = null;
  }

  render() {
    return html`
      <div class="grid">
        ${this.images.map(img => html`
          <div class="card">
            <img
              data-src="${img.thumbnail}"
              src="${img.thumbnail}" 
              @click="${() => this.openModal(img)}"
              alt="${img.name}" 
            />
            <div class="card-info">
              <div><strong>${img.name}</strong> (${img.dateTaken})</div>
              <div class="author">
                <img src="${img.author.avatar}" />
                <div>
                  ${img.author.name} <br />
                  ${img.author.channel} <br> (User since ${img.author.userSince})
                </div>
              </div>
            </div>
            <div class="actions">
              <button @click="${() => alert('Liked!')}">👍</button>
              <button @click="${() => alert('Disliked!')}">👎</button>
              <button @click="${() => alert('Loved!')}">❤️</button>
              <button @click="${() => alert('Shared!')}">🔗</button>
            </div>
          </div>
        `)}
      </div>

      ${this.page * this.perPage < this.allImages.length
        ? html`<button class="load-more" @click="${() => this.loadPage()}">Load More Cats</button>`
        : null
      }

      <div class="modal ${this.modalOpen ? 'open' : ''}" @click="${this.closeModal}">
        ${this.modalImage ? html`
          <div class="modal-content" @click="${e => e.stopPropagation()}">
            <button class="modal-close" @click="${this.closeModal}">&times;</button>
            <img src="${this.modalImage.full}" alt="${this.modalImage.name}" />
          </div>
        ` : null}
      </div>
    `;
  }
}

customElements.define("cats-api", CatsApi);
