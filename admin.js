// GitHub API Sync Engine & QuillJS Configuration with File Uploads
class GitHubSync {
    constructor() {
        this.pat = localStorage.getItem('github_pat') || '';
        this.repo = localStorage.getItem('github_repo') || '';
        this.branch = localStorage.getItem('github_branch') || 'main';
        this.apiBase = 'https://api.github.com/repos';
        this.isLoggedIn = false;
        this.quill = null;
        this.editingProjectId = null;
        this.pendingFiles = [];
        this.uploadedFiles = [];
        this.init();
    }

    init() {
        this.bindLoginForm();
        this.bindConfigForm();
        this.bindLogout();
        this.bindCancelEdit();
        this.bindFileUpload();
        this.checkLogin();
        this.initQuill();
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

    bindCancelEdit() {
        const cancelBtn = document.getElementById('cancelEditBtn');
        cancelBtn.addEventListener('click', () => this.cancelEdit());
    }

    bindFileUpload() {
        const fileInput = document.getElementById('projectFiles');
        const uploadArea = document.getElementById('fileUploadArea');
        
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });
        
        uploadArea.addEventListener('click', (e) => {
            if (e.target === uploadArea || e.target.closest('.file-upload-label')) {
                fileInput.click();
            }
        });
    }

    handleFiles(fileList) {
        for (const file of fileList) {
            if (this.pendingFiles.find(f => f.name === file.name && f.size === file.size)) continue;
            this.pendingFiles.push(file);
        }
        this.renderFileList();
    }

    renderFileList() {
        const list = document.getElementById('fileList');
        if (!this.pendingFiles.length && !this.uploadedFiles.length) {
            list.innerHTML = '';
            return;
        }
        
        list.innerHTML = [
            ...this.uploadedFiles.map((file, i) => this.createFileItem(file, i, true)),
            ...this.pendingFiles.map((file, i) => this.createFileItem(file, i, false))
        ].join('');
    }

    createFileItem(file, index, isUploaded) {
        const icon = this.getFileIcon(file.name);
        const size = this.formatFileSize(isUploaded ? file.size : file.size);
        const name = this.escapeHtml(file.name);
        const removeAction = isUploaded 
            ? `githubSync.removeUploadedFile(${index})` 
            : `githubSync.removePendingFile(${index})`;
        
        return `
            <div class="file-item">
                <div class="file-info">
                    <div class="file-icon">${icon}</div>
                    <div class="file-details">
                        <div class="file-name">${name}</div>
                        <div class="file-size">${size} ${isUploaded ? '(uploaded)' : '(pending)'}</div>
                    </div>
                </div>
                <button type="button" class="file-remove" onclick="${removeAction}" title="Remove">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }

    getFileIcon(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const icons = {
            // Images
            jpg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            png: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            gif: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            webp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
            // Documents
            pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
            doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
            docx: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
            txt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
            md: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
            // Code
            js: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            ts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            py: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            css: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            json: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            cpp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            c: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
            // Archives
            zip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M21 16V11a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/></svg>',
            rar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M21 16V11a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/></svg>',
            '7z': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v3"/><path d="M21 16V11a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"/></svg>',
            // Video/Audio
            mp4: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
            mp3: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>',
        };
        return icons[ext] || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    }

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    removePendingFile(index) {
        this.pendingFiles.splice(index, 1);
        this.renderFileList();
    }

    removeUploadedFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderFileList();
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

        if (response.status === 404) return true;
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
        this.pendingFiles = [];
        this.uploadedFiles = [];
        document.getElementById('editingProjectId').value = '';
        document.getElementById('projectFolder').value = '';
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

    async handlePublish(e) {
        e.preventDefault();
        
        const title = document.getElementById('projectTitle').value.trim();
        const content = this.quill.root.innerHTML;
        const image = document.getElementById('projectImage').value.trim();
        const editingId = document.getElementById('editingProjectId').value;

        if (!title || !content.trim() || content === '<p><br></p>') {
            this.showEditorStatus('Please fill in title and content', 'error');
            return;
        }

        const publishBtn = document.getElementById('publishBtn');
        const btnText = publishBtn.querySelector('.btn-text');
        const spinner = publishBtn.querySelector('.spinner');
        
        publishBtn.disabled = true;
        btnText.textContent = editingId ? 'Updating...' : 'Publishing...';
        spinner.style.display = 'block';
        this.showEditorStatus(editingId ? 'Updating project...' : 'Publishing to GitHub...', 'info');

        try {
            const folder = document.getElementById('projectFolder').value || this.slugify(title);
            
            // Upload pending files first
            if (this.pendingFiles.length) {
                this.showEditorStatus('Uploading files...', 'info');
                await this.uploadFiles(folder);
            }

            const files = [...this.uploadedFiles];

            if (editingId) {
                await this.updateProject(editingId, { title, content, image, folder, files });
                this.showEditorStatus('Project updated successfully! GitHub is rebuilding your site.', 'success');
            } else {
                await this.publishProject({ title, content, image, folder, files });
                this.showEditorStatus('Project published successfully! GitHub is rebuilding your site.', 'success');
            }
            this.cancelEdit();
            this.loadProjectsList();
        } catch (error) {
            this.showEditorStatus(`${editingId ? 'Update' : 'Publish'} failed: ${error.message}`, 'error');
        } finally {
            publishBtn.disabled = false;
            btnText.textContent = 'Publish Project';
            spinner.style.display = 'none';
        }
    }

    async uploadFiles(folder) {
        for (const file of this.pendingFiles) {
            const base64 = await this.fileToBase64(file);
            const path = `projects/${folder}/assets/${file.name}`;
            
            const response = await this.githubRequest('PUT', `contents/${path}`, {
                message: `Add asset: ${file.name}`,
                content: base64,
                branch: this.branch
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(`Failed to upload ${file.name}: ${error.message}`);
            }

            const data = await response.json();
            this.uploadedFiles.push({
                name: file.name,
                path: path,
                size: file.size,
                sha: data.content.sha,
                downloadUrl: `https://raw.githubusercontent.com/${this.repo}/${this.branch}/${path}`
            });
        }
        this.pendingFiles = [];
        this.renderFileList();
    }

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async publishProject(project) {
        const newProject = {
            id: crypto.randomUUID(),
            title: project.title,
            date: new Date().toISOString(),
            content: project.content,
            image: project.image || null,
            folder: project.folder,
            files: project.files
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

        // Also save page content as pagecode/index.html
        await this.savePageCode(project.folder, project.content, project.files);

        return commitResponse.json();
    }

    async updateProject(projectId, project) {
        let projects = [];
        let sha = null;

        try {
            const response = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            sha = data.sha;
            const content = this.base64Decode(data.content);
            projects = JSON.parse(content);
        } catch (error) {
            throw new Error('Failed to fetch existing projects');
        }

        const index = projects.findIndex(p => p.id === projectId);
        if (index === -1) throw new Error('Project not found');

        // Merge existing files with new uploads
        const existingFiles = projects[index].files || [];
        const allFiles = [...existingFiles, ...project.files];

        projects[index] = {
            ...projects[index],
            title: project.title,
            content: project.content,
            image: project.image || null,
            folder: project.folder || projects[index].folder,
            files: allFiles
        };

        const jsonContent = JSON.stringify(projects, null, 2);
        const encodedContent = this.base64Encode(jsonContent);

        const commitResponse = await this.githubRequest('PUT', 'contents/projects.json', {
            message: `Update project: ${project.title}`,
            content: encodedContent,
            branch: this.branch,
            sha: sha
        });

        if (!commitResponse.ok) {
            const error = await commitResponse.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to commit to GitHub');
        }

        // Also update page content
        await this.savePageCode(projects[index].folder, project.content, allFiles);

        return commitResponse.json();
    }

async savePageCode(folder, content, files = []) {
        const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(this.getProjectTitle(folder))} | MyPortfolio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --bg-main: #0d1117; --bg-card: #161b22; --accent: #38bdf8; --text-primary: #e6edf3; --text-secondary: #8b949e; --border: #30363d; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; background: var(--bg-main); color: var(--text-primary); line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        .back-link { color: var(--accent); text-decoration: none; display: inline-block; margin-bottom: 2rem; }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        .project-meta { color: var(--text-secondary); margin-bottom: 2rem; }
        .project-content { font-size: 1.1rem; line-height: 1.8; }
        .project-content img { max-width: 100%; border-radius: 8px; margin: 1rem 0; }
        .files-section { margin-top: 3rem; padding-top: 2rem; border-top: 1px solid var(--border); }
        .file-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .file-item { display: flex; align-items: center; gap: 1rem; padding: 1rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; color: var(--text-primary); }
        .file-item:hover { border-color: var(--accent); }
        .file-icon { width: 40px; height: 40px; background: var(--bg-main); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--accent); }
        .file-name { font-weight: 500; }
        .file-size { font-size: 0.85rem; color: var(--text-secondary); }
    </style>
