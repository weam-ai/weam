
---

# 📦 Changelog

All notable changes to this project will be documented in this file.
This project follows **Semantic Versioning**.

---

## [Unreleased]

### ✨ New Features

* *No changes yet*

### 🔧 Fixes

* *No changes yet*

### ⚙️ Other Changes

* *No changes yet*

---

## [v1.1.5] — 2026-01-02

### Features & Enhancements

* **n8n MCP Integration** - Added comprehensive n8n (Model Context Protocol) server integration
  * `create_n8n_workflow` tool for creating n8n workflows via MCP
  * `execute_n8n_workflow` tool supporting multiple trigger types (form, webhook, schedule, chat, manual)
  * `update_n8n_workflow` tool support via MCP
  * Full n8n API compliance with strict schema adherence
  * Automatic workflow name to ID resolution
  * Intelligent form data generation with indexed field names

### Fixes & Refactors

* Fixed workflow execution errors (trigger initialization, formUrl scope issues)
* Fixed 405 Method Not Allowed errors for schedule triggers
* Fixed workflow name to ID resolution causing 404 errors
* Fixed multipart/form-data requirement for form trigger submissions
* Fixed Zod schema validation errors in MCP tool registration
* Fixed API schema validation errors by strictly adhering to n8n API specification

### Other Changes

* Added `form-data` package dependency for multipart form submissions
* Enhanced n8n API request handling with proper content-type headers
* Improved workflow trigger detection and routing logic
* Updated MCP server tool schemas for better flexibility
* Added comprehensive logging for workflow operations

