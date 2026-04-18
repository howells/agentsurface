# Installation Guide

Install the Agent Surface skills for Claude Code, Codex CLI, or generic agent runtimes.

Agent Surface currently ships two local skills:

- `agentify` - audit and transform codebases for AI agent consumption
- `agents` - scaffold and update agent systems, tools, workflows, memory, and model routing

## Claude Code (Recommended)

### Option 1: Plugin Marketplace (Easiest)

In Claude Code, type:
```
/plugin install agentsurface
```

This installs the Agent Surface plugin from the Claude Code plugin marketplace if published there. The skills are then available as `/agentify` and `/agents` in any project.

### Option 2: Git Clone (Personal/Team)

```bash
git clone https://github.com/howells/agentsurface /path/to/agentsurface
cp -r /path/to/agentsurface/skills/agentify ~/.claude/skills/
cp -r /path/to/agentsurface/skills/agents ~/.claude/skills/
```

This copies both skills into your personal skills directory so they are available in all projects.

### Option 3: Project-Specific

Copy the skill into your project's `.claude/` directory:

```bash
cp -r skills/agentify .claude/skills/
cp -r skills/agents .claude/skills/
git add .claude/skills/agentify .claude/skills/agents
git commit -m "Add Agent Surface skills"
```

Now `/agentify` and `/agents` are available only in this project.

---

## OpenAI Codex CLI (April 2026)

Codex reads `AGENTS.md` at your project root. To use Agent Surface skills with Codex:

### 1. Create an AGENTS.md (if you don't have one)

~~~markdown
# Your Project Name

Describe your project here.

## Skills and Tools

- [agentify](https://github.com/howells/agentsurface/blob/main/skills/agentify/SKILL.md) — Audit and transform your codebase for agent consumption
- [agents](https://github.com/howells/agentsurface/blob/main/skills/agents/SKILL.md) — Scaffold or update agent systems
~~~

### 2. Point to agentify

Replace the URL with your local path if you've cloned the repo:

```markdown
- [agentify](./path/to/agentsurface/skills/agentify/SKILL.md) — Audit this codebase
- [agents](./path/to/agentsurface/skills/agents/SKILL.md) — Scaffold or update agents
```

Or use the remote GitHub URL (Codex can fetch it):

```markdown
- [agentify](https://raw.githubusercontent.com/howells/agentsurface/main/skills/agentify/SKILL.md) — Audit this codebase
- [agents](https://raw.githubusercontent.com/howells/agentsurface/main/skills/agents/SKILL.md) — Scaffold or update agents
```

### 3. Use with Codex

In Codex CLI, type:
```bash
codex "Audit this project with agentify. Focus on API design and error handling."
codex "Use the agents skill to add memory to this Mastra project."
```

Codex will:
1. Read your AGENTS.md
2. Discover the skill references
3. Fetch the SKILL.md if needed
4. Delegate to Claude Code or execute the audit directly (depending on Codex version)

---

## Generic Agent Runtimes (Cursor, Devin, Jules, etc.)

These runtimes also respect the AGENTS.md convention. Follow the Codex instructions above, and they will work similarly.

---

## Distribution as .skill Packages

For sharing via tarball or zip:

1. **Create the package:**
   ```bash
   cd agentsurface
   zip -r agentify-1.0.0.skill skills/agentify/ -x "*.git*"
   zip -r agents-1.0.0.skill skills/agents/ -x "*.git*"
   ```

2. **Share the .skill file** with users (e.g., via email, GitHub releases, or a package manager).

3. **Installation** (for a hypothetical `skills.sh` package manager, if it exists):
   ```bash
   skills.sh install agentify-1.0.0.skill
   skills.sh install agents-1.0.0.skill
   ```

Currently, no official `skills.sh` registry exists. Use Git or manual installation instead.

---

## Verify Installation

### For Claude Code

In any project, type:
```
/agentify
/agents
```

You should see the selected skill begin its workflow.

### For Codex

```bash
codex "Tell me about the Agent Surface skills. What can they do?"
```

Codex should cite the SKILL.md content from your AGENTS.md references.

---

## Troubleshooting

### "Skill not found" in Claude Code

- Check that the skill is in the correct directory:
  - Personal: `~/.claude/skills/agentify/SKILL.md`
  - Project: `.claude/skills/agentify/SKILL.md`
  - Marketplace installs are managed by Claude Code and may not appear as a project-local file

- Restart Claude Code to reload skill directories.

### Codex can't find the skills

- Ensure your AGENTS.md is at the project root.
- Check the relative paths: `[agentify](./skills/agentify/SKILL.md)` and `[agents](./skills/agents/SKILL.md)`, or use the GitHub raw URLs.
- Codex may need to be updated to the latest version (April 2026+).

### Version mismatch

- Ensure you're running Claude Code 1.0.0+ and Codex 0.1.0+.
- For plugin-based installation, check the marketplace for version compatibility.

---

## Questions?

See the [agentify skill](./skills/agentify/SKILL.md), the [agents skill](./skills/agents/SKILL.md), or the project [README](https://github.com/howells/agentsurface).
