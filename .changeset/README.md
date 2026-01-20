# Changesets

This directory contains changeset files that describe changes made to the project.

## How to use

When you make changes that should be included in a release:

1. Run `npm run changeset` to create a new changeset
2. Follow the prompts to describe your changes
3. Commit the generated changeset file with your changes

The changeset will be automatically processed when your PR is merged to main.

## Types of changes

- **patch**: Bug fixes and small improvements  
- **minor**: New features (backward compatible)
- **major**: Breaking changes

## Automated releases

When PRs with changesets are merged to main:
- A release PR will be automatically created
- When the release PR is merged, a new version will be published
- GitHub releases and git tags will be created automatically