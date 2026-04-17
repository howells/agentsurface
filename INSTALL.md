# Installation Guide

Install agentify for Claude Code, Codex CLI, or generic agent runtimes.

## Claude Code (Recommended)

### Option 1: Plugin Marketplace (Easiest)

In Claude Code, type:
```
/plugin install agentify
```

This installs the skill from the Claude Code plugin marketplace. The skill is then available as `/agentify` in any project.

### Option 2: Git Clone (Personal/Team)

```bash
git clone https://github.com/anthropics/agent-zero ~/.claude/skills/agentify
```

This installs to your personal skills directory. Available in all projects.

### Option 3: Project-Specific

Copy the skill into your project's `.claude/` directory:

```bash
cp -r skills/agentify .claude/skills/
git add .claude/skills/agentify
git commit -m "Add agentify skill"
```

Now `/agentify` is available only in this project.

---

## OpenAI Codex CLI (April 2026)

Codex reads `AGENTS.md` at your project root. To use agentify with Codex:

### 1. Create an AGENTS.md (if you don't have one)

```markdown
# Your Project Name

Describe your project here.

## Skills and Tools

- [agentify](https://github.com/anthropics/agent-zero/blob/main/skills/agentify/SKILL.md) — Audit and transform your codebase for agent consumption

## Build

```bash
pnpm install && pnpm build
```

## Test

```bash
pnpm test
```
```

### 2. Point to agentify

Replace the URL with your local path if you've cloned the repo:

```markdown
- [agentify](./path/to/agent-zero/skills/agentify/SKILL.md) — Audit this codebase
```

Or use the remote GitHub URL (Codex can fetch it):

```markdown
- [agentify](https://raw.githubusercontent.com/anthropics/agent-zero/main/skills/agentify/SKILL.md) — Audit this codebase
```

### 3. Use with Codex

In Codex CLI, type:
```bash
codex "Audit this project with agentify. Focus on API design and error handling."
```

Codex will:
1. Read your AGENTS.md
2. Discover the agentify skill reference
3. Fetch the SKILL.md if needed
4. Delegate to Claude Code or execute the audit directly (depending on Codex version)

---

## Generic Agent Runtimes (Cursor, Devin, Jules, etc.)

These runtimes also respect the AGENTS.md convention. Follow the Codex instructions above, and they will work similarly.

---

## Distribution as .skill Package

For sharing via tarball or zip:

1. **Create the package:**
   ```bash
   cd agent-zero
   zip -r agentify-1.0.0.skill -r skills/agentify/ -x "*.git*"
   ```

2. **Share the .skill file** with users (e.g., via email, GitHub releases, or a package manager).

3. **Installation** (for a hypothetical `skills.sh` package manager, if it exists):
   ```bash
   skills.sh install agentify-1.0.0.skill
   # or
   curl https://registry.skills.sh/agentify | sh
   ```

Currently, no official `skills.sh` registry exists. Use Git or manual installation instead.

---

## Verify Installation

### For Claude Code

In any project, type:
```
/agentify
```

You should see the skill invoke and ask for a project path to audit.

### For Codex

```bash
codex "Tell me about the agentify skill. What can it do?"
```

Codex should cite the SKILL.md content from your AGENTS.md reference.

---

## Troubleshooting

### "Skill not found" in Claude Code

- Check that the skill is in the correct directory:
  - Personal: `~/.claude/skills/agentify/SKILL.md`
  - Project: `.claude/skills/agentify/SKILL.md`
  - Plugin: `.claude-plugin/skills/agentify/SKILL.md`

- Restart Claude Code to reload skill directories.

### Codex can't find the skill

- Ensure your AGENTS.md is at the project root.
- Check the relative path: `[agentify](./skills/agentify/SKILL.md)` or use the GitHub raw URL.
- Codex may need to be updated to the latest version (April 2026+).

### Version mismatch

- Ensure you're running Claude Code 1.0.0+ and Codex 0.1.0+.
- For plugin-based installation, check the marketplace for version compatibility.

---

## Questions?

See the [full agentify documentation](./skills/agentify/SKILL.md) or the project [README](https://github.com/anthropics/agent-zero).

