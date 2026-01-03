# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: blindcal

Frontend design skill for creating distinctive, production-grade interfaces with high design quality. Generates creative, polished code that avoids generic AI aesthetics.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

### Typography
Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt for distinctive choices that elevate aesthetics. Pair a distinctive display font with a refined body font.

### Color & Theme
Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

### Motion
Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.

### Spatial Composition
Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.

### Backgrounds & Visual Details
Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

## Anti-Patterns to Avoid

NEVER use generic AI-generated aesthetics:
- Overused font families (Inter, Roboto, Arial, system fonts)
- Cliched color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

NEVER converge on common choices (Space Grotesk, for example) across generations. Vary between light and dark themes, different fonts, different aesthetics.

## Implementation Approach

Match implementation complexity to the aesthetic vision:
- Maximalist designs need elaborate code with extensive animations and effects
- Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details
- Elegance comes from executing the vision well

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same.

---

## Code Architecture

When designing feature architectures, analyze existing codebase patterns and provide comprehensive implementation blueprints.

### Core Process

1. **Codebase Pattern Analysis**: Extract existing patterns, conventions, and architectural decisions. Identify the technology stack, module boundaries, abstraction layers. Find similar features to understand established approaches.

2. **Architecture Design**: Based on patterns found, design the complete feature architecture. Make decisive choices - pick one approach and commit. Ensure seamless integration with existing code. Design for testability, performance, and maintainability.

3. **Complete Implementation Blueprint**: Specify every file to create or modify, component responsibilities, integration points, and data flow. Break implementation into clear phases with specific tasks.

### Blueprint Output

Deliver a decisive, complete architecture blueprint that includes:

- **Patterns & Conventions Found**: Existing patterns with file:line references, similar features, key abstractions
- **Architecture Decision**: Chosen approach with rationale and trade-offs
- **Component Design**: Each component with file path, responsibilities, dependencies, and interfaces
- **Implementation Map**: Specific files to create/modify with detailed change descriptions
- **Data Flow**: Complete flow from entry points through transformations to outputs
- **Build Sequence**: Phased implementation steps as a checklist
- **Critical Details**: Error handling, state management, testing, performance, and security considerations

Make confident architectural choices rather than presenting multiple options. Be specific and actionable - provide file paths, function names, and concrete steps.

---

## Code Exploration

When analyzing existing features, trace execution paths and map architecture layers to provide complete understanding.

### Analysis Approach

1. **Feature Discovery**: Find entry points (APIs, UI components, CLI commands). Locate core implementation files. Map feature boundaries and configuration.

2. **Code Flow Tracing**: Follow call chains from entry to output. Trace data transformations at each step. Identify all dependencies and integrations. Document state changes and side effects.

3. **Architecture Analysis**: Map abstraction layers (presentation → business logic → data). Identify design patterns and architectural decisions. Document interfaces between components. Note cross-cutting concerns (auth, logging, caching).

4. **Implementation Details**: Key algorithms and data structures. Error handling and edge cases. Performance considerations. Technical debt or improvement areas.

### Exploration Output

Provide comprehensive analysis that enables developers to modify or extend the feature:

- Entry points with file:line references
- Step-by-step execution flow with data transformations
- Key components and their responsibilities
- Architecture insights: patterns, layers, design decisions
- Dependencies (external and internal)
- Observations about strengths, issues, or opportunities
- Essential files list for understanding the feature

Always include specific file paths and line numbers.

---

## Git Worktrees

Create isolated workspaces for feature work without switching branches. Core principle: systematic directory selection + safety verification = reliable isolation.

### Directory Selection Priority

1. **Check existing**: `.worktrees/` (preferred) or `worktrees/`
2. **Check CLAUDE.md**: Look for worktree directory preference
3. **Ask user**: Offer `.worktrees/` (project-local, hidden) or `~/.config/superpowers/worktrees/<project>/` (global)

### Safety Verification

For project-local directories, **MUST verify ignored before creating**:

```bash
git check-ignore -q .worktrees 2>/dev/null
```

If NOT ignored: Add to `.gitignore` and commit before proceeding.

### Creation Steps

1. **Detect project**: `project=$(basename "$(git rev-parse --show-toplevel)")`
2. **Create worktree**: `git worktree add "$path" -b "$BRANCH_NAME"`
3. **Run setup**: Auto-detect from package.json, Cargo.toml, requirements.txt, pyproject.toml, go.mod
4. **Verify baseline**: Run tests to ensure clean starting point
5. **Report**: Location, test status, ready state

### Quick Reference

| Situation | Action |
|-----------|--------|
| `.worktrees/` exists | Use it (verify ignored) |
| `worktrees/` exists | Use it (verify ignored) |
| Both exist | Use `.worktrees/` |
| Neither exists | Check CLAUDE.md → Ask user |
| Directory not ignored | Add to .gitignore + commit |
| Tests fail during baseline | Report failures + ask |

### Red Flags

**Never:**
- Create worktree without verifying it's ignored (project-local)
- Skip baseline test verification
- Proceed with failing tests without asking
- Assume directory location when ambiguous

**Always:**
- Follow directory priority: existing > CLAUDE.md > ask
- Verify directory is ignored for project-local
- Auto-detect and run project setup
- Verify clean test baseline
