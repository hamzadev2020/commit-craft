## 🚀 Installation & Setup (Windows)

### Prerequisites
- [Node.js](https://nodejs.org/) version 18 or newer
- [Git](https://git-scm.com/)
- Your own [Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone the repository

Open PowerShell and run:

```powershell
git clone https://github.com/hamzadev2020/commit-craft.git
cd commit-craft
```

### 2. Run the setup script

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

The setup script automatically installs dependencies, asks for your Gemini API key if needed, saves it locally in `.env`, and configures the global `commitcraft` command.

**You only need to configure your API key once on your computer.**

### 💻 How to Use CommitCraft

After setup, open any Git project in PowerShell.

**1. Navigate to your project**

```powershell
cd "C:\path\to\your-project"
```

Replace the example path with your actual project folder.

**2. Stage the files you want to commit**

```powershell
git status
git add path/to/your-file
```

Replace the example file path with the file you want to commit. You can stage multiple files if needed.

**3. Generate an AI commit message**

```powershell
commitcraft
```

CommitCraft analyzes your Git changes and generates a Conventional Commit message using Gemini.

Choose an option:

- **Enter / y** — Accept the message and create the commit.
- **r** — Generate another message.
- **e** — Enter your own commit message.
- **q** — Cancel.

**4. Push your commit to GitHub**

After the commit succeeds, run:

```powershell
git push
```

### 🔐 Security

- Each developer must use their own Gemini API key.
- Your real `.env` file must never be uploaded to GitHub.
- Keep `.env` in `.gitignore`.
- Only share `.env.example`, which contains the environment variable template.

### ⚡ That's it!

Set up once, then run `commitcraft` from any Git project on your computer.

Happy committing! 🚀
