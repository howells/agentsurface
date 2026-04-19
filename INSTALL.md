# Installation Guide

Install the Agent Surface skill for Claude Code, Codex CLI, or generic agent runtimes.

Agent Surface ships a single local skill:

- `surface` - audit, transform, scaffold, and manage AI agent systems, tools, workflows, memory, and model routing

## Claude Code (Recommended)

### Option 1: Plugin Marketplace (Easiest)

In Claude Code, type:
```
/plugin install agentsurface
```

This installs the Agent Surface plugin from the Claude Code plugin marketplace if published there. The skill is then available as `/surface` in any project.

### Option 2: Git Clone (Personal/Team)

```bash
git clone https://github.com/howells/agentsurface /path/to/agentsurface
cp -r /path/to/agentsurface/skills/surface ~/.claude/skills/
```

This copies the skill into your personal skills directory so it is available in all projects.

### Option 3: Project-Specific

Copy the skill into your project's `.claude/` directory:

```bash
cp -r skills/surface .claude/skills/
git add .claude/skills/surface
git commit -m "Add Agent Surface skill"
```

Now `/surface` is available only in this project.

---

## OpenAI Codex CLI (April 2026)

Codex reads `AGENTS.md` at your project root. To use the Agent Surface skill with Codex:

### 1. Create an AGENTS.md (if you don't have one)

~~~markdown
# Your Project Name

Describe your project here.

## Skills and Tools

- [surface](https://github.com/howells/agentsurface/blob/main/skills/surface/SKILL.md) — Audit, transform, scaffold, and manage agent systems
~~~

### 2. Point to surface

Replace the URL with your local path if you've cloned the repo:

```markdown
- [surface](./path/to/agentsurface/skills/surface/SKILL.md) — Audit and scaffold agent systems
```

Or use the remote GitHub URL (Codex can fetch it):

```markdown
- [surface](https://raw.githubusercontent.com/howells/agentsurface/main/skills/surface/SKILL.md) — Audit and scaffold agent systems
```

### 3. Use with Codex

In Codex CLI, type:
```bash
codex "Audit this project with surface. Focus on API design and error handling."
codex "Use the surface skill to add memory to this Mastra project."
```

Codex will:
1. Read your AGENTS.md
2. Discover the skill reference
3. Fetch the SKILL.md if needed
4. Delegate to Claude Code or execute the audit directly (depending on Codex version)

---

## Generic Agent Runtimes (Cursor, Devin, Jules, etc.)

These runtimes also respect the AGENTS.md convention. Follow the Codex instructions above, and they will work similarly.

---

## Install with skills.sh

The Skills CLI can install the skill from the GitHub repo:

```bash
npx skills add https://github.com/howells/agentsurface --skill surface
```

This installs the Agent Surface skill:

- `surface` - audit, transform, scaffold, and manage AI agent systems, tools, workflows, memory, and model routing

See the [skills.sh CLI docs](https://skills.sh/docs/cli) for the current command reference.

---

## Distribution as .skill Packages

For sharing via tarball or zip:

1. **Create the package:**
   ```bash
   cd agentsurface
   zip -r surface-1.0.0.skill skills/surface/ -x "*.git*"
   ```

2. **Share the .skill file** with users via GitHub releases or another distribution channel.

---

## Verify Installation

### For Claude Code

In any project, type:
```
/surface
```

You should see the skill begin its workflow.

### For Codex

```bash
codex "Tell me about the Agent Surface skill. What can it do?"
```

Codex should cite the SKILL.md content from your AGENTS.md reference.

---

## Troubleshooting

### "Skill not found" in Claude Code

- Check that the skill is in the correct directory:
  - Personal: `~/.claude/skills/surface/SKILL.md`
  - Project: `.claude/skills/surface/SKILL.md`
  - Marketplace installs are managed by Claude Code and may not appear as a project-local file

- Restart Claude Code to reload skill directories.

### Codex can't find the skill

- Ensure your AGENTS.md is at the project root.
- Check the relative path: `[surface](./skills/surface/SKILL.md)`, or use the GitHub raw URL.
- Codex may need to be updated to the latest version (April 2026+).

### Version mismatch

- Ensure you're running Claude Code 1.0.0+ and Codex 0.1.0+.
- For plugin-based installation, check the marketplace for version compatibility.

---

## Questions?

See the [surface skill](./skills/surface/SKILL.md) or the project [README](https://github.com/howells/agentsurface).
