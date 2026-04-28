# Case-study data

The bundled case study maps the literature around Dynamic Projection-Mapping and Spatial Augmented Reality. It is included so that the paper, web demo, and command-line examples can be reproduced without requiring live Google Scholar scraping.

The core corpus consists of `data/case-study/articles_full.csv` and `data/case-study/graph.gexf`. The CSV stores article metadata and reference lists. The GEXF stores the citation graph and can be opened in Gephi or converted to browser JSON.

## Recommended web-demo export

```bash
sota-lens web-data \
  --graph data/case-study/graph.gexf \
  --articles data/case-study/articles_full.csv \
  --out website/assets/data/case-study-demo.json \
  --limit 500
```

This command combines the graph structure from the GEXF with the richer metadata from the CSV. The result is the file loaded by the **Try paper case study** button on the website tool page.

## Notes

- The full graph contains 2,198 DOI-level vertices and 8,249 directed reference edges.
- The browser demo is limited to a high-degree subset for responsiveness.
- Failed resolutions are kept in `failed.csv` and `failed_references.csv` as part of the audit trail.
- The community labels in the paper are human-interpreted labels assigned after graph inspection; numeric communities in the tool are algorithmic clusters used for exploration.