**Full Changelog**: [1.1.4...1.1.5](https://github.com/weam-ai/weam/compare/1.1.4...1.1.5)

[See full release details][release-v1.1.5]

[release-v1.1.5]: https://github.com/weam-ai/weam/releases/tag/1.1.5

---

## [v1.1.4] — 2025-11-11

### Features & Enhancements

* Nginx SSL Setup for Local Development - simplified configuration for secure local environments. (#215 by @dhruv176-dev)
* Company-Specific LLM API Keys - threads now automatically use organization-level API keys for more flexible AI usage. (#228 by @JiitBhatt)
* Character Image Field Added - schema now supports charimg for storing character images. (#213 by @Jay-Thesia)
* Super Solution Client-Side Mounting - prevents hydration mismatches and improves rendering stability. (#229 by @Jay-Thesia-Weam)
* Enhanced Markdown Rendering improved formatting and readability in MartOutput component. (#231 by @JiitBhatt)
* Perplexity API Validation & File Upload Improvements - better error handling and reliability for AI chat integrations. (#232 by @Jay-Thesia-Weam)

### Fixes & Refactors

* Title Generation Bug Fix for OpenRouter models. (#217 by @JiitBhatt)
* User Report Issue resolved for smoother feedback flow. (#219 by @chsjd)
* Credit Allocation Logic updated to prevent miscounting. (#223 by @Jay-Thesia-Weam)
* Permission Checks Refactored in SettingSidebar for cleaner role-based access. (#227 by @Jay-Thesia-Weam)
* Improved Nginx Local Setup Flow for better onboarding. (#225 by @dhruv176-dev)
* General Cleanup and Minor Fixes, including maintenance updates from #202 and #224

### Contributors

Thanks to all contributors for making this release possible:  
@kstij1, @dhruv176-dev, @JiitBhatt, @Jay-Thesia, @Jay-Thesia-Weam, @chsjd

**Full Changelog**: [1.1.3...1.1.4](https://github.com/weam-ai/weam/compare/1.1.3...1.1.4)

[See full release details][release-v1.1.4]

[release-v1.1.4]: https://github.com/weam-ai/weam/releases/tag/1.1.4

---

## [v1.1.3] — 2025-10-27

### What's New

* **Convert to Shared Brain:**  
  Introduced the ability to convert private brains into shared ones with member and team access.  
  * Added backend endpoint and service for conversion.  
  * Integrated frontend UI with menu action, modal, and instant state updates.  
  * Displays toasts for conversion status and improves collaboration workflows.  
  * Contributed by @SOGeKING-NUL in #187

* **Ollama Local Model Support:**  
  Added support to run local Ollama models directly from the Weam interface.  
  * Enables local LLM execution for privacy, speed, and offline access.  
  * Expands hybrid AI use cases combining local and cloud models.  
  * Contributed by @akshays-weam in #190 and #210

* **Image Tools Enhancements:**  
  Improved image URL handling, markdown formatting, and rendering.  
  * Converts OpenAI image URLs to Base64 for better compatibility.  
  * Replaces MinIO URLs with internal endpoints for consistent access.  
  * Contributed by @JiitBhatt in #208

* **Bug Fixes and UI Improvements:**  
  * Fixed issue where shared brain team members weren't correctly assigned after conversion.  
  * Fixed default GPT model assignment issue.  
  * Enhanced Mascot Agent chat page for improved UX and stability.

### What's Changed

* Dev Ollama implementation by @akshays-weam in #190
* Adds ConvertToShared functionality by @SOGeKING-NUL in #187
* Convert shared brain team assignment fix by @chsjd in #209
* Dev Ollama implementation continued by @akshays-weam in #210
* Assign default GPT issue fixed by @chsjd in #211
* Feat/mascot agent new chatpage by @Jay-Thesia-Weam in #212

### New Contributors

* @SOGeKING-NUL made their first contribution in #187

**Full Changelog**: [1.1.2...1.1.3](https://github.com/weam-ai/weam/compare/1.1.2...1.1.3)

[See full release details][release-v1.1.3]

[release-v1.1.3]: https://github.com/weam-ai/weam/releases/tag/1.1.3

---

## [v1.1.2] — 2025-10-17

### What's New

#### Import Chats

* Seamlessly bring existing or external conversations into Weam.
* Enables users to continue context or reuse prompts across projects.

#### Call Analyzer

* Added a new AI-powered Call Analyzer for summarizing and extracting insights from recorded calls.
* Designed to integrate into team and solution workflows for improved communication tracking.

#### Mascot Agent Interface

* Introduced a new mascot-powered chat page for more engaging and interactive user sessions.

#### AI Docs Enhancements

* Super Solution Docs are now fully integrated within the AI Docs system.
* AI Docs URLs restructured for better accessibility and consistency.

#### AI Model Updates

* New migration functionality for managing company-level model configurations.
* Updated AI model constants to align with latest backend structure.

#### UI & Performance Improvements

* Enhanced Markdown rendering and overall UI design polish.
* Optimized team/member list population for faster page loads.
* Refactored dependencies and cleaned up callback handlers for improved system stability.

### What's Changed

* Ai docs url changes by @chsjd in #196
* Feature/import chat by @JiitBhatt in #197
* Improve Markdown Rendering and UI Styling by @dpatelTaskMe in #199
* Super solution docs to ai-docs done by @chsjd in #200
* Refactor: update dependencies and clean up callback handlers by @JiitBhatt in #201
* Refactor member and team list population in SuperSolutionPage by @Jay-Thesia-Weam in #203
* Update AI Model Constants and Add Migration Functionality for Company Models by @dpatelTaskMe in #204
* Add Call Analyzer & Update Solution Names by @dhruv176-dev in #205
* Feat/mascot agent new chatpage by @Jay-Thesia-Weam in #206

### New Contributors

No new contributors in this release.

**Full Changelog**: [1.1.1...1.1.2](https://github.com/weam-ai/weam/compare/1.1.1...1.1.2)

[See full release details][release-v1.1.2]

[release-v1.1.2]: https://github.com/weam-ai/weam/releases/tag/1.1.2

---

## [v1.1.1] — 2025-10-13

### What's New

* **Multi-Agent Support:** Introduced foundational multi-agent capabilities for enhanced collaboration between AI models within workflows.
* **Ollama Integration:** Added support for Ollama in the open-source repository.  
  * Added support for Ollama within Weam's open-source ecosystem.  
  * Enables local LLM execution directly from the Weam interface.
* **Force Stop for Streaming Responses:**  
  * Added force stop functionality to interrupt ongoing message streaming.  
  * Implemented new FORCE_STOP socket event (frontend + backend).  
  * Added StopStreamButton and StopStreamSubmitButton components.  
  * Updated ChatClone and langgraph services to handle stop requests and cleanup.

### What's Changed

* Shared chat not visible in General Settings by @chsjd in #176
* Ai-adoption report added by @chsjd in #177
* fix: Role duplication error in seed role function by @aryasoni98 in #155
* Role permission pr some un wanted changes removed by @chsjd in #178
* minor design fixes by @ghanshyam-ai in #180
* Bug/open router fix by @JiitBhatt in #179
* feat(chat): add force stop functionality for streaming responses by @het-weamai in #181
* Fix/bug 1.1 by @ghanshyam-ai in #182
* Changes in report and ai recruiter path by @chsjd in #183
* Feature/perplexity by @JiitBhatt in #191
* Feature check access solution api by @chsjd in #192

### New Contributors

* @aryasoni98 made their first contribution in #155

**Full Changelog**: [1.1.0...1.1.1](https://github.com/weam-ai/weam/compare/1.1.0...1.1.1)

[See full release details][release-v1.1.1]

[release-v1.1.1]: https://github.com/weam-ai/weam/releases/tag/1.1.1

---

## [v1.1.0] — 2025-10-08

### Initial Release

* Migrated from Python to Node.js/Next.js stack
* Removed all Python dependencies
* Rewrote services in JavaScript/TypeScript
* Updated to Next.js API routes

### New

* #164 - Supervisor agent implementation
* #163 - Node.js web scraping service for prompt enhancement
* #141 - Zoom integration and MongoDB configuration support
* #140 - Solution install, uninstall and sync functionality
* #138 - Agent one-page view

### Features

* Multi-agent workflow creation: nest single or multiple agents within parent agents
* Added Nano Banana model for Image Generation
* Agent chaining with circular dependency prevention
* Supervisor agent setup for coordinating multiple agents
* Agent type indicators (single/multi) in UI chips and agent list

### Bug fixes

* #172 - Handle transcription timeouts with auto-restart
* #173 - Scroll up not working on LLM response streaming
* #154 - Strict comparison added for IDs
* #153 - Enhance team member display with tooltip in EditBrainModal and EditWorkSpaceModal
* #133 - Remove API key dependency from image generation tool
* #162 - Design fixes and improvements
* #152 - UI/UX updates
* #150 - UI/UX updates
* #149 - UI/UX updates
* #148 - UI/UX updates

### Other Changes

* Migrated from Python to Node.js/Next.js stack
* Removed all Python dependencies and requirements.txt
* Rewrote backend services in JavaScript/TypeScript
* Updated API routes to Next.js conventions
* Remove unnecessary variables (#174)
* Remove unused components and files related to chat and citations (#139)
* Cleanup of Home page, HoverActionIcon, CitationSourceSheet, and MessageSources

**Full Changelog**: [See full release details][release-v1.1.0]

[release-v1.1.0]: https://github.com/weam-ai/weam/releases/tag/1.1.0

---

## [v0.0.2-rc1] — *TBD*

Changes from **v0.0.1** to **v0.0.2-rc1**.

---

### ✨ New Features

* *No changes documented*

### 🌍 Internationalization

* *No changes documented*

### 👐 Accessibility

* *No changes documented*

### 🔧 Fixes

* *No changes documented*

### ⚙️ Other Changes

* *No changes documented*

---

🔗 **Previous Release:**
[See full release details][release-v0.0.1]

[release-v0.0.1]: https://github.com

---