</head>
<body>
    <div class="container">
        <a href="../../../index.html" class="back-link">← Back to Portfolio</a>
        <h1>${this.escapeHtml(this.getProjectTitle(folder))}</h1>
        <div class="project-meta">Published project</div>
        <div class="project-content">${content}</div>
        <div class="files-section">
            <h2>Project Files</h2>
            <div class="file-list" id="fileList"></div>
        </div>
    </div>
    <script>
        const files = ${JSON.stringify(files.map(f => ({ name: f.name, downloadUrl: f.downloadUrl, size: f.size })))}; 
        const list = document.getElementById('fileList');
        const icons = { 
            pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
            default: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
        };
        function getIcon(name) { const ext = name.split('.').pop().toLowerCase(); return icons[ext] || icons.default; }
        function formatSize(bytes) { if (bytes < 1024) return bytes + ' B'; if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB'; return (bytes/(1024*1024)).toFixed(1) + ' MB'; }
        list.innerHTML = files.map(f => '<a href="' + f.downloadUrl + '" target="_blank" class="file-item"><div class="file-icon">' + getIcon(f.name) + '</div><div><div class="file-name">' + f.name + '</div><div class="file-size">' + formatSize(f.size) + '</div></div></a>').join('');
    </script>
</body>
</html>`;

        const base64 = this.base64Encode(pageHtml);
        const path = `projects/${folder}/pagecode/index.html`;
        
        try {
            // Check if file exists to get SHA
            let sha = null;
            const checkResponse = await this.githubRequest('GET', `contents/${path}?ref=${this.branch}`);
            if (checkResponse.ok) {
                const data = await checkResponse.json();
                sha = data.sha;
            }
            
            const body = {
                message: `Update pagecode for ${folder}`,
                content: base64,
                branch: this.branch
            };
            if (sha) body.sha = sha;
            
            await this.githubRequest('PUT', `contents/${path}`, body);
        } catch (error) {
            console.warn('Could not save pagecode:', error.message);
        }
    }

    getProjectTitle(folder) {
        // Try to find project title from folder name
        return folder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
            
            const body = {
                message: `Update pagecode for ${folder}`,
                content: base64,
                branch: this.branch
            };
            if (sha) body.sha = sha;
            
            await this.githubRequest('PUT', `contents/${path}`, body);
        } catch (error) {
            console.warn('Could not save pagecode:', error.message);
        }
    }

    getProjectTitle(folder) {
        // Try to find project title from folder name
        return folder.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
                        ${project.folder ? `<span class="project-folder" style="font-size: 0.75rem; color: var(--accent); margin-left: 0.5rem;">/${project.folder}/</span>` : ''}
                        ${project.files && project.files.length ? `<span class="file-count" style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${project.files.length} file(s)</span>` : ''}
                    </div>
                    <div class="project-list-actions">
                        <button class="btn btn-primary btn-sm" onclick="githubSync.editProject('${project.id}')">Edit</button>
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

    async editProject(id) {
        const status = document.getElementById('projectsStatus');
        status.textContent = 'Loading project...';
        status.className = 'status-message show status-info';

        try {
            const response = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const content = this.base64Decode(data.content);
            const projects = JSON.parse(content);

            const project = projects.find(p => p.id === id);
            if (!project) throw new Error('Project not found');

            this.editingProjectId = id;
            this.uploadedFiles = project.files || [];
            this.pendingFiles = [];
            
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
        } catch (error) {
            status.textContent = `Failed to load project: ${error.message}`;
            status.className = 'status-message show status-error';
        }
    }

    async deleteProject(id) {
        if (!confirm('Are you sure you want to delete this project and all its files?')) return;

        const status = document.getElementById('projectsStatus');
        status.textContent = 'Deleting project...';
        status.className = 'status-message show status-info';

        try {
            // First get the project to know its folder
            const listResponse = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            if (!listResponse.ok) throw new Error(`HTTP ${listResponse.status}`);
            const listData = await listResponse.json();
            const listContent = this.base64Decode(listData.content);
            const projects = JSON.parse(listContent);
            const project = projects.find(p => p.id === id);
            
            // Delete project files if folder exists
            if (project && project.folder) {
                // Note: GitHub API doesn't support recursive delete, so we'd need to delete each file
                // For now, we'll just remove from projects.json. Files remain in repo.
                // A full implementation would list and delete each file in the folder.
            }

            // Remove from projects.json
            const response = await this.githubRequest('GET', `contents/projects.json?ref=${this.branch}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const sha = data.sha;
            const content = this.base64Decode(data.content);
            let projectList = JSON.parse(content);

            projectList = projectList.filter(p => p.id !== id);

            const jsonContent = JSON.stringify(projectList, null, 2);
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
            
            if (this.editingProjectId === id) this.cancelEdit();
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