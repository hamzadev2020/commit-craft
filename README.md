# ⚡ CommitCraft

AI-powered Git commit messages using Google Gemini. Generate, review, edit, and commit smarter.

## ✨ Features

- Automatically generates Conventional Commit messages.
- Review, regenerate, or edit messages before committing.
- Works with any Git repository.
- Keeps your Gemini API key in a local `.env` file.

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/commit-craft.git
cd commit-craft
```

Replace `YOUR-USERNAME` with the GitHub username that owns the repository.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your Gemini API key

Create your local `.env` file from the example:

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env
notepad .env
```

**macOS / Linux:**
```bash
cp .env.example .env
nano .env
```

Add your own Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Save the file. Keep `.env` private and never upload it to GitHub.

## 💻 How to use CommitCraft

You can use CommitCraft with any Git project on your computer.

### 1. Open your project

```bash
cd /path/to/your-project
```

On Windows, use the actual path to your project folder.

### 2. Stage the changes you want to commit

```bash
git add path/to/your-changed-file
```

Replace the example path with the file or files you want to commit.

### 3. Run CommitCraft

```bash
node /path/to/commit-craft/index.js
```

Replace `/path/to/commit-craft/index.js` with the actual location of your cloned CommitCraft folder.

On Windows PowerShell, for example:

```powershell
node "C:\Users\YourName\tools\commit-craft\index.js"
```

Run this command from inside your target project folder.

### 4. Choose an action

- **Enter / y** — Commit using the generated message.
- **r** — Generate another message.
- **e** — Enter your own commit message.
- **q** — Cancel.

## 🔐 Security

- Never commit your `.env` file.
- Use your own Gemini API key.
- Keep `.env.example` in GitHub, but leave the real `.env` out.
- Make sure `.env` is listed in `.gitignore`.

Happy committing! 🚀
