# Adam Grant · MSc Artificial Intelligence

This is my learning portfolio for the MSc Artificial Intelligence at the University of Essex Online. I use it to bring together my coursework, reflections, professional development and independent projects.

[Explore my portfolio](https://adamgrant100.github.io/ai-portfolio/).

## Local preview

From this directory, run `python3 -m http.server 8765` and open http://localhost:8765/.
You can also open index.html directly to browse the local files.

## Contents

- index.html — programme homepage
- module-*.html — my first three modules and my current module, Intelligent Agents
- development.html — my skills matrices and development plans
- projects.html — independent project collection
- project-agents.*, project-data.*, project-threshold.* — three interactive prototypes with methods and source
- projects.css — independent-work collection styling
- code-windows.css — scrollable source-code and recorded-output windows
- evidence-*.txt, evidence-*.py and evidence-*.R — selected model outputs and Python/R scripts
- style.css — shared design; colours are defined at the start of the file
- site.js and favicon.svg — shared script and site icon

## About my work

I’ve brought together concise summaries of my coursework, selected scripts and model outputs, and retrospective reflections. Full essays, reports and presentation transcripts are not included in this public portfolio. I retain the complete assignments privately. The coursework results come from the original experiments; moving them to this site does not represent a new run. Each module page explains what I have available and where there are gaps.

Intelligent Agents is my current module. I’ll add my work and reflection as I progress through it.

These projects use synthetic scenarios and datasets to explore ideas beyond my assessed coursework. The demos, source code, validation tests and method notes are available for each project.

## GitHub Pages publication

Upload the contents of this directory to the root of the `main` branch in `adamgrant100/ai-portfolio`, including `.nojekyll`. In the repository’s Settings → Pages, select **Deploy from a branch**, then **main** and **/ (root)**.

Portfolio: https://adamgrant100.github.io/ai-portfolio/. GitHub Pages deploys updates from the main branch.

All publication files sit at the repository root. Internal links and assets use relative paths so the site can run under the `/ai-portfolio/` project path.

## Independent experiments

The three projects run entirely in the browser with no external libraries. I’ve included notes on the implementation, synthetic data and limitations on each project page.

I’ve also included always-visible, scrollable source windows for my Python and R coursework and the JavaScript behind each independent demo. The syntax-coloured previews reproduce the source files exactly. Recorded R and WEKA results appear in separate output windows. The colours are included in the page, so viewing the code needs no additional JavaScript or external service.

Re-run the pure-logic checks with Node.js from this directory:

```sh
node project-agents.test.cjs
node project-data.test.cjs
node project-threshold.test.cjs
```

Agent tests compare A* with breadth-first search across 250 seeded worlds and verify fixed scenarios and route validity. Data tests cover CSV quoting and line endings, schema checks, issue counts, duplicates and name candidates. Threshold tests cover boundary equality, undefined metrics, cost arithmetic and every integer threshold from 0 to 100.
