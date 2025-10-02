# Architecture Diagrams

This folder contains Mermaid diagrams you can preview directly in VS Code (use a Mermaid extension), or render to images.

- `system-flow.mmd` — High-level flow across clients, app router, middleware, database, and identity.
- `module-map.mmd` — School App modules and Superadmin overview.

## Render to SVG (optional)
If you have Node.js installed, you can install the Mermaid CLI globally and render:

```powershell
npm i -g @mermaid-js/mermaid-cli
mmdc -i .\docs\architecture\system-flow.mmd -o .\docs\architecture\system-flow.svg
mmdc -i .\docs\architecture\module-map.mmd -o .\docs\architecture\module-map.svg
```

Alternatively, paste the contents into https://mermaid.live to export PNG/SVG.
