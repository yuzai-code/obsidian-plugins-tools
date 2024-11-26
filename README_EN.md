# Obsidian Publisher Plugin

[简体中文](README.md) | English

A plugin for publishing Obsidian notes to your personal blog. Currently supports publishing to VitePress sites.

## Features

- Support publishing to VitePress sites
- Support quick publish and directory selection
- Support maintaining original file structure
- Support automatic frontmatter addition
- Support default publishing directory
- Support secure GitHub Token input

## Installation

1. Download the latest version of the plugin
2. Extract to Obsidian plugins directory `.obsidian/plugins/`
3. Enable the plugin in Obsidian settings

## Configuration

### VitePress Settings

- **Enable VitePress Publishing**: Toggle VitePress publishing functionality
- **Add Frontmatter**: Automatically add frontmatter to published documents (including date)
- **Keep File Structure**: Maintain original file directory structure when publishing
- **Default Directory**: Set default target directory for quick publishing

### GitHub Settings

- **GitHub Token**: Personal access token for GitHub API
- **GitHub Username**: Your GitHub username
- **GitHub Repository**: Repository name where VitePress site is located
- **GitHub Branch**: Branch name to publish to (default is main)
- **VitePress Path**: VitePress documentation path in repository

## Usage

### Quick Publish

1. Click the publish icon (paper plane) in toolbar
2. Select "Quick Publish" option
3. Document will be published to default directory (if set) or root directory

### Directory Selection Publishing

1. Click the publish icon in toolbar
2. Select "Choose Directory" option
3. Select target directory from the popup list
4. Document will be published to selected directory

### Command Palette

You can also use these commands via command palette:

- `Quick Publish to VitePress`: Quickly publish current document
- `Publish to VitePress`: Regular publish current document

## Directory Structure

When "Keep File Structure" is enabled:

- Plugin maintains original directory structure from Obsidian
- Example: if file path in Obsidian is `docs/frontend/vue.md`
  - Without default directory: published path will be `vitepressPath/docs/frontend/vue.md`
  - With default directory `posts`: published path will be `vitepressPath/posts/docs/frontend/vue.md`

When "Keep File Structure" is disabled:

- Plugin only uses filename
- Example: for the same file `docs/frontend/vue.md`
  - Without default directory: published path will be `vitepressPath/vue.md`
  - With default directory `posts`: published path will be `vitepressPath/posts/vue.md`

## Notes

1. GitHub Token and related settings must be configured before first use
2. GitHub Token needs repository read/write permissions
3. Recommend checking document format compatibility with VitePress before publishing
4. Be aware of path length limits when "Keep File Structure" is enabled

## Feedback

If you encounter any issues or have feature suggestions, please feel free to submit them in GitHub Issues.

## License

MIT
