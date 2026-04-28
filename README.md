# SotA Lens

<p align="center">
  <img src="website/assets/sota-lens-wordmark-transparent.png" alt="SotA Lens artwork" width="900">
</p>

[![Python tests](https://github.com/diogogithub/sota-lens/actions/workflows/python-tests.yml/badge.svg?branch=master&event=push)](https://github.com/diogogithub/sota-lens/actions/workflows/python-tests.yml)
[![Deploy GitHub Pages](https://github.com/diogogithub/sota-lens/actions/workflows/pages.yml/badge.svg?branch=master&event=push)](https://github.com/diogogithub/sota-lens/actions/workflows/pages.yml)
[![Build JOSS paper](https://github.com/diogogithub/sota-lens/actions/workflows/joss-paper.yml/badge.svg?branch=master&event=push)](https://github.com/diogogithub/sota-lens/actions/workflows/joss-paper.yml)
[![Build arXiv preprint](https://github.com/diogogithub/sota-lens/actions/workflows/arxiv-build.yml/badge.svg?branch=master&event=push)](https://github.com/diogogithub/sota-lens/actions/workflows/arxiv-build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**SotA Lens** is an open-source toolkit for **exploratory literature mapping through citation networks**. It helps researchers move from a raw scholarly corpus to an inspectable graph, ranked signals, and a browser-based visual explorer that can be used before a formal scoping review, systematic mapping study, or state-of-the-art review is fully stabilised.

The project combines:

- a **Python command-line pipeline** for building citation-network datasets from article metadata;
- **exports for Gephi** and web-ready JSON artifacts;
- a **static browser-based explorer** that can load local CSV and GEXF files directly in the browser;
- a bundled **Dynamic Projection-Mapping / Spatial Augmented Reality** case study used as the running example in the paper;
- official **SotA Lens artwork** bundled in the website assets and surfaced in the public-facing materials.

- **Website:** <https://diogogithub.github.io/sota-lens/>
- **Interactive tool:** <https://diogogithub.github.io/sota-lens/tool.html>
- **Repository:** <https://github.com/diogogithub/sota-lens>
- **JOSS paper manuscript:** [`paper/paper.md`](paper/paper.md)
- **arXiv preprint source:** [`arxiv/main.tex`](arxiv/main.tex)

## Why SotA Lens

Formal evidence-synthesis frameworks such as PRISMA are essential once a review protocol is defined. In practice, however, many research projects begin earlier: the topic may still be broad, the vocabulary unstable, and the neighbouring communities only partially visible.

SotA Lens supports that **upstream exploratory stage**. Rather than replacing screening or critical review, it helps researchers understand the shape of a field by surfacing:

- influential and highly connected papers;
- recurring authors and subject clusters;
- community structure within a citation graph;
- promising subtopics and adjacent areas;
- candidate boundaries for a later formal review protocol.

## Main features

SotA Lens can:

- ingest article metadata from CSV files;
- parse common reference-list encodings;
- normalise DOI-based identifiers;
- construct directed citation graphs with NetworkX;
- export `.gexf` files for Gephi;
- generate web-ready JSON datasets from CSV, GEXF, or GEXF enriched with CSV metadata;
- compute graph summaries, author rankings, subject-term rankings, and community summaries;
- provide a static browser explorer for local CSV/GEXF inspection.

All browser-side uploads are processed **locally in the user's browser**. The website does not upload user-selected files to a server.

## Repository structure

```text
sota-lens/
├── src/sota_lens/           Python package and CLI
├── tests/                   Pytest-based tests
├── website/                 Static GitHub Pages site
│   └── assets/              CSS, JavaScript, data, and SotA Lens artwork
├── paper/                   JOSS-ready paper manuscript and bibliography
├── docs/                    Supporting documentation
├── data/case-study/         Bundled DPM/SAR case-study corpus and graph artifacts
└── .github/workflows/       CI and GitHub Pages deployment
```

## Installation

```bash
git clone https://github.com/diogogithub/sota-lens.git
cd sota-lens
python -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -e ".[dev]"
```

Run the tests:

```bash
pytest
```

## Quick start

Build a citation graph and a web dataset from the bundled case study:

```bash
sota-lens build \
  --articles data/case-study/articles_full.csv \
  --out build/dpm-sar \
  --web-json build/dpm-sar/web-dataset.json
```

Inspect an existing graph:

```bash
sota-lens inspect data/case-study/graph.gexf
```

Convert a Gephi/GEXF graph into a browser dataset while preserving richer article metadata from CSV:

```bash
sota-lens web-data \
  --graph data/case-study/graph.gexf \
  --articles data/case-study/articles_full.csv \
  --out build/case-study-demo.json \
  --limit 500
```

The `--articles` argument is optional. Without it, `web-data` still reads the GEXF topology, but the browser dataset will only contain the metadata present inside the GEXF. With it, the output combines the GEXF graph/topology with the fuller CSV fields such as title, authors, subjects, year, URL, and depth.

## Input CSV format

The most useful input is a CSV with at least the following columns:

| Column | Meaning |
|---|---|
| `doi` | Stable publication identifier used as the node id |
| `title` | Publication title |
| `authors` | Author list |
| `year` | Publication year |
| `link` or `url` | Publication URL |
| `subject` | Subject terms, if available |
| `references` | Referenced DOIs or DOI-like identifiers |
| `depth` | Optional exploration depth from the seed corpus |

A minimal CSV can contain only `doi`, `title`, and `references`.

## Website

The static site in [`website/`](website/) is split into separate pages:

- `index.html` — public landing page;
- `methodology.html` — method framing and relation to review workflows;
- `tool.html` — interactive local-file explorer;
- `publication.html` — paper, citation, repository information.

The tool page opens **empty by default**. The bundled case study is loaded only if the user clicks **Try paper case study** or opens `tool.html?demo=paper`.

## Case study

The included case study maps literature around **Dynamic Projection-Mapping** and **Spatial Augmented Reality**. In the underlying exploration, two broad seed queries produced 200 seed results and a citation graph with **2,198 publication nodes** and **8,249 citation edges**. The browser demo uses a reduced subset for responsiveness, while the repository includes the richer supporting artifacts in [`data/case-study/`](data/case-study/).

## Publication

This repository includes a **complete JOSS-ready paper manuscript** in [`paper/paper.md`](paper/paper.md), references in [`paper/paper.bib`](paper/paper.bib), and a longer arXiv-style methodology preprint in [`arxiv/`](arxiv/). It also includes tests, licensing, citation metadata, CI workflows, and a website.

## Citation

If you use SotA Lens, please cite the software repository and the accompanying paper manuscript.

```bibtex
@software{sotalens2026,
  author = {Cordeiro, Diogo Peralta},
  title = {SotA Lens: Citation-network mapping for exploratory state-of-the-art reviews},
  year = {2026},
  version = {0.1.0},
  url = {https://github.com/diogogithub/sota-lens}
}
```

## Contributing

Contributions, issues, and suggestions are welcome. Please see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

SotA Lens is released under the MIT License. See [`LICENSE`](LICENSE).
