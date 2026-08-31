// Simple Admin - LocalStorage based with GitHub sync for projects.json only
class SimpleAdmin {
    constructor() {
        this.isLoggedIn = false;
        this.quill = null;
        this.editingProjectId = null;
        this.init();
    }

    init() {
        this.bindLoginForm();
        this.bindLogout();
        this.bindCancelEdit();
        this.checkLogin();
        this.initQuill();
        this.loadProjects();
    }

    bindLoginForm() {
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
    }

    bindLogout() {
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());
    }

    bindCancelEdit() {
        document.getElementById('cancelEditBtn').addEventListener('click', () => this.cancelEdit());
    }

    checkLogin() {
        const loggedIn = localStorage.getItem('admin_logged_in') === 'true';
        if (loggedIn) {
            this.isLoggedIn = true;
            this.showEditor();
            this.loadProjects();
        } else {
            this.showLogin();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (username === 'websiteadmin' && password === 'admin123') {
            this.isLoggedIn = true;
            localStorage.setItem('admin_logged_in', 'true');
            this.showLoginStatus('Login successful!', 'success');
            setTimeout(() => this.showEditor(), 300);
        } else {
            this.showLoginStatus('Invalid credentials', 'error');
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        localStorage.removeItem('admin_logged_in');
        this.showLogin();
        document.getElementById('loginForm').reset();
    }

    showLogin() {
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('editorSection').style.display = 'none';
        document.getElementById('projectsSection').style.display = 'none';
    }

    showEditor() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('editorSection').style.display = 'block';
        document.getElementById('projectsSection').style.display = 'block';
    }

    showLoginStatus(message, type) {
        const status = document.getElementById('loginStatus');
        status.textContent = message;
        status.className = `status-message show status-${type}`;
    }

    initQuill() {
        const toolbarOptions = [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'font': ['Inter', 'Arial', 'Courier New', 'Georgia', 'Times New Roman'] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            ['link', 'image', 'video', 'code-block', 'blockquote'],
            ['clean']
        ];

        this.quill = new Quill('#editor', {
            modules: { toolbar: toolbarOptions },
            placeholder: 'Write your project content...',
            theme: 'snow'
        });

        document.getElementById('projectForm').addEventListener('submit', (e) => this.handlePublish(e));
    }

    cancelEdit() {
        this.editingProjectId = null;
        document.getElementById('editingProjectId').value = '';
        document.getElementById('editorSectionTitle').textContent = 'Create New Project';
        document.getElementById('publishBtn').querySelector('.btn-text').textContent = 'Publish Project';
        document.getElementById('cancelEditBtn').style.display = 'none';
        document.getElementById('projectForm').reset();
        document.getElementById('projectFiles').value = '';
        this.quill.setContents([]);
        this.renderFileList();
        this.showEditorStatus('', 'info');
    }

    slugify(text) {
        return text.toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    getProjects() {
        const stored = localStorage.getItem('portfolio_projects');
        if (stored) return JSON.parse(stored);
        return [];
    }

    saveProjects(projects) {
        localStorage.setItem('portfolio_projects', JSON.stringify(projects));
    }

    loadProjects() {
        const projects = this.getProjects();
        this.renderProjectList(projects);
    }

    renderProjectList(projects) {
        const list = document.getElementById('projectList');
        if (!projects.length) {
            list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No projects yet. Create one!</p>';
            return;
        }
        list.innerHTML = projects.map(p => `
            <div class="project-list-item">
                <div class="project-list-info">
                    <h4>${this.escapeHtml(p.title)}</h4>
                    <span class="project-date">Published on ${this.formatDate(p.date)}</span>
                    ${p.folder ? `<span style="font-size: 0.75rem; color: var(--accent); margin-left: 0.5rem;">/${p.folder}/</span>` : ''}
                    ${p.files && p.files.length ? `<span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${p.files.length} file(s)</span>` : ''}
                </div>
                <div class="project-list-actions">
                    <button class="btn btn-primary btn-sm" onclick="admin.editProject('${p.id}')">Edit</button>
                    <button class="btn btn-secondary btn-sm" onclick="admin.deleteProject('${p.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async handlePublish(e) {
        e.preventDefault();
        
        const title = document.getElementById('projectTitle').value.trim();
        const content = this.quill.root.innerHTML;
        const image = document.getElementById('projectImage').value.trim();
        const folder = document.getElementById('projectFolder').value || this.slugify(title);
        const editingId = document.getElementById('editingProjectId').value;

        if (!title || !content.trim() || content === '<p><br></p>') {
            this.showEditorStatus('Please fill in title and content', 'error');
            return;
        }

        const publishBtn = document.getElementById('publishBtn');
        const btnText = publishBtn.querySelector('.btn-text');
        const spinner = publishBtn.querySelector('.spinner');
        
        publishBtn.disabled = true;
        btnText.textContent = editingId ? 'Updating...' : 'Saving...';
        spinner.style.display = 'block';
        this.showEditorStatus(editingId ? 'Updating project...' : 'Saving project...', 'info');

        try {
            let projects = this.getProjects();
            const files = this.getFileList(); // Returns array of {name, url, size}

            if (editingId) {
                const idx = projects.findIndex(p => p.id === editingId);
                if (idx !== -1) {
                    projects[idx] = { ...projects[idx], title, content, image, folder, files };
                }
                this.showEditorStatus('Project updated! Commit & push to deploy.', 'success');
            } else {
                projects.unshift({
                    id: crypto.randomUUID(),
                    title, content, image, folder, files,
                    date: new Date().toISOString()
                });
                this.showEditorStatus('Project created! Commit & push to deploy.', 'success');
            }

            this.saveProjects(projects);
            this.renderProjectList(projects);
            this.cancelEdit();
            
            // Show export option
            this.showExportNotice();
        } catch (error) {
            this.showEditorStatus(`Save failed: ${error.message}`, 'error');
        } finally {
            publishBtn.disabled = false;
            btnText.textContent = 'Publish Project';
            spinner.style.display = 'none';
        }
    }

    getFileList() {
        // In this simple version, files are managed manually in public/assets/
        // Return empty array - user adds files to repo manually
        return [];
    }

    showExportNotice() {
        const projects = this.getProjects();
        const json = JSON.stringify(projects, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const notice = document.createElement('div');
        notice.style.cssText = 'margin-top: 1rem; padding: 1rem; background: var(--warning); color: var(--bg-main); border-radius: 8px;';
        notice.innerHTML = `
            <strong>⚠ Action Required:</strong> Download <a href="${url}" download="projects.json" style="color: var(--bg-main); text-decoration: underline;">projects.json</a> and replace the one in your repo root, then commit & push. Cloudflare will auto-deploy.
            <br><small>For files: add them to <code>public/assets/projects/${this.editingProjectId || this.slugify(document.getElementById('projectTitle').value)}/</code> in your repo.</small>
        `;
        document.getElementById('editorStatus').appendChild(notice);
    }

    editProject(id) {
        const projects = this.getProjects();
        const project = projects.find(p => p.id === id);
        if (!project) return;

        this.editingProjectId = id;
        document.getElementById('editingProjectId').value = id;
        document.getElementById('projectFolder').value = project.folder || '';
        document.getElementById('projectTitle').value = project.title;
        document.getElementById('projectImage').value = project.image || '';
        this.quill.root.innerHTML = project.content;
        document.getElementById('editorSectionTitle').textContent = 'Edit Project';
        document.getElementById('publishBtn').querySelector('.btn-text').textContent = 'Update Project';
        document.getElementById('cancelEditBtn').style.display = 'inline-flex';
        this.renderFileList();
        this.showEditorStatus('', 'info');
        document.getElementById('editorSection').scrollIntoView({ behavior: 'smooth' });
    }

    deleteProject(id) {
        if (!confirm('Delete this project?')) return;
        let projects = this.getProjects();
        projects = projects.filter(p => p.id !== id);
        this.saveProjects(projects);
        this.renderProjectList(projects);
        if (this.editingProjectId === id) this.cancelEdit();
    }

    renderFileList() {
        // Placeholder - files managed in repo
        document.getElementById('fileList').innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Files are managed in the repo at <code>public/assets/projects/{folder}/</code>. Add files there and commit.</p>';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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

const admin = new SimpleAdmin();