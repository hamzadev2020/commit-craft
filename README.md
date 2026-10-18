# ⚡ CommitCraft

AI-powered Git commit message generator using Google Gemini.

## Features

- Generate Conventional Commit messages with AI.
- Review, regenerate, or edit messages before committing.
- Works with any Git repository.
- Keeps API credentials in a local `.env` file.

## Installation

```bash
git clone https://github.com/YOUR-USERNAME/commit-craft.git
cd commit-craft
npm install
```

Replace `YOUR-USERNAME` with the repository owner's GitHub username.

## Configure Gemini API

Create your local environment file:

```bash
```

On Windows PowerShell, run:

```powershell
Copy-Item .env.example .env
notepad .env
```

Add your own API key to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Never upload your real `.env` file or share your API key.

## Usage

Open the Git repository where you want to make a commit, then stage the files you want to include:

```bash
git add path/to/your-file
```

Run CommitCraft using the path where you installed it:

```powershell
node "C:\path\to\commit-craft\index.js"
```

Choose whether to accept the generated message, regenerate it, edit it manually, or cancel.

## Security

Keep `.env` private. Only commit `.env.example`, never your real API credentials.

Happy committing! 🚀