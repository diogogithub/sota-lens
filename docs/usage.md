# Usage

SotA Lens can be used in two ways:

1. as a Python command-line tool for building graph artifacts; and
2. as a static browser-based explorer for inspecting CSV/GEXF files.

## Command-line use

Install the package:

```bash
python -m pip install -e ".[dev]"
```

Build a graph from an article CSV:

```bash
sota-lens build --articles data/case-study/articles_full.csv --out build/example --web-json build/example/web-dataset.json
```

This writes:

- `graph.gexf` — graph file for Gephi;
- `summary.json` — graph statistics and rankings;
- `web-dataset.json` — optional browser-ready dataset.

Inspect a GEXF file:

```bash
sota-lens inspect data/case-study/graph.gexf
```

Generate a browser dataset from a GEXF graph:

```bash
sota-lens web-data --graph data/case-study/graph.gexf --out website/assets/data/my-demo.json --limit 500
```

Generate a richer browser dataset by combining GEXF topology/layout with CSV article metadata:

```bash
sota-lens web-data \
  --graph data/case-study/graph.gexf \
  --articles data/case-study/articles_full.csv \
  --out website/assets/data/case-study-demo.json \
  --limit 500
```

Use this second form for the public paper demo. The GEXF supplies the citation graph, while the CSV supplies richer article fields such as authors, subject terms, URLs, year, and depth.

## Browser use

Open the website and go to the **Tool** page. The explorer opens without a dataset. Use:

- **Load CSV** to inspect a local article table;
- **Load GEXF** to inspect a local citation graph;
- **Try paper case study** to load the DPM/SAR demo used in the paper.

Files selected in the browser remain local. The static site does not upload files.
