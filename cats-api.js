import { LitElement, html, css } from "lit";


export class CatsApi extends LitElement {
  static get properties() {
    return {
      images: { type: Array },
      allImages: { type: Array },
      page: { type: Number },
      perPage: { type: Number },
      loading: { type: Boolean },
      theme: { type: String, reflect: true },
      modalImage: { type: Object },
      modalOpen: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.images = [];
    this.allImages = [];
    this.page = 1;
    this.perPage = 50; // load 50 images per batch
    this.loading = true;
    this.theme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    this.modalImage = null;
    this.modalOpen = false;
    this.paginationObserver = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // ensure the document reflects the initial theme so page-level CSS can respond
    try {
      document.documentElement.setAttribute('data-theme', this.theme);
    } catch (e) {
      // ignore (e.g., server-side or restricted environments)
    }
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
      --background: #100101;  // tried using DDD, did not work (?)
      --text: #ffffff;    
      --card-bg: #0d2a6d; 
    }

      :host([theme="light"]) {
      --background: #ffffff; 
      --text: #02040b;          
      --card-bg: #a0ccf7;        
    }


      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
      }

      @media(max-width: 900px){
        .grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media(max-width: 600px){
        .grid {
          grid-template-columns: 1fr;
        }
      }

      .card {
        background-color: var(--card-bg);
        border-radius: 0.5rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: transform 0.2s, box-shadow 0.2s;
        opacity: 0;
        animation: fadeIn 0.6s ease-in forwards;
      }

      .card:hover {
        transform: scale(1.03);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }

      .card img {
        width: 100%;
        height: 250px;
        object-fit: cover;
        cursor: pointer;
        display: block;
      }

      .card-info {
        padding: 1rem 1rem;
      }

      .author {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.5rem;
        padding: 0.5rem 0.5rem
      }

      .author img {
        width: 50px;
        height: 50px;
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
        font-size: 1.2rem;
      }

      .like-button.punch {
        animation: punch 0.25s ease-in-out;
      }

      @keyframes punch {
        0% { transform: scale(1); box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        50% { transform: scale(1.3); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
        100% { transform: scale(1); box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

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

      .theme-toggle {
        position: fixed;
        top: 1rem;
        right: 1rem;
        padding: 0.5rem 1rem;
        border-radius: 2rem;
        background-color: var(--card-bg);
        color: var(--text);
        border: none;
        cursor: pointer;
        font-size: 1.2rem;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        transition: transform 0.2s;
        z-index: 100;
      }

      .theme-toggle:hover {
        transform: scale(1.1);
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
      this.allImages = (data.images || []).map(img => ({ ...img, liked: false }));
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
    this.setupImageObserver();
    this.setupPaginationObserver();
  }

  setupImageObserver() {
  const images = this.shadowRoot.querySelectorAll('img[data-src]');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        observer.unobserve(img);
      }
    });
  }, { rootMargin: "100px" });

  images.forEach(img => observer.observe(img));
}


  setupPaginationObserver() {
    const lastCard = this.shadowRoot.querySelector('.grid .card:last-child');
    if (!lastCard) return;

    if (this.paginationObserver) this.paginationObserver.disconnect();

    this.paginationObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.page * this.perPage < this.allImages.length) {
          this.loadPage();
        }
      });
    }, { rootMargin: "200px" });

    this.paginationObserver.observe(lastCard);
  }

  toggleLike(image, event) {
    image.liked = !image.liked;
    this.requestUpdate();

    const btn = event.currentTarget;
    btn.classList.remove('punch');
    void btn.offsetWidth; // force reflow
    btn.classList.add('punch');
  }

  openModal(img) {
    this.modalImage = img;
    this.modalOpen = true;
  }

  closeModal() {
    this.modalOpen = false;
    this.modalImage = null;
  }

  toggleTheme() {
    this.theme = this.theme === 'dark' ? 'light' : 'dark';
    // reflect global theme so outer page styles can update (body background, etc.)
    try {
      document.documentElement.setAttribute('data-theme', this.theme);
    } catch (e) {
      // ignore
    }
  }

  shareImage(img) {
  const url = img.full;
  if (navigator.share) {
    navigator.share({
      title: img.name,
      text: "Check out this cat!",
      url
    }).catch(() => {});
  } 
  else {
    navigator.clipboard.writeText(url).then(() => {
      alert("Link copied to clipboard:\n" + url);
    });
  }
}

  render() {
    return html`
      <button class="theme-toggle" @click="${this.toggleTheme}">
        ${this.theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <div class="grid">
        ${this.images.map((img, index) => html`
          <div class="card" id="cat-${img.id}" style="animation-delay: ${(index % this.perPage) * 0.05}s">
            <div class="author">
              <img src="${img.author.avatar}" />
              <div>
                <h4><b>${img.author.name}</b></h4>
                ${img.author.channel}<br>(User since ${img.author.userSince})<br>
              </div>
            </div>

            <img
              src="${img.thumbnail}"
              alt="${img.name}"
              loading="lazy"
              @click="${() => this.openModal(img)}"
            />


            <div class="actions">
              <button class="like-button" @click="${(e) => this.toggleLike(img, e)}">
                ${img.liked ? '❤️' : '🤍'}
              </button>
              <button @click="${() => alert('Comments!')}">💬</button>
              <button @click="${() => alert('Share to story!')}">🔁</button>
              <button @click="${() => this.shareImage(img)}">🔗</button>
            </div>

            <div class="card-info">
              ${img.dateTaken}<br>
              <strong>${img.name}</strong><br>
            </div>
          </div>
        `)}
      </div>

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
