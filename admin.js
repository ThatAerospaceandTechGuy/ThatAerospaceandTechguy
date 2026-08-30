// GitHub API Sync Engine & TinyMCE Configuration
class GitHubSync {
    constructor() {
        this.pat = localStorage.getItem('github_pat') || '';
        this.repo = localStorage.getItem('github_repo') || '';
        this.branch = localStorage.getItem('github_branch') || 'main';
        this.apiBase = 'https://api.github.com/repos';
        this.isLoggedIn = false;
        this.init();
    }

    init() {
        this.bindLoginForm();
        this.bindConfigForm();
        this.bindLogout();
        this.checkLogin();
        this.initTinyMCE();
    }

    bindLoginForm() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    bindConfigForm() {
        const configForm = document.getElementById('configForm');
        configForm.addEventListener('submit', (e) => this.handleConfigSubmit(e));
    }

    bindLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    checkLogin() {
        const loggedIn = localStorage.getItem('admin_logged_in') === 'true';
        if (loggedIn) {
            this.isLoggedIn = true;
            this.showConfig();
            this.loadSavedConfig();
        } else {
            this.showLogin();
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (username === 'websiteadmin' && password === 'admin123') {
            this.isLoggedIn = true;
            localStorage.setItem('admin_logged_in', 'true');
            this.showLoginStatus('Login successful!', 'success');
            setTimeout(() => {
                this.showConfig();
                this.loadSavedConfig();
            }, 500);
        } else {
            this.showLoginStatus('Invalid credentials', 'error');
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        localStorage.removeItem('admin_logged_in');
        localStorage.removeItem('github_pat');
        localStorage.removeItem('github_repo');
        localStorage.removeItem('github_branch');
        this.pat = '';
        this.repo = '';
        this.branch = 'main';
        this.showLogin();
        document.getElementById('loginForm').reset();
    }

    loadSavedConfig() {
        if (this.pat && this.repo) {
            document.getElementById('patToken').value = this.pat;
            document.getElementById('repoName').value = this.repo;
            document.getElementById('branchName').value = this.branch;
            this.showConfigStatus('Configuration loaded from storage', 'info');
            this.showEditor();
            this.loadProjectsList();
        }
    }

    async handleConfigSubmit(e) {
        e.preventDefault();
        const pat = document.getElementById('patToken').value.trim();
        const repo = document.getElementById('repoName').value.trim();
        const branch = document.getElementById('branchName').value.trim() || 'main';

        if (!pat || !repo) {
            this.showConfigStatus('Please fill in all required fields', 'error');
            return;
        }

        this.showConfigStatus('Validating configuration...', 'info');
        
        try {
            await this.validateConfig(pat, repo, branch);
            this.pat = pat;
            this.repo = repo;
            this.branch = branch;
            localStorage.setItem('github_pat', pat);
            localStorage.setItem('github_repo', repo);
            localStorage.setItem('github_branch', branch);
            this.showConfigStatus('Configuration saved successfully!', 'success');
            this.showEditor();
            this.loadProjectsList();
        } catch (error) {
            this.showConfigStatus(`Validation failed: ${error.message}`, 'error');
        }
    }

    async validateConfig(pat, repo, branch) {
        const url = `${this.apiBase}/${repo}/contents/projects.json?ref=${branch}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'MyPortfolio-Admin'
            }
        });

        if (response.status === 404) {
            return true;
        }
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `GitHub API error: ${response.status}`);
        }
        return true;
    }

    showLogin() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('configSection').style.display = 'none';
        document.getElementById('editorSection').style.display = 'none';
        document.getElementById('projectsSection').style.display = 'none';
    }

    showConfig() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('configSection').style.display = 'block';
        document.getElementById('editorSection').style.display = 'none';
        document.getElementById('projectsSection').style.display = 'none';
    }

    showEditor() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('configSection').style.display = 'none';
        document.getElementById('editorSection').style.display = 'block';
        document.getElementById('projectsSection').style.display = 'block';
    }

    showLoginStatus(message, type) {
        const status = document.getElementById('loginStatus');
        status.textContent = message;
        status.className = `status-message show status-${type}`;
    }

    showConfigStatus(message, type) {
        const status = document.getElementById('configStatus');
        status.textContent = message;
        status.className = `status-message show status-${type}`;
    }

    initTinyMCE() {
        tinymce.init({
            selector: '#projectContent',
            height: 400,
            menubar: false,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | outdent indent | numlist bullist | link image media | code fullscreen preview | help',
            font_formats: 'Inter=Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;Arial=arial,helvetica,sans-serif;Courier New=courier new,courier,monospace;Georgia=georgia,times new roman,times,serif;Times New Roman=times new roman,times,serif',
            fontsize_formats: '8pt 10pt 12pt 14pt 18pt 24pt 36pt 48pt 60pt 72pt',
            content_style: `
                body {
                    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    font-size: 14px;
                    line-height: 1.6;
                    color: #e6edf3;
                    background: #0d1117;
                }
                img { max-width: 100%; height: auto; border-radius: 8px; }
                video { max-width: 100%; border-radius: 8px; }
                iframe { border-radius: 8px; }
                pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; overflow-x: auto; }
                code { background: #161b22; padding: 0.2rem 0.4rem; border-radius: 4px; }
                blockquote { border-left: 3px solid #38bdf8; padding-left: 1rem; margin: 1rem 0; color: #8b949e; font-style: italic; }
            `,
            images_upload_handler: (blobInfo, success, failure) => {
                const reader = new FileReader();
                reader.onload = () => success(reader.result);
                reader.onerror = () => failure('Failed to read file');
                reader.readAsDataURL(blobInfo.blob());
            },
            media_live_embeds: true,
            media_dimensions: false,
            promotion: false,
            license_key: 'gpl',
            setup: (editor) => {
                editor.on('init', () => {
                    document.getElementById('projectForm').addEventListener('submit', (e) => this.handlePublish(e));
                });
            }
        });
    }

    async handlePublish(e) {
        e.preventDefault();
        
        const title = document.getElementById('projectTitle').value.trim();
        const content = tinymce.get('projectContent').getContent();
        const image = document.getElementById('projectImage').value.trim();

        if (!title || !content) {
            this.showEditorStatus('Please fill in title and content', 'error');
            return;
        }

        const publishBtn = document.getElementById('publishBtn');
        const btnText = publishBtn.querySelector('.btn-text');
        const spinner = publishBtn.querySelector('.spinner');
        
        publishBtn.disabled = true;
        btnText.textContent = 'Publishing...';
        spinner.style.display = 'block';
        this.showEditorStatus('Publishing to GitHub...', 'info');

        try {
            await this.publishProject({ title, content, image });
            this.showEditorStatus('Project published successfully! GitHub is rebuilding your site on Cloudflare Pages.', 'success');
            document.getElementById('projectForm').reset();
            tinymce.get('projectContent').setContent('');
            this.loadProjectsList();
        } catch (error) {
            this.showEditorStatus(`Publish failed: ${error.message}`, 'error');
        } finally {
            publishBtn.disabled = false;
            btnText.textContent = 'Publish Project';
            spinner.style.display = 'none';
        }
    }

    async publishProject(project) {
        const newProject = {
            id: crypto.randomUUID(),
            title: project.title,
            date: new Date().toISOString(),
            content: project.content,
            image: project.image || null
        };

        let projects = [];
        let sha = null;

        try {
            const response = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
                const content = this.base64Decode(data.content);
                projects = JSON.parse(content);
            }
        } catch (error) {
            if (error.status !== 404) throw error;
        }

        projects.unshift(newProject);

        const jsonContent = JSON.stringify(projects, null, 2);
        const encodedContent = this.base64Encode(jsonContent);

        const commitResponse = await this.githubRequest('PUT', 'contents/projects.json', {
            message: `Add project: ${project.title}`,
            content: encodedContent,
            branch: this.branch,
            sha: sha
        });

        if (!commitResponse.ok) {
            const error = await commitResponse.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to commit to GitHub');
        }

        return commitResponse.json();
    }

    async loadProjectsList() {
        const listContainer = document.getElementById('projectList');
        const status = document.getElementById('projectsStatus');
        
        try {
            const response = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            
            if (response.status === 404) {
                listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No projects published yet.</p>';
                return;
            }

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const content = this.base64Decode(data.content);
            const projects = JSON.parse(content);

            if (!projects.length) {
                listContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No projects published yet.</p>';
                return;
            }

            listContainer.innerHTML = projects.map(project => `
                <div class="project-list-item">
                    <div class="project-list-info">
                        <h4>${this.escapeHtml(project.title)}</h4>
                        <span class="project-date">Published on ${this.formatDate(project.date)}</span>
                    </div>
                    <div class="project-list-actions">
                        <button class="btn btn-secondary btn-sm" onclick="githubSync.deleteProject('${project.id}')">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading projects list:', error);
            status.textContent = `Failed to load projects: ${error.message}`;
            status.className = 'status-message show status-error';
        }
    }

    async deleteProject(id) {
        if (!confirm('Are you sure you want to delete this project?')) return;

        const status = document.getElementById('projectsStatus');
        status.textContent = 'Deleting project...';
        status.className = 'status-message show status-info';

        try {
            const response = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const sha = data.sha;
            const content = this.base64Decode(data.content);
            let projects = JSON.parse(content);

            projects = projects.filter(p => p.id !== id);

            const jsonContent = JSON.stringify(projects, null, 2);
            const encodedContent = this.base64Encode(jsonContent);

            const commitResponse = await this.githubRequest('PUT', 'contents/projects.json', {
                message: `Delete project: ${id}`,
                content: encodedContent,
                branch: this.branch,
                sha: sha
            });

            if (!commitResponse.ok) {
                const error = await commitResponse.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to delete project');
            }

            status.textContent = 'Project deleted successfully!';
            status.className = 'status-message show status-success';
            this.loadProjectsList();
        } catch (error) {
            status.textContent = `Delete failed: ${error.message}`;
            status.className = 'status-message show status-error';
        }
    }

    async githubRequest(method, endpoint, body = null) {
        const url = `${this.apiBase}/${this.repo}/${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'MyPortfolio-Admin'
            }
        };
        if (body) options.body = JSON.stringify(body);
        return fetch(url, options);
    }

    base64Encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    base64Decode(str) {
        return decodeURIComponent(escape(atob(str)));
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showEditorStatus(message, type) {
        const status = document.getElementById('editorStatus');
        status.textContent = message;
        status.className = `status-message show status-${type}`;
    }
}

const githubSync = new GitHubSync();