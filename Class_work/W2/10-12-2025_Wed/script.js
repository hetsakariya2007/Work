 // ===== API CONFIGURATION =====
        const API_KEY = 'dac7ca15f1c3931e2d9d130fd1df3202';
        const API_BASE_URL = 'https://gnews.io/api/v4/search';

        // ===== APPLICATION STATE =====
        let state = {
            currentCategory: 'india',
            currentQuery: 'India news',
            articles: [],
            displayedArticles: 0,
            articlesPerLoad: 10,
            isLoading: false,
            hasError: false,
            isInitialLoad: true,
            currentPage: 1,
            totalFetched: 0
        };

        // ===== DOM ELEMENTS =====
        const elements = {
            hamburger: document.getElementById('hamburger'),
            sidebar: document.getElementById('sidebar'),
            sidebarOverlay: document.getElementById('sidebarOverlay'),
            mainWrapper: document.getElementById('mainWrapper'),
            articlesContainer: document.getElementById('articlesContainer'),
            loadMoreContainer: document.getElementById('loadMoreContainer'),
            loadMoreBtn: document.getElementById('loadMoreBtn'),
            categoryItems: document.querySelectorAll('.category-item')
        };

        // ===== UTILITY FUNCTIONS =====
        function formatDate(dateString) {
            const date = new Date(dateString);
            const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        }

        function formatTime(dateString) {
            const date = new Date(dateString);
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        function truncateText(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.substr(0, maxLength) + '...';
        }

        // ===== API FUNCTIONS =====
        async function fetchNews(query, maxArticles = 10) {
            try {
                const url = `${API_BASE_URL}?q=${encodeURIComponent(query)}&lang=en&max=${maxArticles}&apikey=${API_KEY}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }
                
                const data = await response.json();
                return data.articles || [];
            } catch (error) {
                console.error('Error fetching news:', error);
                throw error;
            }
        }

        // ===== RENDER FUNCTIONS =====
        function showLoading() {
            // Only show loading for category changes, not initial load
            if (state.displayedArticles === 0 && !state.isInitialLoad) {
                elements.articlesContainer.innerHTML = `
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <div class="loading-text">Loading news...</div>
                    </div>
                `;
            }
        }

        function showError() {
            elements.articlesContainer.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <div class="error-title">Oops! Something went wrong</div>
                    <div class="error-message">We couldn't load the news. Please check your internet connection and try again.</div>
                    <button class="retry-btn" onclick="retryLoadNews()">Retry</button>
                </div>
            `;
            elements.loadMoreContainer.style.display = 'none';
        }

        function showEmpty() {
            elements.articlesContainer.innerHTML = `
                <div class="empty-container">
                    <div class="empty-icon">📰</div>
                    <div class="empty-title">No news found</div>
                    <div class="empty-message">We couldn't find any news for this category. Please try another category.</div>
                </div>
            `;
            elements.loadMoreContainer.style.display = 'none';
        }

        function renderArticle(article) {
            const card = document.createElement('article');
            card.className = 'article-card';
            
            const dateStr = formatDate(article.publishedAt);
            const timeStr = formatTime(article.publishedAt);
            const sourceName = article.source?.name || 'Unknown Source';
            
            // Create image or placeholder
            const imageHTML = article.image 
                ? `<img src="${article.image}" alt="${article.title}" onerror="this.parentElement.innerHTML='<div class=\\'article-placeholder\\'>No Image</div>'">` 
                : '<div class="article-placeholder">No Image</div>';
            
            card.innerHTML = `
                <div class="article-thumbnail">
                    ${imageHTML}
                </div>
                <div class="article-content">
                    <h2 class="article-title">${article.title}</h2>
                    <div class="article-meta">short by ${sourceName} / ${timeStr} on ${dateStr}</div>
                    <p class="article-excerpt">${article.description || 'No description available.'}</p>
                    <a href="${article.url}" class="article-source" target="_blank" onclick="event.stopPropagation()">read more at ${sourceName}</a>
                </div>
            `;
            
            card.onclick = () => window.open(article.url, '_blank');
            
            return card;
        }

        function renderArticles(startIndex, endIndex) {
            const fragment = document.createDocumentFragment();
            const articlesToRender = state.articles.slice(startIndex, endIndex);
            
            articlesToRender.forEach(article => {
                fragment.appendChild(renderArticle(article));
            });
            
            elements.articlesContainer.appendChild(fragment);
            
            // Always show load more button after articles are loaded
            elements.loadMoreContainer.style.display = 'flex';
        }

        // ===== NEWS LOADING FUNCTIONS =====
        async function loadNews(query, clearExisting = true) {
            if (state.isLoading) return;
            
            state.isLoading = true;
            state.hasError = false;
            
            if (clearExisting && !state.isInitialLoad) {
                showLoading();
                elements.loadMoreContainer.style.display = 'none';
            }
            
            try {
                // Fetch articles with pagination support
                const articles = await fetchNews(query, 10);
                
                if (articles.length === 0) {
                    if (clearExisting) {
                        showEmpty();
                        state.articles = [];
                        state.displayedArticles = 0;
                    }
                } else {
                    if (clearExisting) {
                        state.articles = articles;
                        state.displayedArticles = 0;
                        state.totalFetched = articles.length;
                        elements.articlesContainer.innerHTML = '';
                        renderArticles(0, articles.length);
                    } else {
                        // Append new articles for Load More
                        state.articles = [...state.articles, ...articles];
                        const startIndex = state.displayedArticles;
                        state.displayedArticles += articles.length;
                        state.totalFetched += articles.length;
                        renderArticles(startIndex, state.displayedArticles);
                    }
                    
                    // Always show Load More button
                    elements.loadMoreContainer.style.display = 'flex';
                }
                
                state.isInitialLoad = false;
            } catch (error) {
                state.hasError = true;
                if (clearExisting) {
                    showError();
                } else {
                    // Show error in load more button
                    elements.loadMoreBtn.textContent = 'Failed to load. Retry?';
                    elements.loadMoreBtn.disabled = false;
                }
            } finally {
                state.isLoading = false;
            }
        }

        async function loadMoreArticles() {
            if (state.isLoading) return;
            
            elements.loadMoreBtn.disabled = true;
            elements.loadMoreBtn.innerHTML = '<span class="spinner"></span>Loading...';
            
            try {
                // Fetch next batch of articles with different offset/time
                await loadNews(state.currentQuery, false);
                elements.loadMoreBtn.textContent = 'Load More';
                elements.loadMoreBtn.disabled = false;
            } catch (error) {
                elements.loadMoreBtn.textContent = 'Load More';
                elements.loadMoreBtn.disabled = false;
            }
        }

        function retryLoadNews() {
            loadNews(state.currentQuery, true);
        }

        // ===== EVENT HANDLERS =====
        function toggleSidebar() {
            elements.sidebar.classList.toggle('open');
            elements.sidebarOverlay.classList.toggle('active');
            elements.hamburger.classList.toggle('active');
            elements.mainWrapper.classList.toggle('sidebar-open');
        }

        function closeSidebar() {
            elements.sidebar.classList.remove('open');
            elements.sidebarOverlay.classList.remove('active');
            elements.hamburger.classList.remove('active');
            elements.mainWrapper.classList.remove('sidebar-open');
        }

        function handleCategoryClick(event) {
            const categoryItem = event.target.closest('.category-item');
            if (!categoryItem) return;
            
            const category = categoryItem.dataset.category;
            const query = categoryItem.dataset.query;
            
            // Update active state
            elements.categoryItems.forEach(item => item.classList.remove('active'));
            categoryItem.classList.add('active');
            
            // Reset state for new category
            state.currentCategory = category;
            state.currentQuery = query;
            state.currentPage = 1;
            state.totalFetched = 0;
            state.isInitialLoad = false;
            
            loadNews(query, true);
            closeSidebar();
        }

        // ===== EVENT LISTENERS =====
        elements.hamburger.addEventListener('click', toggleSidebar);
        elements.sidebarOverlay.addEventListener('click', closeSidebar);
        elements.loadMoreBtn.addEventListener('click', loadMoreArticles);

        elements.categoryItems.forEach(item => {
            item.addEventListener('click', handleCategoryClick);
        });

        // Close sidebar on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && elements.sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });

        // ===== INITIALIZATION =====
        function init() {
            // Show Load More button initially
            elements.loadMoreContainer.style.display = 'flex';
            
            // Load initial news without loading spinner
            loadNews(state.currentQuery, true);
        }

        // Start the app when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        } 