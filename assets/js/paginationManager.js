export class PaginationManager {
    constructor(container, storyManager) {
      this.container = container;
      this.storyManager = storyManager;
      this.render();
    }
  
    render() {
      const paginationHtml = `
        <div class="pagination">
          <button class="prev-page">Previous</button>
          <span class="page-info"></span>
          <button class="next-page">Next</button>
        </div>
      `;
      if (this.container) {
        this.container.insertAdjacentHTML('beforeend', paginationHtml);
        this.addEventListeners();
      }
    }
  
    addEventListeners() {
      this.container.querySelector('.prev-page').addEventListener('click', () => {
        const currentPage = this.storyManager.dataManager.cache.pagination.currentPage;
        if (currentPage > 1) {
          this.storyManager.loadPage(currentPage - 1);
        }
      });
  
      this.container.querySelector('.next-page').addEventListener('click', () => {
        const { currentPage, totalPages } = this.storyManager.dataManager.getPaginatedData();
        if (currentPage < totalPages) {
          this.storyManager.loadPage(currentPage + 1);
        }
      });
    }
  }