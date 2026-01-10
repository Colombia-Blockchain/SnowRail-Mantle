---
name: code-simplifier
description: Simplifies and refines code for clarity, consistency, and maintainability while preserving all functionality. Focuses on recently modified code unless instructed otherwise. Use when you want to clean up code after implementation or refactor for readability.
---

# Code Simplifier

Expert code simplification specialist focused on enhancing code clarity, consistency, and maintainability while preserving exact functionality. Prioritizes readable, explicit code over overly compact solutions.

## Quick Start

Invoke this skill after writing or modifying code to automatically refine it:

```
/code-simplifier
```

Or specify a file/directory:

```
/code-simplifier src/components/MyComponent.tsx
```

## Core Principles

### 1. Preserve Functionality

Never change what the code does - only how it does it. All original features, outputs, and behaviors must remain intact.

### 2. Apply Project Standards

Follow established coding standards from CLAUDE.md including:

- Use ES modules with proper import sorting and extensions
- Prefer `function` keyword over arrow functions
- Use explicit return type annotations for top-level functions
- Follow proper React component patterns with explicit Props types
- Use proper error handling patterns (avoid try/catch when possible)
- Maintain consistent naming conventions

### 3. Enhance Clarity

Simplify code structure by:

- Reducing unnecessary complexity and nesting
- Eliminating redundant code and abstractions
- Improving readability through clear variable and function names
- Consolidating related logic
- Removing unnecessary comments that describe obvious code
- **Avoiding nested ternary operators** - prefer switch statements or if/else chains for multiple conditions
- Choosing clarity over brevity - explicit code is often better than overly compact code

### 4. Maintain Balance

Avoid over-simplification that could:

- Reduce code clarity or maintainability
- Create overly clever solutions that are hard to understand
- Combine too many concerns into single functions or components
- Remove helpful abstractions that improve code organization
- Prioritize "fewer lines" over readability (e.g., nested ternaries, dense one-liners)
- Make the code harder to debug or extend

### 5. Focus Scope

Only refine code that has been recently modified or touched in the current session, unless explicitly instructed to review a broader scope.

## Refinement Process

1. **Identify** the recently modified code sections
2. **Analyze** for opportunities to improve elegance and consistency
3. **Apply** project-specific best practices and coding standards
4. **Ensure** all functionality remains unchanged
5. **Verify** the refined code is simpler and more maintainable
6. **Document** only significant changes that affect understanding

## Anti-Patterns to Avoid

### Overly Compact Code

```typescript
// BAD: Nested ternaries are hard to read
const status = isLoading ? 'loading' : hasError ? 'error' : isSuccess ? 'success' : 'idle';

// GOOD: Explicit switch/if-else
function getStatus(): string {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  if (isSuccess) return 'success';
  return 'idle';
}
```

### Premature Abstraction

```typescript
// BAD: Unnecessary abstraction for one-time use
const formatUserName = (first: string, last: string) => `${first} ${last}`;
const name = formatUserName(user.firstName, user.lastName);

// GOOD: Inline when only used once
const name = `${user.firstName} ${user.lastName}`;
```

### Over-Engineering

```typescript
// BAD: Generic factory for single use case
const createHandler = (type: string) => (data: unknown) => handlers[type](data);

// GOOD: Direct implementation
function handleSubmit(data: FormData): void {
  // direct logic here
}
```

## When to Use This Skill

- After implementing a new feature
- When refactoring existing code
- Before committing changes
- When code feels "messy" but works correctly
- To ensure consistency across a codebase

## Reference Documentation

See `references/simplification_patterns.md` for detailed examples and patterns.

## Best Practices Summary

### Readability First

- Clear variable names over short ones
- Explicit logic over clever shortcuts
- Comments only where intent isn't obvious

### Consistency

- Follow existing project patterns
- Match surrounding code style
- Use consistent naming conventions

### Simplicity

- One function, one purpose
- Minimal nesting depth
- No dead code or unused variables
